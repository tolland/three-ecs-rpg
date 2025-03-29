// src/main/main.ts
import {app, BrowserWindow, screen} from 'electron';
import path from 'path';
//import {setupDbusService, teardownDbusService} from './dbusService'; // Import

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
        console.log('Second instance attempt detected. Focusing primary window.');
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const {width, height} = primaryDisplay.workAreaSize;

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
    });

    // --- Intercept Ctrl+W ---
    mainWindow.webContents.on('before-input-event', (event, input) => {
        // Check for Ctrl+W specifically (or Cmd+W on macOS)
        // input.meta is Cmd on macOS, input.control is Ctrl on Win/Linux
        const isCtrlW = (input.control || input.meta) && !input.alt && !input.shift && input.key.toLowerCase() === 'w';

        if (isCtrlW) {
            console.log('Main Process: Ctrl+W intercepted, preventing default.');
            event.preventDefault(); // Prevent closing the window or other default actions
        }
    });
    // --- End Intercept ---



    // Load the renderer's HTML file
    if (app.isPackaged) {
        // Production: Load from packaged file
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    } else {
        // Development: Load from localhost (assuming a dev server, e.g., with Vite or Rollup watch)
        // Or load directly if Rollup outputs to dist/renderer
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
        mainWindow.webContents.openDevTools(); // Open DevTools automatically in dev
    }

    //setupDbusService(mainWindow.webContents);

    // Optional: Clean up D-Bus on close
    mainWindow.on('closed', () => {
        mainWindow = null;
        // teardownDbusService(); // May need async handling on quit
    });

    // Optional: Clear mainWindow when closed to prevent issues if accessed later
    mainWindow.on('closed', () => {
        mainWindow = null;
    })
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// ... app setup ...
// app.on('will-quit', async () => {
//     // Ensure D-Bus cleanup happens before quitting
//     await teardownDbusService();
// });