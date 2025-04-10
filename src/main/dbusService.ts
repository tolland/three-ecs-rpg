// src/main/dbusService.ts
import * as dbus from 'dbus-next';
import { DBusError } from 'dbus-next';
import { AppAction } from '@shared/core';
import { ipcMain } from 'electron';
import { DBUS_MAPPINGS } from '@main/dbus_mappings';
import { DBUS } from '@shared/core/dbusConstants';

const SERVICE_NAME = 'org.three-ecs-rpg.App';
const CONTROL_OBJECT_PATH = '/org/three_ecs_rpg/Control'; // Use underscores for paths usually
const CONTROL_IFACE_NAME = 'org.threeecsrpg.Control';

const { ACCESS_READ, Interface, method, property } = dbus.interface;

let mainWindowWebContents: Electron.WebContents | null = null; // To send messages to renderer

// Define more specific payload types
type ActionPayload = Record<string, unknown>;

// Define response type for IPC communication
interface IpcResponse {
    data?: unknown;
    error?: string;
}

// Function to forward calls to the renderer via IPC
function forwardToRenderer(
    action: AppAction | string,
    payload?: ActionPayload,
) {
    if (mainWindowWebContents) {
        console.log(`D-Bus: Forwarding action "${action}" to renderer.`);
        mainWindowWebContents.send('dbus-action', { action, payload });
    } else {
        console.error(
            'D-Bus Error: Cannot forward action, mainWindowWebContents not set.',
        );
    }
}

function invokeRenderer(
    channel: string,
    args?: Record<string, unknown>,
): Promise<unknown> {
    if (!mainWindowWebContents) {
        console.error(
            'D-Bus Error: Cannot invoke renderer, mainWindowWebContents not set.',
        );
        return Promise.reject(new Error('Renderer not available'));
    }
    return new Promise((resolve, reject) => {
        const requestId = Date.now().toString() + Math.random().toString();
        const requestChannel = `${channel}:request`;
        const responseChannel = `${channel}:response:${requestId}`;

        const listener = (
            event: Electron.IpcMainEvent,
            response: IpcResponse,
        ) => {
            if (response.error) reject(new Error(response.error));
            else resolve(response.data);
        };
        ipcMain.once(responseChannel, listener);

        // Timeout logic (good addition)
        const timeout = setTimeout(() => {
            ipcMain.removeListener(responseChannel, listener); // Use removeListener
            reject(new Error(`Request to ${channel} timed out`));
        }, 5000);

        // Send request
        try {
            mainWindowWebContents!.send(requestChannel, { requestId, args });
        } catch (error) {
            clearTimeout(timeout);
            ipcMain.removeListener(responseChannel, listener);
            reject(error);
        }
    });
}

function sendAppControl(
    action: AppAction | string,
    payload?: ActionPayload,
): void {
    if (mainWindowWebContents) {
        mainWindowWebContents.send('app:control', { action, payload });
    } else {
        throw new DBusError(
            DBUS.CONTROL_IFACE_NAME + '.Error',
            'Main window web contents not available',
        );
    }
    // @TODO throw here if send fails due to renderer not being available
}

