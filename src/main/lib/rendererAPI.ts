// In src/main/main.ts - Add with other IPC handlers
import { app, dialog, ipcMain } from 'electron';
import path from 'path';
import * as fs from 'node:fs';
import * as YAML from 'yaml';

/**
 * rendererAPI
 *
 * methods exposed to renderer
 */
export function rendererAPI() {
    // Handle saving a file with data
    ipcMain.handle(
        'save-file',
        async (_event, { filename, data, format = 'json', options = {} }) => {
            try {
                let content = '';

                // Format the data based on requested format
                if (format === 'json') {
                    content = JSON.stringify(data, null, options.indent || 2);
                } else if (format === 'yaml' || format === 'yml') {
                    content = YAML.stringify(data, options);
                } else if (format === 'text' || format === 'txt') {
                    content = String(data);
                } else {
                    throw new Error(`Unsupported format: ${format}`);
                }

                // Create directory if it doesn't exist
                const dirname = path.dirname(filename);
                await fs.promises.mkdir(dirname, { recursive: true });

                // Write the file
                await fs.promises.writeFile(filename, content, 'utf8');
                return { success: true, path: filename };
            } catch (error) {
                console.error('Error saving file:', error);
                return {
                    success: false,
                    error:
                        error instanceof Error ? error.message : String(error),
                };
            }
        },
    );

    // Handle opening a file dialog and saving a world config
    ipcMain.handle('save-world-config', async (event, worldConfig) => {
        try {
            const { canceled, filePath } = await dialog.showSaveDialog({
                title: 'Save World Configuration',
                defaultPath: path.join(app.getPath('documents'), 'world.yaml'),
                filters: [
                    { name: 'YAML Files', extensions: ['yaml', 'yml'] },
                    { name: 'All Files', extensions: ['*'] },
                ],
                properties: ['createDirectory'],
            });

            if (canceled || !filePath) {
                return { success: false, canceled: true };
            }

            const content = YAML.stringify(worldConfig);
            await fs.promises.writeFile(filePath, content, 'utf8');

            return { success: true, path: filePath };
        } catch (error) {
            console.error('Error saving world config:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    });

    // Handle opening a file dialog and loading a world config
    ipcMain.handle('open-world-config', async () => {
        try {
            const { canceled, filePaths } = await dialog.showOpenDialog({
                title: 'Open World Configuration',
                filters: [
                    { name: 'YAML Files', extensions: ['yaml', 'yml'] },
                    { name: 'All Files', extensions: ['*'] },
                ],
                properties: ['openFile'],
            });

            if (canceled || filePaths.length === 0) {
                return { success: false, canceled: true };
            }

            const filePath = filePaths[0];
            const content = await fs.promises.readFile(filePath, 'utf8');
            const worldConfig = YAML.parse(content);

            return {
                success: true,
                path: filePath,
                config: worldConfig,
            };
        } catch (error) {
            console.error('Error opening world config:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    });

    /*
     Handle reading a file
    */
    ipcMain.handle('read-file', async (_event, { filePath }) => {
        try {
            const content = await fs.promises.readFile(filePath, 'utf8');
            return { success: true, content };
        } catch (error) {
            console.error('Error reading file:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    });
}
