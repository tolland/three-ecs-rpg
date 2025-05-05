import { bridgeState } from '@bridge/bridge_state';


export function serializeSceneHierarchy(root?: any) {
    const scene = root || bridgeState.appScene;
    if (!scene) return [];

    const serializeNode = (node: any) => {
        const result = {
            uuid: node.uuid,
            name: node.name || 'Unnamed',
            type: node.type || node.constructor.name,
            visible: !!node.visible,
            childCount: Array.isArray(node.children)
                ? node.children.length
                : 0,
            children: [] as any[],
        };

        // Add children recursively if they exist
        if (node.children && node.children.length > 0) {
            result.children = node.children.map(serializeNode);
        }

        return result;
    };

    return serializeNode(scene);
}

