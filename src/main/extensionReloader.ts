// src/main/extensionReloader.ts
import { session, BrowserWindow, ipcMain, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as log from 'electron-log';
import MenuItemConstructorOptions = Electron.MenuItemConstructorOptions;

// Keep track of loaded extensions
const loadedExtensions: Record<string, Electron.Extension> = {};

/**
 * Install a DevTools extension from the specified path
 *
 * @param extensionName
 * @param extensionPath Path to the extension directory
 * @param mainWindow The main application window
 * @returns The extension object
 */
export async function installDevToolsExtension(
    extensionName: string,
    extensionPath: string,
    mainWindow: BrowserWindow
): Promise<Electron.Extension> {
    try {
        // Check if the extension exists
        if (!fs.existsSync(extensionPath)) {
            throw new Error(`Extension not found at ${extensionPath}`);
        }

        // Uninstall the extension if it's already loaded
        if (loadedExtensions[extensionName]) {
            await session.defaultSession.removeExtension(loadedExtensions[extensionName].id);
            log.info(`Removed existing ${extensionName} extension`);
        }

        // Install the extension
        const extension = await session.defaultSession.loadExtension(extensionPath, {
            allowFileAccess: true
        });

        // Store the extension for later reference
        loadedExtensions[extensionName] = extension;

        log.info(`Installed ${extensionName} extension (${extension.id})`);

        return extension;
    } catch (error) {
        log.error(`Failed to install ${extensionName} extension:`, error);
        throw error;
    }
}

/**
 * Set up extension development tools and IPC handlers for reloading
 *
 * @param mainWindow The main application window
 */
export function setupExtensionDevTools(mainWindow: BrowserWindow): void {
    // Create dev tools menu
    const devExtensionsMenu: MenuItemConstructorOptions[] = [{
        label: 'DevTools Extensions',
        submenu: [
            {
                label: 'Reload Three.js ECS Inspector',
                accelerator: 'CmdOrCtrl+Shift+R',
                click: async () => {
                    console.log(__dirname);
                    await reloadExtension('Three.js ECS Inspector',
                        path.resolve(__dirname, '../devinspectx'), mainWindow);
                }
            },
            { type: 'separator' },
            {
                label: 'Open DevTools for Extension',
                click: () => {
                    // Open DevTools focused on the extension
                    mainWindow.webContents.openDevTools();
                }
            }
        ]
    }];

    // Add to application menu (Note: in a real app, integrate this with your menu)
    Menu.buildFromTemplate(devExtensionsMenu);

    // Set up IPC handler for extension reloading
    ipcMain.handle('reload-extension', async (event, extensionName) => {
        if (extensionName === 'Three.js ECS Inspector') {
            return await reloadExtension('Three.js ECS Inspector',
                path.resolve(__dirname, '../../devinspectx'), mainWindow);
        }
        return { success: false, error: 'Unknown extension' };
    });
}

/**
 * Reload a specific extension
 *
 * @param extensionName Name of the extension
 * @param extensionPath Path to the extension directory
 * @param mainWindow The main application window
 * @returns Result of the reload operation
 */
export async function reloadExtension(
    extensionName: string,
    extensionPath: string,
    mainWindow: BrowserWindow
): Promise<{ success: boolean; error?: string }> {
    try {
        log.info(`Reloading ${extensionName} extension...`);

        // Remove the extension if it's loaded
        if (loadedExtensions[extensionName]) {
            await session.defaultSession.removeExtension(loadedExtensions[extensionName].id);
            delete loadedExtensions[extensionName];
        }

        // Reinstall the extension
        const extension = await installDevToolsExtension(extensionName, extensionPath, mainWindow);

        // Force refresh DevTools
        mainWindow.webContents.closeDevTools();

        // Wait a moment and reopen DevTools
        setTimeout(() => {
            mainWindow.webContents.openDevTools();

            // Send notification to renderer (optional)
            mainWindow.webContents.send('extension-reloaded', {
                name: extensionName,
                id: extension.id
            });

            log.info(`${extensionName} extension reloaded successfully`);
        }, 500);

        return { success: true };
    } catch (error) {
        log.error(`Failed to reload ${extensionName} extension:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
