// src/preload/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { AppAction } from '@shared/core';
import IpcRendererEvent = Electron.IpcRendererEvent;


/**
* This file is loaded by the main process
*
* during the call to createWindow (@link ../main/lib/create_window.ts#createWindow)
 * <code>
 *         mainWindow = new BrowserWindow({
 *         width: Math.max(1024, width * 0.8),
 *         height: Math.max(768, height * 0.8),
 *         webPreferences: {
 *             preload: path.join(__dirname, '../preload/preload.js'),
 *             </code>
*/

// Define the shape of the arguments coming over IPC
// Keep this consistent with what main process sends in dbusService.ts
interface DbusActionArgs {
    action: AppAction | string;
    payload?: Record<string, unknown>;
}

// Define common types for IPC handlers and responses
type IpcRequestArgs = Record<string, unknown>;
type IpcResponseData = unknown;
type IpcHandler = (
    args: IpcRequestArgs,
) => Promise<IpcResponseData> | IpcResponseData;

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
    /**
     * code defines a method handle that allows the renderer process in an Electron application to listen for messages from the main process on a specified IPC (Inter-Process Communication) channel. This method is part of the API exposed to the renderer process via the contextBridge.
     */
    handle: (channel: string, listener: IpcHandler) => {
        ipcRenderer.on(channel, (event, args) => listener(args));
    },
    // Renderer process calls OUT -> Main process handles (if needed later)
    invoke: (
        channel: string,
        args?: IpcRequestArgs,
    ): Promise<IpcResponseData> => {
        return ipcRenderer.invoke(channel, args);
    },
    /**
     * If you need to transfer a MessagePort to the main process,
     * use ipcRenderer.postMessage
     */
    send: (channel: string, args?: IpcRequestArgs): void => {
        ipcRenderer.send(channel, args);
    },
    // Add a handler for requests from main process
    handleRequest: (channel: string, handler: IpcHandler) => {
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
    // Function for Renderer to listen for one-way messages FROM Main
    on: (channel: string, listener: (args: IpcRequestArgs) => void) => {
        const handler = (event: IpcRendererEvent, args: IpcRequestArgs) =>
            listener(args);
        ipcRenderer.on(channel, handler);
        return () => {
            ipcRenderer.removeListener(channel, handler);
        };
    },
});

console.log('Preload script loaded.');
