/**
 * DevTools script for the Three.js ECS Inspector extension
 * This script creates the panel in Chrome DevTools
 */

// Create the DevTools panel
import { LoggingService } from '@shared/utils/LoggingService';

const logging = LoggingService.getInstance();

const instanceId = `${chrome.runtime.id}-${Math.random().toString(36).slice(2, 9)}`;
export const DevtoolsLoggingConfig = {
    source: 'devtools-js',
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

const tabId = chrome.devtools.inspectedWindow.tabId;

chrome.devtools.panels.create(
    'Three.js ECS',
    'icons/icon16.png',
    'panel/panel.html',
    (panel) => {
        // Panel created callback
        console.log('[Three.js ECS Inspector] DevTools panel created');
        LoggingService.getInstance().logMessage({
            host: DevtoolsLoggingConfig.source,
            short_message: 'devtools panel created',
            _data: {
                origin_id: instanceId,
            },
        });

        // You can add event listeners to the panel here if needed
        panel.onShown.addListener((panelWindow) => {
            console.log('[Three.js ECS Inspector] Panel shown');

            LoggingService.getInstance().logMessage({
                host: DevtoolsLoggingConfig.source,
                short_message: '[Three.js ECS Inspector] Panel shown',
                _data: {
                    origin_id: instanceId,
                    message: '[Three.js ECS Inspector] Panel shown',
                },
            });

            // When the panel is shown, you can initialize the panel window if needed
            if (panelWindow && !panelWindow.__panelInitialized) {
                // Set a flag to avoid re-initializing
                panelWindow.__panelInitialized = true;
                LoggingService.getInstance().logMessage({
                    host: DevtoolsLoggingConfig.source,
                    short_message: '[Three.js ECS Inspector] Panel initialized',
                    _origin: 'devtools',
                    _destination: 'background',
                    _data: {
                        origin_id: instanceId,
                    },
                });

                // You can customize the panel window here if needed
                console.log(
                    '[Three.js ECS Inspector] Panel window initialized',
                );
            }
        });

        panel.onHidden.addListener(() => {
            console.log('[Three.js ECS Inspector] Panel hidden');
            LoggingService.getInstance().logMessage({
                host: DevtoolsLoggingConfig.source,
                short_message: '[Three.js ECS Inspector] Panel hidden',
                _data: {
                    origin_id: instanceId,
                },
            });
        });
    },
);

// Connect to the background script to establish communication channel

let devToolsPort: chrome.runtime.Port | null = null;

function connectToBackend() {
    devToolsPort = chrome.runtime.connect({
        name: 'background-script',
    });

    devToolsPort.onDisconnect.addListener(() => {
        LoggingService.getInstance().logMessage({
            host: DevtoolsLoggingConfig.source,
            short_message: `handling disconnect for tabId ${tabId}`,
            _data: {
                origin_id: instanceId,
                port_status: devToolsPort?.name || 'port is null',
            },
        });
        devToolsPort = null;
    });
}

setInterval(() => {
    LoggingService.getInstance().logMessage({
        host: DevtoolsLoggingConfig.source,
        short_message: `sending heartbeat from devtools for tabId ${tabId}`,
        _action: 'heartbeat',
        _origin: 'devtools',
        _destination: 'background',
        _data: {
            devToolsPortName: devToolsPort?.name || 'port is null',
            origin_id: instanceId,
            port_status: devToolsPort?.name || 'port is null',
            tabId: tabId,
        },
    });
    if (devToolsPort) {
        devToolsPort.postMessage({
            short_message: 'heartbeat from devtools',
            _action: 'heartbeat',
            _origin: 'content-script',
            _destination: 'background',
            _data: {
                devToolsPortName: devToolsPort?.name || 'port is null',
            }
        });
    } else {
        connectToBackend();
    }
}, 10000);

// Log the connection
console.log(`[Three.js ECS Inspector] DevTools completed for tab ${tabId}`);
