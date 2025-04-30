/**
 * Panel script for the Three.js ECS Inspector
 * This script handles UI functionality for the DevTools panel
 */

// Make sure we wait for the DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Panel DOM loaded, initializing UI');
    initializePanel();
});

function initializePanel() {
    // Get the port from the DevTools page
    const port = window.__threeEcsInspectorPort || chrome.runtime.connect({
        name: `three-ecs-devtools-${chrome.devtools.inspectedWindow.tabId}`
    });

    // State
    const state = {
        connected: false,
        scene: {
            hierarchy: null,
            selectedNode: null
        },
        entities: {
            list: [],
            selectedEntity: null,
            selectedComponent: null
        },
        systems: {
            list: [],
            active: []
        },
        stats: {
            fps: 0,
            memory: {
                geometries: 0,
                textures: 0,
                jsHeap: 0,
                jsHeapTotal: 0,
                jsHeapLimit: 0
            },
            timing: {}
        },
        editMode: false,
        searchQuery: ''
    };

    function logConnectionStatus() {
        console.log('[Panel] Connection status:', {
            port: !!port,
            state: {
                connected: state.connected,
                hasScene: !!state.scene.hierarchy,
                hasEntities: state.entities.list.length > 0,
                hasSystems: state.systems.list.length > 0
            }
        });
    }

    // UI References - make sure these elements exist before trying to access them
    const ui = {
        // Tabs
        tabs: document.querySelectorAll('.tab-btn'),
        treeContainers: document.querySelectorAll('.tree-container'),

        // Trees
        sceneTree: document.getElementById('scene-tree'),
        entityTree: document.getElementById('entity-tree'),
        systemTree: document.getElementById('system-tree'),
        performanceTree: document.getElementById('performance-tree'),

        // Details
        detailsTitle: document.getElementById('details-title'),
        detailsContainer: document.getElementById('details-container'),

        // Status
        statusMessage: document.getElementById('status-message'),
        fpsCounter: document.getElementById('fps'),
        objectsCounter: document.getElementById('objects'),
        entitiesCounter: document.getElementById('entities'),
        systemsCounter: document.getElementById('systems'),

        // Actions
        refreshBtn: document.getElementById('refresh-btn'),
        captureBtn: document.getElementById('capture-btn'),
        settingsBtn: document.getElementById('settings-btn'),
        searchInput: document.getElementById('search-input'),
        searchBtn: document.getElementById('search-btn'),
        editBtn: document.getElementById('edit-btn'),
        locateBtn: document.getElementById('locate-btn')
    };

    // Check if UI elements were found
    function checkUIElements() {
        const missingElements = [];

        if (!ui.tabs || ui.tabs.length === 0) missingElements.push('tabs');
        if (!ui.treeContainers || ui.treeContainers.length === 0) missingElements.push('treeContainers');
        if (!ui.sceneTree) missingElements.push('sceneTree');
        if (!ui.entityTree) missingElements.push('entityTree');
        if (!ui.systemTree) missingElements.push('systemTree');
        if (!ui.performanceTree) missingElements.push('performanceTree');
        if (!ui.detailsTitle) missingElements.push('detailsTitle');
        if (!ui.detailsContainer) missingElements.push('detailsContainer');
        if (!ui.statusMessage) missingElements.push('statusMessage');
        if (!ui.refreshBtn) missingElements.push('refreshBtn');
        if (!ui.searchInput) missingElements.push('searchInput');

        if (missingElements.length > 0) {
            console.error('Missing UI elements:', missingElements);
            document.body.innerHTML = `
        <div style="padding: 20px; color: red;">
          <h3>Error: Missing UI Elements</h3>
          <p>The following elements could not be found: ${missingElements.join(', ')}</p>
          <p>Please check the panel.html file and ensure all required elements are present.</p>
        </div>
      `;
            return false;
        }

        return true;
    }

    // Initialize the UI
    function initUI() {
        if (!checkUIElements()) {
            return;
        }

        console.log('UI elements verified, setting up event handlers');

        // Set up tab switching
        ui.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                console.log('Tab clicked:', tab.dataset.tab);

                // Deactivate all tabs and containers
                ui.tabs.forEach(t => t.classList.remove('active'));
                ui.treeContainers.forEach(c => c.classList.remove('active'));

                // Activate the clicked tab and its container
                tab.classList.add('active');
                const tabName = tab.dataset.tab;
                if (document.getElementById(`${tabName}-tree`)) {
                    document.getElementById(`${tabName}-tree`).classList.add('active');
                } else {
                    console.error(`Could not find tree container for tab: ${tabName}`);
                }
            });
        });

        // Set up refresh button
        if (ui.refreshBtn) {
            ui.refreshBtn.addEventListener('click', () => {
                refreshAll();
            });
        }

        // Set up capture button
        if (ui.captureBtn) {
            ui.captureBtn.addEventListener('click', () => {
                captureSnapshot();
            });
        }

        // Set up search functionality
        if (ui.searchInput && ui.searchBtn) {
            ui.searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    performSearch();
                }
            });

            ui.searchBtn.addEventListener('click', () => {
                performSearch();
            });
        }

        // Setup locate button
        if (ui.locateBtn) {
            ui.locateBtn.addEventListener('click', () => {
                locateSelectedObject();
            });
        }

        // Setup edit button
        if (ui.editBtn) {
            ui.editBtn.addEventListener('click', () => {
                toggleEditMode();
            });
        }

        // Update the status to show we're initializing
        updateStatus('Initializing Three.js ECS Inspector...');
    }

    // Communication with the background script
    function sendMessage(message) {
        port.postMessage({
            source: 'devtools',
            data: message
        });
    }

    // Listen for messages from the background script
    port.onMessage.addListener((message) => {
        if (!message || !message.data) return;

        const { source, data } = message;

        // Handle messages from the content script
        if (source === 'content') {
            handleContentMessage(data);
        }
        // Handle messages from the background script
        else if (source === 'background') {
            handleBackgroundMessage(data);
        }
    });

    // Handle messages from the content script
    function handleContentMessage(message) {
        if (!message || !message.type) return;

        switch (message.type) {
            case 'bridge-ready':
                console.log('Bridge script is ready');
                state.connected = true;
                updateStatus('Connected to Three.js ECS application');

                // Send initial connection message
                sendMessage({ type: 'connected' });
                break;

            case 'initialize':
                handleInitialize(message);
                break;

            case 'update':
                handleUpdate(message);
                break;

            case 'response':
                handleResponse(message);
                break;

            case 'objectChanged':
                handleObjectChanged(message);
                break;
        }
    }

    // Handle messages from the background script
    function handleBackgroundMessage(message) {
        if (!message || !message.type) return;

        switch (message.type) {
            case 'content-connected':
                console.log('Content script is connected');
                updateStatus('Content script connected, waiting for bridge...');
                break;

            case 'content-disconnected':
                console.log('Content script disconnected');
                state.connected = false;
                updateStatus('Disconnected from page');
                break;
        }
    }

    // Handle initialize message
    function handleInitialize(message) {
        console.log('Initialization:', message);

        if (message.status === 'complete') {
            updateStatus('Successfully connected to Three.js ECS');
            state.connected = true;
        } else if (message.status === 'partial') {
            const { foundScene, foundRenderer, foundWorld, foundEcsDebug } = message.foundObjects;

            let statusMsg = 'Partial connection: ';
            let foundItems = [];

            if (foundScene) foundItems.push('Scene');
            if (foundRenderer) foundItems.push('Renderer');
            if (foundWorld) foundItems.push('World');
            if (foundEcsDebug) foundItems.push('ECS Debug');

            statusMsg += foundItems.join(', ');

            if (foundItems.length === 0) {
                statusMsg = 'Could not find Three.js or ECS objects';
            }

            updateStatus(statusMsg);
        }
    }

    // Update status message
    function updateStatus(message) {
        if (ui.statusMessage) {
            ui.statusMessage.textContent = message;
        }
        console.log('Status:', message);
    }

    // Refresh all data
    function refreshAll() {
        if (!state.connected) {
            updateStatus('Not connected. Attempting to reconnect...');
            sendMessage({ type: 'connected' });
            return;
        }

        sendMessage({
            type: 'command',
            command: 'refreshAll'
        });

        updateStatus('Refreshing all data...');
    }

    // Handle update messages
    function handleUpdate(message) {
        if (!message || !message.target) return;

        switch (message.target) {
            case 'scene':
                updateSceneData(message.data);
                break;

            case 'entities':
                updateEntityData(message.data);
                break;

            case 'systems':
                updateSystemData(message.data);
                break;

            case 'stats':
                updateStatsData(message.data);
                break;
        }
    }

    // Handle response messages (from requests we've sent)
    function handleResponse(message) {
        if (!message) return;

        const { requestId, data, error } = message;

        if (error) {
            console.error('Request error:', error);
            updateStatus(`Error: ${error}`);
            return;
        }

        console.log('Response:', requestId, data);

        // Handle different types of responses based on the request ID
        if (requestId.startsWith('scene_object_')) {
            displayObjectDetails(data);
        } else if (requestId.startsWith('entity_')) {
            displayEntityDetails(data);
        } else if (requestId.startsWith('component_')) {
            displayComponentDetails(data);
        } else if (requestId.startsWith('system_')) {
            displaySystemDetails(data);
        }
    }

    // Handle object changed notification
    function handleObjectChanged(message) {
        if (!message || !message.uuid) return;

        // Update the scene hierarchy if needed
        refreshScene();

        // If this is the currently selected object, update its details
        if (state.scene.selectedNode && state.scene.selectedNode.uuid === message.uuid) {
            requestObjectDetails(message.uuid);
        }
    }

    // Placeholder functions that would be implemented in a real extension
    function updateSceneData(data) {
        console.log('Scene data updated:', data);
        if (ui.sceneTree) {
            ui.sceneTree.innerHTML = '<div>Scene data received</div>';
        }
    }

    function updateEntityData(data) {
        console.log('Entity data updated:', data);
        if (ui.entityTree) {
            ui.entityTree.innerHTML = '<div>Entity data received</div>';
        }
    }

    function updateSystemData(data) {
        console.log('System data updated:', data);
        if (ui.systemTree) {
            ui.systemTree.innerHTML = '<div>System data received</div>';
        }
    }

    function updateStatsData(data) {
        console.log('Stats data updated:', data);
        if (ui.fpsCounter) {
            ui.fpsCounter.textContent = `FPS: ${data.fps || '--'}`;
        }
    }

    function displayObjectDetails(data) {
        console.log('Displaying object details:', data);
        if (ui.detailsContainer) {
            ui.detailsContainer.innerHTML = '<div>Object details received</div>';
        }
    }

    function displayEntityDetails(data) {
        console.log('Displaying entity details:', data);
        if (ui.detailsContainer) {
            ui.detailsContainer.innerHTML = '<div>Entity details received</div>';
        }
    }

    function displayComponentDetails(data) {
        console.log('Displaying component details:', data);
        if (ui.detailsContainer) {
            ui.detailsContainer.innerHTML = '<div>Component details received</div>';
        }
    }

    function displaySystemDetails(data) {
        console.log('Displaying system details:', data);
        if (ui.detailsContainer) {
            ui.detailsContainer.innerHTML = '<div>System details received</div>';
        }
    }

    function refreshScene() {
        console.log('Refreshing scene');
    }

    function requestObjectDetails(uuid) {
        console.log('Requesting object details:', uuid);
    }

    function performSearch() {
        const query = ui.searchInput ? ui.searchInput.value : '';
        console.log('Performing search for:', query);
    }

    function locateSelectedObject() {
        console.log('Locating selected object');
    }

    function toggleEditMode() {
        state.editMode = !state.editMode;
        console.log('Edit mode:', state.editMode);
    }

    function captureSnapshot() {
        console.log('Capturing snapshot');
    }

    setInterval(logConnectionStatus, 5000);

    // Initialize the panel
    initUI();

    // Initial connection attempt
    setTimeout(() => {
        console.log('Attempting initial connection');
        if (!state.connected) {
            sendMessage({ type: 'connected' });
        }
    }, 1000);
}
