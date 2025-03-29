// src/main/dbusService.ts (New file)
import {ipcMain} from 'electron';
import {AppAction} from '@core/AppActions';
import * as dbus from 'dbus-next'; // Or dbus-native


const SERVICE_NAME = 'org.three-ecs-rpg.App';
const CONTROL_IFACE_NAME = 'org.three-ecs-rpg.Control';
const CONTROL_OBJECT_PATH = '/org/three_ecs_rpg/Control'; // Use underscores for paths usually

//let controlInterface: dbus.interface.Interface;

const {
    ACCESS_READ,
    Interface,
    method,
    property,
} = dbus.interface;

let mainWindowWebContents: Electron.WebContents | null = null; // To send messages to renderer

// Function to forward calls to the renderer via IPC
function forwardToRenderer(action: AppAction | string, payload?: any) {
    if (mainWindowWebContents) {
        console.log(`D-Bus: Forwarding action "${action}" to renderer.`);
        mainWindowWebContents.send('dbus-action', {action, payload});
    } else {
        console.error('D-Bus Error: Cannot forward action, mainWindowWebContents not set.');
    }
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
            PauseGame() {
                forwardToRenderer(AppAction.PAUSE_GAME);
            }

            ToggleDebugHUD() {
                forwardToRenderer(AppAction.TOGGLE_DEBUG_HUD);
            }

            ToggleMapHUD() {
                forwardToRenderer(AppAction.TOGGLE_MAP_HUD);
            }

            SwitchPlayerControl() {
                forwardToRenderer(AppAction.SWITCH_PLAYER_CONTROL);
            }

            // Method with arguments (example: set gravity)
            SetPhysicsValue(key: string, value: number) { // D-Bus types might need adjustment (variant?)
                console.log(`D-Bus: Received SetPhysicsValue(${key}, ${value})`);
                forwardToRenderer('setPhysicsValue', {key, value}); // Custom action string
            }

            // Add methods for other AppActions or config settings
            // ...
        }

        // Decorate methods for D-Bus introspection
        ControlInterface.configureMembers({
            methods: {
                PauseGame: {outSignature: '', inSignature: '',},
                ToggleDebugHUD: {outSignature: '', inSignature: ''},
                ToggleMapHUD: {outSignature: '', inSignature: ''},
                SwitchPlayerControl: {outSignature: '', inSignature: ''},
                SetPhysicsValue: {outSignature: 'sv', inSignature: ''}, // s=string, v=variant (flexible)
            },
            // properties: { ... }, // Can also define properties
            // signals: { ... }, // Can define signals
        });


        let controlInterface;
        controlInterface = new ControlInterface(CONTROL_IFACE_NAME);

        // Export the object with the interface
        await bus.export(CONTROL_OBJECT_PATH, controlInterface);
        console.log(`D-Bus: Object exported at "${CONTROL_OBJECT_PATH}" with interface "${CONTROL_IFACE_NAME}".`);

    } catch (e) {
        console.error('Failed to set up D-Bus service:', e);
    }
}

// Optional: Teardown function
export async function teardownDbusService() {
    // TODO: Unexport interface, release name? Check dbus-next docs.
    console.log("D-Bus: Service teardown requested (implementation needed).");
}



