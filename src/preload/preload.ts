// src/preload/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { AppAction } from '@shared/core';

// Define the shape of the arguments coming over IPC
// Keep this consistent with what main process sends in dbusService.ts
interface DbusActionArgs {
    action: AppAction | string;
    payload?: any;
}

// Example: Expose a simple API
contextBridge.exposeInMainWorld('electronIPC', {
    // Add any APIs you need to expose here
    // E.g., nodeVersion: () => process.versions.node,
    onDbAction: (callback: (args: DbusActionArgs) => void) => {
        const listener = (
            event: Electron.IpcRendererEvent,
            args: DbusActionArgs,
        ) => callback(args);

        // Set up the listener for messages from the main process
        ipcRenderer.on('dbus-action', listener);

        // this to test that the preload script is able to import from  @shared/core
        let somevar: DbusActionArgs = { action: AppAction.PAUSE_GAME };
        if (!somevar) {
            console.log(`Preload: somevar is undefined or null: ${somevar}`);
        }

        // Return a cleanup function to remove the listener if needed
        // (Useful if the renderer component unmounts/reloads)
        return () => {
            ipcRenderer.removeListener('dbus-action', listener);
            console.log('Preload: Removed dbus-action listener.');
        };
    },
    handle: (channel: string, listener: (args: any) => Promise<any> | any) => {
        ipcRenderer.on(channel, (event, args) => listener(args));
    },
    // Renderer process calls OUT -> Main process handles (if needed later)
    invoke: (channel: string, args: any): Promise<any> => {
        return ipcRenderer.invoke(channel, args);
    },
    // Add a handler for requests from main process
    handleRequest: (
        channel: string,
        handler: (args: any) => Promise<any> | any,
    ) => {
        const requestChannel = `${channel}:request`;

        ipcRenderer.on(requestChannel, async (event, request) => {
            const { requestId, args } = request;
            const responseChannel = `${channel}:response:${requestId}`;

            try {
                // Call the handler with the request arguments
                const result = await handler(args);

                // Send the response back to main process
                ipcRenderer.send(responseChannel, { data: result });
            } catch (error) {
                // Send error back to main process
                ipcRenderer.send(responseChannel, {
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            }
        });
    },
});

console.log('Preload script loaded.');
