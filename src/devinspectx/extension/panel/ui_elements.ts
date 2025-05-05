export const ui: UIElements = {
    tabs: document.querySelectorAll('.tab-btn'),
    treeContainers: document.querySelectorAll('.tree-container'),

    // Trees
    sceneTree: document.getElementById('scene-tree'),
    entityTree: document.getElementById('entities-tree'),
    systemTree: document.getElementById('systems-tree'),
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
    searchInput: document.getElementById(
        'search-input',
    ) as HTMLInputElement | null,
    searchBtn: document.getElementById('search-btn'),
    editBtn: document.getElementById('edit-btn'),
    locateBtn: document.getElementById('locate-btn'),
};
