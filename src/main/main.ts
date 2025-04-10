// src/main/main.ts
import { app, BrowserWindow, screen } from 'electron';
import path from 'path';
import { setupDbusService, teardownDbusService } from './dbusService';
import log from 'electron-log';
import { rendererAPI } from '@main/rendererAPI';
import { AppAction } from '@shared/core';
import { createApplicationMenu } from '@main/app_menu';
import { Serializer } from '@shared/serialization/Serializer';

log.transports.file.level = 'debug';
log.info('Application starting...');

// Custom extension ID for Three.js DevTools
const THREEJS_DEVTOOLS = 'jechbjkglifdaldbdbigibihfaclnkbo';

// Replace console.log with log
// log.error('Error:', "orijgoerjgr");

// Optional: Disable hardware acceleration if needed
// app.disableHardwareAcceleration();

// --- Single Instance Lock ---
// Request the lock early in the app lifecycle
const gotTheLock = app.requestSingleInstanceLock();

// Store mainWindow globally or pass it appropriately if needed in the 'second-instance' handler
let mainWindow: BrowserWindow | null = null;

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

console.log(
    `App is running in ${app.isPackaged ? 'production' : 'development'} mode. process.env.NODE_ENV: ${process.env.NODE_ENV}`,
);

// Enable hot reload for development
// @TODO this is not working properly
// if (process.env.NODE_ENV === 'development') {
//     console.log('Development mode detected. Enabling hot reload.');
//     try {
//         require('electron-reloader')(__dirname, {
//             electron: require(`${__dirname}/../../node_modules/electron`),
//             // hardResetMethod: 'exit'
//             paths: [
//                 `${__dirname}/dist/main/**/*`,
//                 "dist/renderer/**/*",
//                 "dist/preload/**/*",
//             ]
//         });
//         console.log('Hot reload enabled');
//     } catch (error) {
//         console.log('Hot reload error:', error);
//     }
// }

function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    // Assign to the outer scope variable
    mainWindow = new BrowserWindow({
        width: Math.max(1024, width * 0.8),
        height: Math.max(768, height * 0.8),
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            devTools: !app.isPackaged,
        },
        title: 'Three.js ECS RPG',
    });

    // --- Intercept Ctrl+W ---
    mainWindow.webContents.on('before-input-event', (event, input) => {
        // Check for Ctrl+W specifically (or Cmd+W on macOS)
        // input.meta is Cmd on macOS, input.control is Ctrl on Win/Linux

        const isCtrlW =
            (input.control || input.meta) &&
            !input.alt &&
            !input.shift &&
            input.key.toLowerCase() === 'w';

        if (isCtrlW) {
            console.log(
                'Main Process: Ctrl+W intercepted, preventing default.',
            );
            event.preventDefault(); // Prevent closing the window or other default actions
        }

        if (input.key.toLowerCase() === 'tab') {
            console.log('Main Process: Tab intercepted, preventing default.');
            event.preventDefault(); // Prevent reloading the window
        }
    });
    // --- End Intercept ---

    // Load the renderer's HTML file
    if (app.isPackaged) {
        // Production: Load from packaged file
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
        mainWindow.webContents.openDevTools();
    } else {
        // Development: Load from localhost (assuming a dev server, e.g., with Vite or Rollup watch)
        // Or load directly if Rollup outputs to dist/renderer
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
        mainWindow.webContents.openDevTools();
    }

    setupDbusService(mainWindow.webContents)
        .then((r) => console.log('DBus service setup complete:', r))
        .catch((e) => console.error('Error setting up DBus service:', e));

    // Optional: Clean up D-Bus on close
    mainWindow.on('closed', () => {
        mainWindow = null;
        // teardownDbusService(); // May need async handling on quit
    });

    // setup listener for IPC messages from renderer
    rendererAPI();

    // Create application menu
    createApplicationMenu(mainWindow);
}

app.whenReady().then(async () => {
    // try {
    //     const name = await installExtension(THREEJS_DEVTOOLS);
    //     console.log(`Added Extension: ${name}`);
    // } catch (err) {
    //     console.log('An error occurred: ', err);
    // }

    // const extensionPath = path.join(__dirname, '../renderer/assets/extensions/jechbjkglifdaldbdbigibihfaclnkbo');
    //
    // // Load the extension with options to ignore certain permissions
    // await session.defaultSession.loadExtension(extensionPath, {
    //     allowFileAccess: true,
    //     // This is where you can modify the manifest before loading
    //     // This is optional and might not be necessary for all Electron versions
    // });

    createWindow();

    app.on('activate', function () {
        console.log(`Activating app...`);
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    if (mainWindow) {
        mainWindow.webContents.openDevTools();

        // In main process
        mainWindow.webContents.sendInputEvent({
            type: 'mouseDown',
            x: 100,
            y: 100,
            button: 'left',
            clickCount: 1,
        });
        mainWindow.webContents.sendInputEvent({
            type: 'mouseUp',
            x: 100,
            y: 100,
            button: 'left',
            clickCount: 1,
        });
    }

    if (!mainWindow) {
        console.error('Main window is not defined after creation.');
        return;
    }
});

// listen to lifecycle events
app.on('before-quit', (event) => {
    event.preventDefault(); // Temporarily prevent quitting

    console.log('Application is about to quit. Cleaning up...');

    if (mainWindow) {
        // Send a message to renderer to confirm quitting
        mainWindow.webContents.send('app:control', {
            action: AppAction.QUITTING,
        });
    } else {
        console.error('Main window is not defined during before-quit event.');
    }

    // // Wait for renderer to respond that it's ready to quit
    // ipcMain.once('quit-confirmed', () => {
    //     app.quit(); // Now actually quit
    // });
    // setTimeout(() => app.exit(0), 5000);
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

process.on('uncaughtException', (error) => {
    log.error('Uncaught Exception:', error);
});

// ... app setup ...
app.on('will-quit', async () => {
    // Ensure D-Bus cleanup happens before quitting
    await teardownDbusService();
});
