// src/main/lib/single_instance_lock.ts
import { app, BrowserWindow, screen } from 'electron';


export function configureSingleInstanceLock(mainWindow: BrowserWindow | null) {

    // --- Single Instance Lock ---
// Request the lock early in the app lifecycle
    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
        // Another instance is already running, quit this new one
        console.log('Another instance is already running. Quitting this one.');
        app.quit();
    } else {
        // This is the primary instance. Set up handler for subsequent attempts to launch.
        app.on('second-instance', (event, commandLine, workingDirectory) => {
            // Someone tried to run a second instance, we should focus our window.
            console.log(
                'Second instance attempt detected. Focusing primary window.',
            );
            if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.focus();
            }
        });
    }
}
