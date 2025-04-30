/**
 * DevTools script for the Three.js ECS Inspector extension
 * This script creates the panel in Chrome DevTools
 */

// Create the DevTools panel
chrome.devtools.panels.create(
    'Three.js ECS',                // Panel title
    'icons/icon16.png',            // Panel icon
    'panel/panel.html',            // Panel HTML page
    (panel) => {
        // Panel created callback
        console.log('[Three.js ECS Inspector] DevTools panel created');

        // You can add event listeners to the panel here if needed
        panel.onShown.addListener((panelWindow) => {
            console.log('[Three.js ECS Inspector] Panel shown');

            // When the panel is shown, you can initialize the panel window if needed
            if (panelWindow && !panelWindow.__panelInitialized) {
                // Set a flag to avoid re-initializing
                panelWindow.__panelInitialized = true;

                // You can customize the panel window here if needed
                console.log('[Three.js ECS Inspector] Panel window initialized');
            }
        });

        panel.onHidden.addListener(() => {
            console.log('[Three.js ECS Inspector] Panel hidden');
        });
    }
);

// Connect to the background script to establish communication channel
const tabId = chrome.devtools.inspectedWindow.tabId;
const devToolsPort = chrome.runtime.connect({
    name: `three-ecs-devtools-${tabId}`
});

// Log the connection
console.log(`[Three.js ECS Inspector] DevTools connected for tab ${tabId}`);

// Export the port for use in other DevTools scripts
window.__threeEcsInspectorPort = devToolsPort;
