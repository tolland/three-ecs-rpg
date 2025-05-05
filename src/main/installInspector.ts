/**
 * Installs the Three.js ECS Inspector extension in Electron
 */
import { session } from 'electron';
import path from 'path';
import fs from 'fs';

/**
 * Install the Three.js ECS Inspector extension in Electron
 *
 * @param electronSession The Electron session to install the extension in
 * @returns A promise that resolves when the extension is installed
 */
export async function installThreeEcsInspector(
    electronSession: Electron.Session = session.defaultSession,
): Promise<Electron.Extension> {
    const extensionPath = path.resolve(__dirname, '../devinspectx');

    // Check if the extension exists
    if (!fs.existsSync(extensionPath)) {
        throw new Error(
            `Three.js ECS Inspector extension not found at ${extensionPath}`,
        );
    }

    try {
        // Check if DevTools extension API exists
        if (!electronSession.loadExtension) {
            throw new Error(
                'Electron session does not support loadExtension API',
            );
        }

        // Install the extension
        const extension = await electronSession.loadExtension(extensionPath, {
            allowFileAccess: true,
        });

        console.log(
            `Three.js ECS Inspector extension installed: ${extension.name}`,
        );
        return extension;
    } catch (error) {
        console.error(
            'Failed to install Three.js ECS Inspector extension:',
            error,
        );
        throw error;
    }
}

/**
 * Install the Three.js ECS Inspector extension in all windows
 * @param mainSession Optional main Electron session
 * @param webviewSession Optional webview session
 * @returns A promise that resolves when the extension is installed in all provided sessions
 */
export async function installInspectorInAllSessions(
    mainSession: Electron.Session = session.defaultSession,
    webviewSession?: Electron.Session,
): Promise<Electron.Extension[]> {
    const extensions: Electron.Extension[] = [];

    // Install in main session
    const mainExtension = await installThreeEcsInspector(mainSession);
    extensions.push(mainExtension);

    // Install in webview session if provided
    if (webviewSession && webviewSession !== mainSession) {
        const webviewExtension = await installThreeEcsInspector(webviewSession);
        extensions.push(webviewExtension);
    }

    return extensions;
}
