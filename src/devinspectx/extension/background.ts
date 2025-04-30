/**
 * Background script for the Three.js ECS Inspector extension
 * This script handles communication between the DevTools panel and content scripts
 */

// Store connections to content scripts and devtools panels
interface ConnectionMap {
    devtools: Record<string, chrome.runtime.Port>;
    content: Record<string, chrome.runtime.Port>;
}

const connections: ConnectionMap = {
    devtools: {}, // keyed by tabId
    content: {}   // keyed by tabId
};

// Listen for connections from DevTools panel or content scripts
chrome.runtime.onConnect.addListener((port) => {

    const portName = port.name;

    // Handle DevTools connection
    if (portName.startsWith('three-ecs-devtools-')) {
        // Parse tabId from the connection name (format: 'three-ecs-devtools-{tabId}')
        const tabId = portName.split('-').pop() || 'unknown';

        // Store the connection
        connections.devtools[tabId] = port;

        console.log(`[Three.js ECS Inspector] DevTools connected for tab ${tabId}`);

        // Set up disconnect handler
        port.onDisconnect.addListener(() => {
            delete connections.devtools[tabId];
            console.log(`[Three.js ECS Inspector] DevTools disconnected for tab ${tabId}`);

            // Notify content script that DevTools has disconnected
            if (connections.content[tabId]) {
                connections.content[tabId].postMessage({
                    source: 'devtools',
                    data: { type: 'disconnected' }
                });
            }
        });

        // Listen for messages from the DevTools panel
        port.onMessage.addListener((message) => {
            // Forward messages to content script
            if (connections.content[tabId]) {
                connections.content[tabId].postMessage({
                    source: 'devtools',
                    data: message.data
                });
            }
        });

        // Notify content script that DevTools has connected (if it's already connected)
        if (connections.content[tabId]) {
            connections.content[tabId].postMessage({
                source: 'devtools',
                data: { type: 'connected' }
            });

            // Also notify DevTools that content script is already connected
            port.postMessage({
                source: 'background',
                data: { type: 'content-connected' }
            });
        }
    }
    // Handle content script connection
    else if (portName.startsWith('three-ecs-content-')) {
        // Parse tabId from the connection name (format: 'three-ecs-content-{tabId}')
        const tabId = portName.split('-').pop() || 'unknown';

        // Store the connection
        connections.content[tabId] = port;

        console.log(`[Three.js ECS Inspector] Content script connected for tab ${tabId}`);

        // Set up disconnect handler
        port.onDisconnect.addListener(() => {
            delete connections.content[tabId];
            console.log(`[Three.js ECS Inspector] Content script disconnected for tab ${tabId}`);

            // Notify DevTools that content script has disconnected
            if (connections.devtools[tabId]) {
                connections.devtools[tabId].postMessage({
                    source: 'background',
                    data: { type: 'content-disconnected' }
                });
            }
        });

        // Listen for messages from the content script
        port.onMessage.addListener((message) => {
            // Forward messages to DevTools panel
            if (connections.devtools[tabId]) {
                connections.devtools[tabId].postMessage({
                    source: 'content',
                    data: message.data
                });
            }
        });

        // Notify DevTools that content script has connected (if DevTools is already connected)
        if (connections.devtools[tabId]) {
            connections.devtools[tabId].postMessage({
                source: 'background',
                data: { type: 'content-connected' }
            });

            // Also notify content script that DevTools is already connected
            port.postMessage({
                source: 'devtools',
                data: { type: 'connected' }
            });
        }
    }
});

// Log that the background script is running
console.log('[Three.js ECS Inspector] Background script loaded');
