


interface State {
    connected: boolean;
    scene: {
        hierarchy: any | null;
        selectedNode: any | null;
    };
    entities: {
        list: any[];
        selectedEntity: any | null;
        selectedComponent: any | null;
    };
    systems: {
        list: any[];
        active: any[];
    };
    stats: {
        fps: number;
        memory: {
            geometries: number;
            textures: number;
            jsHeap: number;
            jsHeapTotal: number;
            jsHeapLimit: number;
        };
        timing: Record<string, any>;
    };
    editMode: boolean;
    searchQuery: string;
}

interface UIElements {
    tabs: NodeListOf<HTMLElement>;
    treeContainers: NodeListOf<HTMLElement>;
    sceneTree: HTMLElement | null;
    entityTree: HTMLElement | null;
    systemTree: HTMLElement | null;
    performanceTree: HTMLElement | null;
    detailsTitle: HTMLElement | null;
    detailsContainer: HTMLElement | null;
    statusMessage: HTMLElement | null;
    fpsCounter: HTMLElement | null;
    objectsCounter: HTMLElement | null;
    entitiesCounter: HTMLElement | null;
    systemsCounter: HTMLElement | null;
    refreshBtn: HTMLElement | null;
    captureBtn: HTMLElement | null;
    settingsBtn: HTMLElement | null;
    searchInput: HTMLInputElement | null;
    searchBtn: HTMLElement | null;
    editBtn: HTMLElement | null;
    locateBtn: HTMLElement | null;
}
