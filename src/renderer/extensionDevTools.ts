// src/renderer/extensionDevTools.ts
import { ipcRenderer } from 'electron';

/**
 * Create a simple UI for extension development tools
 *
 * @param containerId ID of the HTML element to create the UI in
 */
export function createExtensionDevToolsUI(containerId: string): void {
    // Find the container element
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container element with ID "${containerId}" not found`);
        return;
    }

    // Create the UI
    const devToolsUI = document.createElement('div');
    devToolsUI.className = 'extension-dev-tools';
    devToolsUI.innerHTML = `
    <style>
      .extension-dev-tools {
        position: fixed;
        top: 10px;
        right: 10px;
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 8px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 12px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .extension-dev-tools button {
        background-color: #4CAF50;
        border: none;
        color: white;
        padding: 5px 10px;
        text-align: center;
        text-decoration: none;
        display: inline-block;
        font-size: 12px;
        margin: 2px;
        cursor: pointer;
        border-radius: 3px;
      }

      .extension-dev-tools button:hover {
        background-color: #45a049;
      }

      .extension-dev-tools .status {
        font-size: 10px;
        margin-top: 5px;
      }

      .extension-dev-tools.collapsed {
        width: 30px;
        height: 30px;
        overflow: hidden;
        opacity: 0.5;
      }

      .extension-dev-tools .toggle {
        position: absolute;
        top: 2px;
        right: 2px;
        width: 20px;
        height: 20px;
        background-color: rgba(0, 0, 0, 0.5);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-radius: 3px;
      }

      .extension-dev-tools.collapsed .toggle {
        top: 5px;
        right: 5px;
      }
    </style>

    <div class="toggle">_</div>
    <h3>DevTools Extensions</h3>
    <button id="reload-inspector">Reload ThreeJS ECS Inspector</button>
    <button id="inspect-extension">Inspect Extension</button>
    <div class="status">Ready</div>
  `;

    // Add the UI to the container
    container.appendChild(devToolsUI);

    // Add event listeners
    const reloadButton = devToolsUI.querySelector('#reload-inspector');
    const inspectButton = devToolsUI.querySelector('#inspect-extension');
    const statusDiv = devToolsUI.querySelector('.status');
    const toggleDiv = devToolsUI.querySelector('.toggle');

    if (reloadButton) {
        reloadButton.addEventListener('click', async () => {
            if (statusDiv) {
                statusDiv.textContent = 'Reloading...';
            }

            try {
                const result = await ipcRenderer.invoke('reload-extension', 'Three.js ECS Inspector');

                if (statusDiv) {
                    if (result.success) {
                        statusDiv.textContent = 'Reloaded successfully!';
                    } else {
                        statusDiv.textContent = `Error: ${result.error || 'Unknown error'}`;
                    }

                    // Reset status after a delay
                    setTimeout(() => {
                        if (statusDiv) {
                            statusDiv.textContent = 'Ready';
                        }
                    }, 3000);
                }
            } catch (error) {
                if (statusDiv) {
                    statusDiv.textContent = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
                }
            }
        });
    }

    if (inspectButton) {
        inspectButton.addEventListener('click', () => {
            ipcRenderer.send('inspect-extension');
        });
    }

    if (toggleDiv) {
        toggleDiv.addEventListener('click', () => {
            devToolsUI.classList.toggle('collapsed');
            if (devToolsUI.classList.contains('collapsed')) {
                toggleDiv.textContent = '+';
            } else {
                toggleDiv.textContent = '_';
            }
        });
    }

    // Listen for extension reloaded events
    ipcRenderer.on('extension-reloaded', (event, data) => {
        if (statusDiv) {
            statusDiv.textContent = `${data.name} reloaded (${data.id})`;

            // Reset status after a delay
            setTimeout(() => {
                if (statusDiv) {
                    statusDiv.textContent = 'Ready';
                }
            }, 3000);
        }
    });
}
