
import { serializeObject } from '@bridge/serilaizer';
import { bridgeState } from '@bridge/bridge_state';

export function findObjectByUUID(uuid: string) {
    if (!bridgeState.appScene) return null;

    // Helper function to traverse the scene graph
    const findNode = (node: any): any => {
        if (node.uuid === uuid) return node;

        if (node.children) {
            for (const child of node.children) {
                const found = findNode(child);
                if (found) return found;
            }
        }

        return null;
    };

    return findNode(bridgeState.appScene);
}

export function getEntityById(entityId: any) {
    if (!bridgeState.appWorld) return null;

    try {
        const components = bridgeState.appWorld.getEntityComponents?.(entityId);
        if (!components) return null;

        // Extract component data
        const result = {
            id: entityId,
            components: [] as any[],
        };

        components.forEach((component: any, constructor: any) => {
            result.components.push({
                name: constructor.name,
                data: serializeObject(component, 0, 2),
            });
        });

        return result;
    } catch (e) {
        console.error('[Three.js ECS Inspector] Error getting entity:', e);
        return null;
    }
}

export function getEntityComponents(entityId: any) {
    if (!bridgeState.appWorld) return [];

    try {
        // Try to get component names via the dedicated method
        if (typeof bridgeState.appWorld.getEntityComponentNames === 'function') {
            return bridgeState.appWorld.getEntityComponentNames(entityId);
        }

        // Fallback: Try to extract from entity components map
        const components = bridgeState.appWorld.getEntityComponents?.(entityId);
        if (!components) return [];

        const componentNames: string[] = [];
        components.forEach((_: any, constructor: any) => {
            componentNames.push(constructor.name);
        });

        return componentNames;
    } catch (e) {
        console.error(
            '[Three.js ECS Inspector] Error getting entity components:',
            e,
        );
        return [];
    }
}

export function getComponent(entityId: any, componentName: string) {
    if (!bridgeState.appWorld) return null;

    try {
        const component = bridgeState.appWorld.getComponentByName?.(
            entityId,
            componentName,
        );
        if (!component) return null;

        return serializeObject(component, 0, 3);
    } catch (e) {
        console.error('[Three.js ECS Inspector] Error getting component:', e);
        return null;
    }
}

export function queryEntities(componentTypes: string[]) {
    if (!bridgeState.appWorld) return [];

    try {
        // This depends on how your ECS allows querying entities
        // We'll use a simplified approach

        const entities = getEntitiesList();
        return entities
            .filter((entity: { components: string | string[] }) => {
                // Check if entity has all required components
                return componentTypes.every((componentType) =>
                    entity.components.includes(componentType),
                );
            })
            .map((entity: { id: any }) => entity.id);
    } catch (e) {
        console.error('[Three.js ECS Inspector] Error querying entities:', e);
        return [];
    }
}



export function getEntitiesList() {
    if (!bridgeState.appWorld) return [];

    try {
        if (typeof bridgeState.appWorld.getAllEntitiesWithName === 'function') {
            // Use built-in method if available
            return bridgeState.appWorld.getAllEntitiesWithName().map((entity: any) => ({
                id: entity.id,
                name: entity.name,
                components:
                    typeof bridgeState.appWorld!.getEntityComponentNames === 'function'
                        ? bridgeState.appWorld!.getEntityComponentNames(entity.id)
                        : [],
            }));
        } else {
            // Fallback: Try to extract entities from the world
            const entities: any[] = [];

            if (bridgeState.appWorld.entities && bridgeState.appWorld.getEntities() instanceof Map) {
                bridgeState.appWorld.entities.forEach(
                    (components: any, entityId: any) => {
                        // Try to get a name for the entity
                        let name = `Entity_${entityId}`;

                        // Look for a name component
                        components.forEach(
                            (component: any, constructor: any) => {
                                if (
                                    constructor.name === 'NameComponent' &&
                                    component.name
                                ) {
                                    name = component.name;
                                }
                            },
                        );

                        // Get component names
                        const componentNames: string[] = [];
                        components.forEach((_: any, constructor: any) => {
                            componentNames.push(constructor.name);
                        });

                        entities.push({
                            id: entityId,
                            name,
                            components: componentNames,
                        });
                    },
                );
            }

            return entities;
        }
    } catch (e) {
        console.error(
            '[Three.js ECS Inspector] Error getting entities list:',
            e,
        );
        return [];
    }
}
