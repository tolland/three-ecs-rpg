// src/main/dbusService.ts
import * as dbus from 'dbus-next';
import { AppAction } from '@shared/core';
import { ipcMain } from 'electron';

const SERVICE_NAME = 'org.three-ecs-rpg.App';
const CONTROL_OBJECT_PATH = '/org/three_ecs_rpg/Control'; // Use underscores for paths usually
const CONTROL_IFACE_NAME = 'org.threeecsrpg.Control';

//let controlInterface: dbus.interface.Interface;

const { ACCESS_READ, Interface, method, property } = dbus.interface;

let mainWindowWebContents: Electron.WebContents | null = null; // To send messages to renderer

// Function to forward calls to the renderer via IPC
function forwardToRenderer(action: AppAction | string, payload?: any) {
    if (mainWindowWebContents) {
        console.log(`D-Bus: Forwarding action "${action}" to renderer.`);
        mainWindowWebContents.send('dbus-action', { action, payload });
    } else {
        console.error(
            'D-Bus Error: Cannot forward action, mainWindowWebContents not set.',
        );
    }
}

function invokeRenderer(channel: string, args?: any): Promise<any> {
    if (!mainWindowWebContents) {
        console.error(
            'D-Bus Error: Cannot invoke renderer, mainWindowWebContents not set.',
        );
        return Promise.reject(new Error('Renderer not available'));
    }

    return new Promise((resolve, reject) => {
        // Create a unique request ID
        const requestId = Date.now().toString() + Math.random().toString();

        // Set up a one-time listener for this specific request
        const responseChannel = `${channel}:response:${requestId}`;
        ipcMain.once(responseChannel, (event, response) => {
            if (response.error) {
                console.error(
                    `D-Bus->Main: Error response from renderer:`,
                    response.error,
                );
                reject(new Error(response.error));
            } else {
                console.log(
                    `D-Bus<-Main: Received result from renderer for request ${requestId}`,
                );
                resolve(response.data);
            }
        });

        // Send the request with the requestId so the renderer knows where to respond
        console.log(
            `D-Bus->Main: Invoking renderer channel "${channel}" with request ID ${requestId}`,
        );
        try {
            // @ts-ignore
            mainWindowWebContents.send(`${channel}:request`, {
                requestId,
                args,
            });
        } catch (error) {
            ipcMain.removeAllListeners(responseChannel);
            reject(error);
        }

        // Optional: Add a timeout
        setTimeout(() => {
            // Check if listener still exists (response not received)
            if (ipcMain.listenerCount(responseChannel) > 0) {
                ipcMain.removeAllListeners(responseChannel);
                reject(
                    new Error(`Request to ${channel} timed out after 5000ms`),
                );
            }
        }, 5000);
    });
}

export async function setupDbusService(webContents: Electron.WebContents) {
    mainWindowWebContents = webContents;
    try {
        const bus = dbus.sessionBus(); // Or systemBus() if appropriate

        // Request the service name
        await bus.requestName(SERVICE_NAME, 0);
        console.log(`D-Bus: Service name "${SERVICE_NAME}" acquired.`);

        // Define the interface
        class ControlInterface extends dbus.interface.Interface {
            // --- Methods ---
            async ListEntities(): Promise<string> {
                const entities = await invokeRenderer('ecs:listEntities');
                // Convert [{id, name}] to [[id, name]] for 'a(is)' signature if needed
                // return entities.map((e: { id: number, name: string }) => [e.id, e.name]);
                // Or keep as a{is} -> array of dicts
                return JSON.stringify(entities);
            }

            async ListSomething(): Promise<string> {
                return Promise.resolve(JSON.stringify(['foo', 'bar']));
            }

            async ListComponents(entityId: number): Promise<string> {
                const components = await invokeRenderer('ecs:listComponents', {
                    entityId,
                });
                return JSON.stringify(components);
            }

            async GetComponentData(
                entityId: number,
                componentName: string,
            ): Promise<string> {
                const data = await invokeRenderer('ecs:getComponentData', {
                    entityId,
                    componentName,
                });
                return data ?? 'Component not found or failed to serialize'; // Return string
            }
            // --- Control Methods (keep separate interface?) ---
            PauseGame() {
                invokeRenderer('app:control', { action: 'PAUSE_GAME' });
            }
            ToggleDebugHUD() {
                invokeRenderer('app:control', { action: 'TOGGLE_DEBUG_HUD' });
            }
            // ... other control actions ...
            SetPhysicsValue(key: string, valueVariant: dbus.Variant) {
                const value = valueVariant.value; // Extract value from variant
                console.log(
                    `D-Bus: Received SetPhysicsValue(${key}, ${value})`,
                );
                invokeRenderer('app:setConfig', { key, value });
            }

            // Add methods for other AppActions or config settings
            // ...
        }

        // Decorate methods for D-Bus introspection
        ControlInterface.configureMembers({
            methods: {
                ListEntities: { inSignature: '', outSignature: 's' }, // Array of Dicts {Int32: String}
                ListSomething: { inSignature: '', outSignature: 's' },
                ListComponents: { inSignature: 'i', outSignature: 's' }, // blob of json string
                GetComponentData: { inSignature: 'is', outSignature: 's' }, // Int32, String -> String (JSON)
                // Control methods
                PauseGame: { inSignature: '', outSignature: '' },
                ToggleDebugHUD: { inSignature: '', outSignature: '' },
                SetPhysicsValue: { inSignature: 'sv', outSignature: '' }, // String, Variant -> None
            },
            // properties: { ... }, // Can also define properties
            // signals: { ... }, // Can define signals
        });

        let controlInterface;
        controlInterface = new ControlInterface(CONTROL_IFACE_NAME);

        // Export the object with the interface
        await bus.export(CONTROL_OBJECT_PATH, controlInterface);
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
