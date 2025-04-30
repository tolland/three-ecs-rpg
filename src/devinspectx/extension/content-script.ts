/**
 * Content script for the Three.js ECS Inspector extension
 * This script is injected into the page and serves as a bridge between
 * the page context (where the application runs) and the extension
 */

// Inject the bridge script into the page
function injectBridgeScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('bridge.js');

    // Use addEventListener instead of onload property for better TypeScript compatibility
    script.addEventListener('load', function() {
        // 'this' is already correctly typed as the target element (the script)
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }
    });

    (document.head || document.documentElement).appendChild(script);

    console.log('[Three.js ECS Inspector] Bridge script injected');
}

// Check if the document is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectBridgeScript);
} else {
    injectBridgeScript();
}

// Connect to the background script
let port: chrome.runtime.Port | null = null;

function connectToBackend() {
    // Get tab ID if possible
    const tabId = chrome.devtools ? chrome.devtools.inspectedWindow.tabId : 'unknown';

    // Connect to the background script
    port = chrome.runtime.connect({
        name: `three-ecs-content-${tabId}`
    });

    function logConnectionStatus() {
        console.log('[Content] Connection status:', {
            port: !!port,
            hasMessageListener: !!window.__hasMessageListener
        });
    }

    // Listen for messages from the background script
    port.onMessage.addListener((message) => {
        // Forward messages from the DevTools panel to the page
        if (message.source === 'devtools') {
            window.postMessage({
                source: 'three-ecs-devtools',
                data: message.data
            }, '*');
        }
    });

    // Set up disconnect handler
    port.onDisconnect.addListener(() => {
        console.log('[Three.js ECS Inspector] Disconnected from background script');
        port = null;

        // Notify the page
        window.postMessage({
            source: 'three-ecs-devtools',
            data: { type: 'disconnected' }
        }, '*');

        // Try to reconnect after a delay
        setTimeout(connectToBackend, 1000);
    });

    // Add a flag to track message listener
    window.__hasMessageListener = true;

// At the end of content-script.js
    setInterval(logConnectionStatus, 5000);

    console.log('[Three.js ECS Inspector] Connected to background script');
}

// Connect to the backend immediately
connectToBackend();

// Listen for messages from the page (bridge script)
window.addEventListener('message', (event) => {
    // Only handle messages from our bridge script
    if (event.data && event.data.source === 'three-ecs-bridge') {
        // Forward messages to the background script
        if (port) {
            port.postMessage({
                source: 'content',
                data: event.data.data
            });
        } else {
            console.warn('[Three.js ECS Inspector] Cannot forward message, not connected to background script');
        }
    }
});

// Notify the page when the content script is loaded
window.postMessage({
    source: 'three-ecs-devtools',
    data: { type: 'content-script-loaded' }
}, '*');