export async function setupDbusService(webContents: Electron.WebContents) {
    mainWindowWebContents = webContents;
    try {
        const bus = dbus.sessionBus();
        await bus.requestName(SERVICE_NAME, 0);

        console.log(`D-Bus: Service name "${SERVICE_NAME}" acquired.`);

        // Define the interface
        class ECSQueryInterface extends dbus.interface.Interface {
            // --- Methods ---
            async ListEntities(): Promise<Array<[number, string]>> {
                const entities = (await invokeRenderer('ecs:listEntities')) as {
                    id: number;
                    name: string;
                }[];
                // Convert result to expected D-Bus type
                // Example: return entities.map((e: { id: number; name: string }) => [e.id, e.name]); // For a(is)
                return entities.map((e: { id: number; name: string }) => [
                    e.id,
                    e.name,
                ]);
            }

            async ListSomething(): Promise<string> {
                return Promise.resolve(JSON.stringify(['foo', 'bar']));
            }

            async ListComponents(entityId: number): Promise<string[]> {
                return (await invokeRenderer('ecs:listComponents', {
                    entityId,
                })) as string[];
            }

            async GetComponentData(
                entityId: number,
                componentName: string,
            ): Promise<string> {
                const data = (await invokeRenderer('ecs:getComponentData', {
                    entityId,
                    componentName,
                })) as string | null;
                return data ?? 'Component not found or failed to serialize';
            }

            async SetComponentData(
                entityId: number,
                componentName: string,
                value: string,
            ): Promise<string> {
                console.log(
                    `D-Bus: SetComponentValue(${entityId}, ${componentName}, ${value})`,
                );
                const parsedValue = JSON.parse(value);
                console.log(`Parsed value:`, parsedValue);
                const data = (await invokeRenderer('ecs:setComponentValue', {
                    entityId,
                    componentName,
                    value,
                })) as string | null;
                return (
                    data ??
                    'Component not found or failed to serialize response'
                ); // Return string
            }

            // System Methods
            async ListSystems(): Promise<Array<[string, string]>> {
                const systems = (await invokeRenderer(
                    'ecs:listSystems',
                )) as Array<[string, string]> | null;
                // preserving to do something useful later
                return systems
                    ? systems.map((e: [name: string, data: string]) => [
                          e[0],
                          e[1],
                      ])
                    : [];
            }

            // --- Control Methods (keep separate interface?) ---
            Reload() {
                // Notify renderer that reload is about to happen
                sendAppControl(AppAction.RELOAD);
                // Small delay to allow renderer to receive notification
                setTimeout(() => {
                    if (mainWindowWebContents) {
                        mainWindowWebContents.reload();
                    }
                }, 100);
            }

            PauseGame() {
                sendAppControl(AppAction.PAUSE_GAME);
            }

            QuitGame() {
                sendAppControl(AppAction.QUIT);
            }

            ToggleDebugHUD() {
                sendAppControl(AppAction.TOGGLE_DEBUG_HUD);
            }

            SetCameraThirdPersonGlobal() {
                sendAppControl(AppAction.SET_CAMERA_THIRD_PERSON_GLOBAL);
            }

            ToggleDebugVisuals() {
                sendAppControl(AppAction.TOGGLE_DEBUG_VISUALS);
            }

            SetPhysicsValue(key: string, valueVariant: dbus.Variant) {
                const value = valueVariant.value; // Extract value from variant
                console.log(
                    `D-Bus: Received SetPhysicsValue(${key}, ${value})`,
                );
                invokeRenderer('app:setConfig', { key, value });
            }

            // Add Control Method for Time Scale
            SetTimeScale(scale: number) {
                // D-Bus 'd' maps to number
                console.log(`D-Bus: Received SetTimeScale(${scale})`);
                // Use send, as it's a one-way command affecting config
                mainWindowWebContents!.send('app:setConfig', {
                    key: 'simulation.timeScale',
                    value: scale,
                });
            }

            // ViewPort Methods
            async GetViewportLayout(): Promise<string> {
                return await invokeRenderer('ecs:getViewportLayout') as string;
            }

            // Generic System Method
            async GetSystemData(systemName: string): Promise<string> {
                const data = await invokeRenderer('ecs:getSystemData', {
                    systemName,
                }) as string;
                return data ?? 'Component not found or failed to serialize'; // Return string
            }

            async GetLayout(): Promise<string> {
                const state = await invokeRenderer('layout:getState');
                return JSON.stringify(state);
            }

            async SetLayout(layoutJson: string): Promise<boolean> {
                return await invokeRenderer('layout:setState', { layoutJson }) as boolean;
            }
        }

        // Decorate methods for D-Bus introspection
        ECSQueryInterface.configureMembers(DBUS_MAPPINGS);

        let ecsInterface;
        ecsInterface = new ECSQueryInterface(CONTROL_IFACE_NAME);

        // Export the object with the interface
        bus.export(CONTROL_OBJECT_PATH, ecsInterface);
        console.log(
            `D-Bus: Object exported at "${CONTROL_OBJECT_PATH}" with interface "${CONTROL_IFACE_NAME}".`,
        );
    } catch (e) {
        console.error('Failed to set up D-Bus service:', e);
    }
}

// Optional: Teardown function
export async function teardownDbusService() {
    // TODO: Unexport interface, release name? Check dbus-next docs.
    console.log('D-Bus: Service teardown requested (implementation needed).');
}
