// @filename: src/main/main.ts
import { app, BrowserWindow } from 'electron';
import { teardownDbusService } from './dbus/dbusService';
import log from 'electron-log';
import { AppAction } from '@shared/core';
import { installThreeEcsInspector } from './installInspector';
import { setupExtensionDevTools } from './extensionReloader';
import { configureSingleInstanceLock } from '@main/lib/single_instance_lock';
import { reloadElectronOnChanges } from '@main/lib/electron_reloader';
import { createWindow } from '@main/lib/create_window';
import { LoggingService } from '@shared/utils/LoggingService';

LoggingService.getInstance().setEnabled(true);

log.transports.file.level = 'debug';
log.info('Application starting...');

export const MainLoggingConfig = {
    source: 'main-js',
    enabled: true,
    logToGraylog: true,
    logConstructors: true,
    logFocusedChanged: false,
    logMethods: false,
    /** Style for manager names in logs */
    styleFocusChange: (name: string) => `\x1b[36m${name}\x1b[0m`, // Cyan color
    /** Style for lifecycle events */
    styleLifecycle: (event: string) => `\x1b[33m${event}\x1b[0m`, // Yellow color
};

LoggingService.getInstance().logMessage({
    host: MainLoggingConfig.source,
    short_message: 'start of startup in main.js',
});

let mainWindow: BrowserWindow | null = null;

configureSingleInstanceLock(mainWindow);
reloadElectronOnChanges(); // not working. @TODO switch to reload via dbus

console.log(
    `App is running in ${app.isPackaged ? 'production' : 'development'} mode. process.env.NODE_ENV: ${process.env.NODE_ENV}`,
);

app.commandLine.appendSwitch('remote-debugging-port', '8315');
// app.commandLine.appendSwitch('host-rules', 'MAP * 127.0.0.1')

app.whenReady().then(async () => {

    LoggingService.getInstance().logMessage({
        host: MainLoggingConfig.source,
        short_message: 'mian is ready',
    });

    // Install extensions
    await installThreeEcsInspector();

    mainWindow = createWindow(mainWindow);

    app.on('activate', function () {
        console.log(`Activating app...`);
        if (BrowserWindow.getAllWindows().length === 0)
            createWindow(mainWindow);
    });

    if (mainWindow) {
        mainWindow.webContents.openDevTools();

        // In main process - this was an attempt to overcome the requirement
        // for user interaction to get pointerlock i think???
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

        // Setup extension development tools
        //if (process.env.NODE_ENV !== 'production') {
        setupExtensionDevTools(mainWindow);
        log.info('Extension development tools set up');
        //}
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
