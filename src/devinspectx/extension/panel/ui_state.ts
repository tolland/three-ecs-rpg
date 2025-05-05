
/**
* Panel data state object
*
* hold state data
*/

export const state: State = {
    connected: false,
    scene: {
        hierarchy: null,
        selectedNode: null,
    },
    entities: {
        list: [],
        selectedEntity: null,
        selectedComponent: null,
    },
    systems: {
        list: [],
        active: [],
    },
    stats: {
        fps: 0,
        memory: {
            geometries: 0,
            textures: 0,
            jsHeap: 0,
            jsHeapTotal: 0,
            jsHeapLimit: 0,
        },
        timing: {},
    },
    editMode: false,
    searchQuery: '',
};
