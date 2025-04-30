/**
 * Entry point for the Three.js ECS Inspector module
 *
 * This file is mainly used as an entry point for Rollup to begin building
 * the extension. The actual extension is loaded directly via Chrome's extension
 * system, not through this JavaScript module.
 */

// Import the necessary modules for Rollup to include them
import './extension/background';
import './extension/content-script';
import './extension/devtools';
import './extension/bridge';

// // Export a function to install the extension in Electron
// export function installInspectorExtension(session: Electron.Session, extensionPath: string): Promise<Electron.Extension> {
//     return session.loadExtension(extensionPath, { allowFileAccess: true });
// }

// This module doesn't need to do anything at runtime, just include the files for bundling
console.log('Three.js ECS Inspector module loaded');
