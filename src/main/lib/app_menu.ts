import { app, BrowserWindow, Menu, shell } from 'electron';
import path from 'path';
import { reloadExtension } from '@main/extensionReloader';

/**
 * Create the application menu with File menu options
 */
export function createApplicationMenu(mainWindow: BrowserWindow) {
    const isMac = process.platform === 'darwin';

    const template: ({
        label: string;
        submenu: ({ accelerator: string; click: () => void; label: string } | { type: string })[]
    } | { label: string; submenu: ({ role: string } | { type: string })[] } | {
        role: string;
        submenu: { click: () => Promise<void>; label: string }[]
    })[] = [
        // File Menu
        {
            label: 'File',
            submenu: [
                {
                    label: 'New World',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.send('new-world');
                    },
                },
                {
                    label: 'Open World...',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => {
                        mainWindow.webContents.send('open-world');
                    },
                },
                {
                    label: 'Save World',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        mainWindow.webContents.send('save-world');
                    },
                },
                {
                    label: 'Save World As...',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: () => {
                        mainWindow.webContents.send('save-world-as');
                    },
                },
                { type: 'separator' },
                // { role: isMac ? 'close' : 'quit' },
                {
                    label: 'Quit',
                    accelerator:
                        process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    },
                },
            ],
        },
        // Edit Menu
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                ...(isMac
                    ? [{ role: 'delete' }, { role: 'selectAll' }]
                    : [
                        { role: 'delete' },
                        { type: 'separator' },
                        { role: 'selectAll' },
                    ]),
            ],
        },
        // View Menu
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' },
            ],
        },
        // Window Menu
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                ...(isMac
                    ? [
                        { type: 'separator' },
                        { role: 'front' },
                        { type: 'separator' },
                        { role: 'window' },
                    ]
                    : [{ role: 'close' }]),
            ],
        },
        // // Extension menu
        {
            label: 'Devinspectx',
            submenu: [
                {
                    label: 'Reload Three.js ECS Inspector',
                    accelerator: 'CmdOrCtrl+Shift+R',
                    click: () => {
                        reloadExtension('Three.js ECS Inspector',
                            path.resolve(__dirname, '../devinspectx'), mainWindow);
                    }
                },
                // { type: 'separator' },
                // {
                //     label: 'Open DevTools for Extension',
                //     accelerator: 'CmdOrCtrl+Shift+0',
                //     click: async () => {
                //         // Open DevTools focused on the extension
                //         mainWindow.webContents.openDevTools();
                //     }
                // }
            ]
        },
        // Help Menu
        {
            role: 'help',
            submenu: [
                {
                    label: 'Learn More',
                    click: async () => {
                        await shell.openExternal(
                            'https://github.com/yourusername/three-ecs-rpg',
                        );
                    },
                },
            ],
        },
    ];

    // @ts-ignore - The template has correct structure for Menu.buildFromTemplate
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}
