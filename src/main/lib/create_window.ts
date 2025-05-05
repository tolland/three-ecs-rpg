import { app, BrowserWindow, screen } from 'electron';
import path from 'path';
import { setupDbusService } from '@main/dbus/dbusService';
import { rendererAPI } from '@main/lib/rendererAPI';
import { createApplicationMenu } from '@main/lib/app_menu';

export function createWindow(mainWindow: BrowserWindow | null): BrowserWindow {
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
            // @TODO need to fix this
            webSecurity: false,
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
    // if (app.isPackaged) {
    //     // Production: Load from packaged file
    //     mainWindow
    //         .loadFile(path.join(__dirname, '../renderer/index.html'))
    //         .then(() => {
    //             mainWindow?.webContents.openDevTools();
    //         });
    // } else {
    // Development: Load from localhost (assuming a dev server, e.g.,
    // with Vite or Rollup watch)
    // Or load directly if Rollup outputs to dist/renderer
    console.dir(__dirname);
    mainWindow
        .loadFile(path.join(__dirname, '../renderer/index.html'))
        .then(() => {
            mainWindow?.webContents.openDevTools();
        });

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

    return mainWindow;
}
