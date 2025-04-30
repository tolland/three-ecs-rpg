/**
 * Bridge script injected into the page to access Three.js and ECS objects
 * This script runs in the page context and can access the application's objects
 */

// Define the serializer directly in this file since it will be injected as a standalone script
const serializeObject = (obj: any, depth = 0, maxDepth = 3): any => {
    // Handle null and undefined
    if (obj === null || obj === undefined) {
        return obj;
    }

    // Handle primitive types
    if (typeof obj !== 'object' && typeof obj !== 'function') {
        return obj;
    }

    // Prevent circular references and too deep objects
    if (depth > maxDepth) {
        return '[MaxDepth]';
    }

    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map((item) => serializeObject(item, depth + 1, maxDepth));
    }

    // Handle dates
    if (obj instanceof Date) {
        return { __type: 'Date', value: obj.toISOString() };
    }

    // Handle Three.js specific types
    if (obj.isVector2) {
        return { __type: 'Vector2', x: obj.x, y: obj.y };
    }

    if (obj.isVector3) {
        return { __type: 'Vector3', x: obj.x, y: obj.y, z: obj.z };
    }

    if (obj.isEuler) {
        return {
            __type: 'Euler',
            x: obj.x,
            y: obj.y,
            z: obj.z,
            order: obj.order,
        };
    }

    if (obj.isQuaternion) {
        return { __type: 'Quaternion', x: obj.x, y: obj.y, z: obj.z, w: obj.w };
    }

    if (obj.isMatrix4) {
        return { __type: 'Matrix4', elements: [...obj.elements] };
    }

    if (obj.isMatrix3) {
        return { __type: 'Matrix3', elements: [...obj.elements] };
    }

    if (obj.isColor) {
        return { __type: 'Color', r: obj.r, g: obj.g, b: obj.b };
    }

    // Handle Three.js Object3D objects
    if (
        obj.type &&
        typeof obj.uuid === 'string' &&
        typeof obj.isObject3D !== 'undefined'
    ) {
        const result: any = {
            uuid: obj.uuid,
            name: obj.name || '',
            type: obj.type,
            visible: !!obj.visible,
            childCount: Array.isArray(obj.children) ? obj.children.length : 0,
        };

        // Add position, rotation, scale if available
        if (obj.position) {
            result.position = {
                x: obj.position.x,
                y: obj.position.y,
                z: obj.position.z,
            };
        }

        if (obj.rotation) {
            result.rotation = {
                x: obj.rotation.x,
                y: obj.rotation.y,
                z: obj.rotation.z,
                order: obj.rotation.order,
            };
        }

        if (obj.scale) {
            result.scale = {
                x: obj.scale.x,
                y: obj.scale.y,
                z: obj.scale.z,
            };
        }

        return result;
    }

    // Handle special ECS components
    if (obj && obj.constructor && obj.constructor.name === 'Component') {
        return {
            __type: 'Component',
            componentType: obj.constructor.name,
            data: serializeObject(obj, depth + 1, maxDepth),
        };
    }

    // Handle Maps and Sets
    if (obj instanceof Map) {
        return {
            __type: 'Map',
            value: Array.from(obj.entries()).map(([k, v]) => [
                serializeObject(k, depth + 1, maxDepth),
                serializeObject(v, depth + 1, maxDepth),
            ]),
        };
    }

    if (obj instanceof Set) {
        return {
            __type: 'Set',
            value: Array.from(obj).map((item) =>
                serializeObject(item, depth + 1, maxDepth),
            ),
        };
    }

    // Handle regular objects
    const result: Record<string, any> = {};

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            // Skip private properties starting with underscore
            if (key.startsWith('_')) continue;

            try {
                const value = obj[key];

                // Skip functions
                if (typeof value === 'function') continue;

                // Serialize the value
                result[key] = serializeObject(value, depth + 1, maxDepth);
            } catch (e) {
                // Handle errors during serialization
                const errorMsg =
                    e instanceof Error ? e.message : 'Unknown error';
                result[key] = `[Error: ${errorMsg}]`;
            }
        }
    }

    return result;
};

(function () {
    // Initialize communication
    console.log('[Three.js ECS Inspector] Bridge script loaded');

    // Flag to track if DevTools is connected
    let devToolsConnected = false;

    // Store references to important objects from the application
    let appScene: any = null;
    let appRenderer: any = null;
    let appWorld: any = null;
    let appEcsDebug: any = null;

    // Update interval settings
    const ACTIVE_UPDATE_INTERVAL = 500; // ms
    const INACTIVE_UPDATE_INTERVAL = 2000; // ms

    // Use TimeoutId type from our global definitions
    let updateInterval: TimeoutId | null = null;
    let lastUpdateTime = 0;

    // Find objects in window
    function findAppObjects() {
        // Find scene
        if (window.__ecsDebug) {
            appEcsDebug = window.__ecsDebug;
            console.log('[Three.js ECS Inspector] Found __ecsDebug object');
        }

        // Use the debug object to find other objects
        if (appEcsDebug && appEcsDebug.managers) {
            // Refresh managers to ensure we have the latest
            if (typeof appEcsDebug.refreshManagers === 'function') {
                appEcsDebug.refreshManagers();
            }

            // Iterate through managers to find important ones
            appEcsDebug.managers.forEach((manager: any, name: string) => {
                if (name === 'ManagerRegistry') {
                    console.log(
                        '[Three.js ECS Inspector] Found ManagerRegistry',
                    );
                }

                // Look for SceneManager or similar
                if (name.includes('Scene') && manager.scene) {
                    appScene = manager.scene;
                    console.log('[Three.js ECS Inspector] Found scene object');
                }

                // Look for Renderer
                if (name.includes('Render') && manager.renderer) {
                    appRenderer = manager.renderer;
                    console.log(
                        '[Three.js ECS Inspector] Found renderer object',
                    );
                }

                // Look for World
                if (manager.world) {
                    appWorld = manager.world;
                    console.log('[Three.js ECS Inspector] Found world object');
                }
            });
        }

        // If we didn't find objects through ECS debug, try to find them directly
        if (!appScene && window.scene) {
            appScene = window.scene;
            console.log('[Three.js ECS Inspector] Found scene in window');
        }

        if (!appRenderer && window.renderer) {
            appRenderer = window.renderer;
            console.log('[Three.js ECS Inspector] Found renderer in window');
        }

        if (!appWorld && window.world) {
            appWorld = window.world;
            console.log('[Three.js ECS Inspector] Found world in window');
        }

        return {
            foundScene: !!appScene,
            foundRenderer: !!appRenderer,
            foundWorld: !!appWorld,
            foundEcsDebug: !!appEcsDebug,
        };
    }

    // Process messages from content script
    function handleMessage(message: any) {
        if (!message || !message.type) return;

        switch (message.type) {
            case 'connected':
                console.log('[Three.js ECS Inspector] DevTools connected');
                devToolsConnected = true;
                startUpdates();
                // Send initial state
                sendInitialState();
                break;

            case 'disconnected':
                console.log('[Three.js ECS Inspector] DevTools disconnected');
                devToolsConnected = false;
                stopUpdates();
                break;

            case 'request':
                handleRequest(message);
                break;

            case 'command':
                handleCommand(message);
                break;
        }
    }

    // Send initial state to DevTools
    function sendInitialState() {
        // Find app objects if not already found
        if (!appScene || !appRenderer || !appWorld) {
            const foundObjects = findAppObjects();

            // If we still don't have all objects, send what we found
            sendMessage({
                type: 'initialize',
                status: 'partial',
                foundObjects,
                timestamp: Date.now(),
            });
        } else {
            // Send full initialization
            sendMessage({
                type: 'initialize',
                status: 'complete',
                timestamp: Date.now(),
            });

            // Send initial data for each section
            sendSceneData();
            sendEntityData();
            sendSystemData();
            sendStatsData();
        }
    }

    // Handle requests from DevTools
    function handleRequest(message: any) {
        if (!message.target || !message.action) return;

        const { target, action, id, params } = message;
        let responseData: any = null;
        let error: string | null = null;

        try {
            switch (target) {
                case 'scene':
                    responseData = handleSceneRequest(action, params);
                    break;

                case 'entities':
                    responseData = handleEntityRequest(action, params);
                    break;

                case 'components':
                    responseData = handleComponentRequest(action, params);
                    break;

                case 'systems':
                    responseData = handleSystemRequest(action, params);
                    break;

                case 'world':
                    responseData = handleWorldRequest(action, params);
                    break;

                default:
                    error = `Unknown target: ${target}`;
            }
        } catch (e) {
            error = e instanceof Error ? e.message : 'Unknown error';
        }

        // Send response
        sendMessage({
            type: 'response',
            requestId: id,
            data: responseData,
            error,
            timestamp: Date.now(),
        });
    }

    // Handle scene requests
    function handleSceneRequest(action: string, params?: any) {
        if (!appScene) {
            throw new Error('Scene not found');
        }

        switch (action) {
            case 'getObjectById':
                if (!params || !params.uuid)
                    throw new Error('Missing uuid parameter');
                return serializeObject(findObjectByUUID(params.uuid));

            case 'getObjectProperties':
                if (!params || !params.uuid)
                    throw new Error('Missing uuid parameter');
                const obj = findObjectByUUID(params.uuid);
                return serializeObject(obj, 0, 1);

            case 'getHierarchy':
                return serializeSceneHierarchy();

            default:
                throw new Error(`Unknown scene action: ${action}`);
        }
    }

    // Handle entity requests
    function handleEntityRequest(action: string, params?: any) {
        if (!appWorld) {
            throw new Error('World not found');
        }

        switch (action) {
            case 'getAll':
                return getEntitiesList();

            case 'getById':
                if (!params || params.id === undefined)
                    throw new Error('Missing id parameter');
                return getEntityById(params.id);

            case 'getComponents':
                if (!params || params.id === undefined)
                    throw new Error('Missing id parameter');
                return getEntityComponents(params.id);

            default:
                throw new Error(`Unknown entity action: ${action}`);
        }
    }

    // Handle component requests
    function handleComponentRequest(action: string, params?: any) {
        if (!appWorld) {
            throw new Error('World not found');
        }

        switch (action) {
            case 'get':
                if (
                    !params ||
                    params.entityId === undefined ||
                    !params.componentName
                ) {
                    throw new Error(
                        'Missing entityId or componentName parameter',
                    );
                }
                return getComponent(params.entityId, params.componentName);

            case 'update':
                if (
                    !params ||
                    params.entityId === undefined ||
                    !params.componentName ||
                    !params.data
                ) {
                    throw new Error('Missing parameters for component update');
                }
                return updateComponent(
                    params.entityId,
                    params.componentName,
                    params.data,
                );

            default:
                throw new Error(`Unknown component action: ${action}`);
        }
    }

    // Handle system requests
    function handleSystemRequest(action: string, params?: any) {
        if (!appWorld) {
            throw new Error('World not found');
        }

        switch (action) {
            case 'getAll':
                return getSystemsList();

            case 'getByName':
                if (!params || !params.name)
                    throw new Error('Missing name parameter');
                return getSystemByName(params.name);

            default:
                throw new Error(`Unknown system action: ${action}`);
        }
    }

    // Handle world requests
    function handleWorldRequest(action: string, params?: any) {
        if (!appWorld) {
            throw new Error('World not found');
        }

        switch (action) {
            case 'getState':
                return serializeObject(appWorld, 0, 1);

            case 'queryEntities':
                if (!params || !params.componentTypes)
                    throw new Error('Missing componentTypes parameter');
                return queryEntities(params.componentTypes);

            default:
                throw new Error(`Unknown world action: ${action}`);
        }
    }

    // Handle commands from DevTools
    function handleCommand(message: any) {
        const { command, params } = message;

        switch (command) {
            case 'highlight':
                highlightObject(params.uuid);
                break;

            case 'toggleVisibility':
                toggleObjectVisibility(params.uuid);
                break;

            case 'refreshAll':
                sendInitialState();
                break;

            // Add other commands as needed
        }
    }

    // Start sending periodic updates
    function startUpdates() {
        if (updateInterval) {
            clearInterval(updateInterval as number);
        }

        updateInterval = setInterval(() => {
            if (devToolsConnected) {
                sendUpdates();
            }
        }, ACTIVE_UPDATE_INTERVAL);
    }

    // Stop sending updates
    function stopUpdates() {
        if (updateInterval) {
            clearInterval(updateInterval as number);
            updateInterval = null;
        }
    }

    // Send periodic updates
    function sendUpdates() {
        const now = Date.now();

        // Throttle updates
        if (now - lastUpdateTime < ACTIVE_UPDATE_INTERVAL) {
            return;
        }

        lastUpdateTime = now;

        // Only send if we have the objects and DevTools is connected
        if (devToolsConnected) {
            if (appScene) sendSceneData();
            if (appWorld) {
                sendEntityData();
                sendSystemData();
            }
            if (appRenderer) sendStatsData();
        }
    }

    // Helper functions for sending specific data types

    function sendSceneData() {
        if (!appScene) return;

        try {
            const hierarchy = serializeSceneHierarchy();

            sendMessage({
                type: 'update',
                target: 'scene',
                data: { hierarchy },
                timestamp: Date.now(),
            });
        } catch (e) {
            console.error(
                '[Three.js ECS Inspector] Error sending scene data:',
                e,
            );
        }
    }

    function sendEntityData() {
        if (!appWorld) return;

        try {
            const entities = getEntitiesList();

            sendMessage({
                type: 'update',
                target: 'entities',
                data: { entities },
                timestamp: Date.now(),
            });
        } catch (e) {
            console.error(
                '[Three.js ECS Inspector] Error sending entity data:',
                e,
            );
        }
    }

    function sendSystemData() {
        if (!appWorld) return;

        try {
            const systems = getSystemsList();
            const active = systems
                .filter((system: any) => system.active)
                .map((system: any) => system.name);

            sendMessage({
                type: 'update',
                target: 'systems',
                data: { systems, active },
                timestamp: Date.now(),
            });
        } catch (e) {
            console.error(
                '[Three.js ECS Inspector] Error sending system data:',
                e,
            );
        }
    }

    function sendStatsData() {
        if (!appRenderer) return;

        try {
            // Get basic stats
            const memory = appRenderer.info?.memory || {
                geometries: 0,
                textures: 0,
            };

            // Get performance data
            const performance = window.performance || {};
            // Type assertion to handle browser performance.memory which may not be in all typings
            const memory2 = (performance as any).memory || {
                usedJSHeapSize: 0,
                totalJSHeapSize: 0,
                jsHeapSizeLimit: 0,
            };

            // Get FPS (simplified calculation)
            const fps = calculateFPS();

            // Get system timing if available
            const timing: Record<string, number> = {};
            if (appWorld && appWorld.systems) {
                appWorld.systems.forEach((system: any) => {
                    if (system._lastExecutionTime !== undefined) {
                        timing[system.constructor.name] =
                            system._lastExecutionTime;
                    }
                });
            }

            sendMessage({
                type: 'update',
                target: 'stats',
                data: {
                    fps,
                    memory: {
                        geometries: memory.geometries,
                        textures: memory.textures,
                        jsHeap: memory2.usedJSHeapSize,
                        jsHeapTotal: memory2.totalJSHeapSize,
                        jsHeapLimit: memory2.jsHeapSizeLimit,
                    },
                    timing,
                },
                timestamp: Date.now(),
            });
        } catch (e) {
            console.error(
                '[Three.js ECS Inspector] Error sending stats data:',
                e,
            );
        }
    }

    // Helper function to calculate approximate FPS
    let lastFrameTime = 0;
    let frameCount = 0;
    let fps = 0;

    function calculateFPS() {
        const now = performance.now();
        frameCount++;

        if (now - lastFrameTime >= 1000) {
            fps = frameCount;
            frameCount = 0;
            lastFrameTime = now;
        }

        return fps;
    }

    // Helper functions for accessing Three.js and ECS objects

    function serializeSceneHierarchy(root?: any) {
        const scene = root || appScene;
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

    function findObjectByUUID(uuid: string) {
        if (!appScene) return null;

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

        return findNode(appScene);
    }

    function highlightObject(uuid: string) {
        const object = findObjectByUUID(uuid);
        if (!object) return;

        // This is a placeholder - in a real implementation, you would
        // implement visual highlighting of the object in the scene
        console.log(
            `[Three.js ECS Inspector] Highlighting object: ${object.name || 'Unnamed'}`,
        );

        // Example: temporarily change the object's color
        const originalMaterial = object.material;
        if (originalMaterial) {
            const originalColor = originalMaterial.color
                ? originalMaterial.color.clone()
                : null;

            // Change to highlight color
            if (originalMaterial.color) {
                originalMaterial.color.set(0xff00ff); // Magenta highlight

                // Reset after a delay
                setTimeout(() => {
                    if (originalColor)
                        originalMaterial.color.copy(originalColor);
                }, 1000);
            }
        }
    }

    function toggleObjectVisibility(uuid: string) {
        const object = findObjectByUUID(uuid);
        if (!object) return;

        // Toggle visibility
        object.visible = !object.visible;

        // Notify change
        sendMessage({
            type: 'objectChanged',
            uuid: object.uuid,
            property: 'visible',
            value: object.visible,
            timestamp: Date.now(),
        });
    }

    // ECS related helper functions

    function getEntitiesList() {
        if (!appWorld) return [];

        try {
            if (typeof appWorld.getAllEntitiesWithName === 'function') {
                // Use built-in method if available
                return appWorld.getAllEntitiesWithName().map((entity: any) => ({
                    id: entity.id,
                    name: entity.name,
                    components:
                        typeof appWorld.getEntityComponentNames === 'function'
                            ? appWorld.getEntityComponentNames(entity.id)
                            : [],
                }));
            } else {
                // Fallback: Try to extract entities from the world
                const entities: any[] = [];

                if (appWorld.entities && appWorld.entities instanceof Map) {
                    appWorld.entities.forEach(
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

    function getEntityById(entityId: any) {
        if (!appWorld) return null;

        try {
            const components = appWorld.getEntityComponents?.(entityId);
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

    function getEntityComponents(entityId: any) {
        if (!appWorld) return [];

        try {
            // Try to get component names via the dedicated method
            if (typeof appWorld.getEntityComponentNames === 'function') {
                return appWorld.getEntityComponentNames(entityId);
            }

            // Fallback: Try to extract from entity components map
            const components = appWorld.getEntityComponents?.(entityId);
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

    function getComponent(entityId: any, componentName: string) {
        if (!appWorld) return null;

        try {
            const component = appWorld.getComponentByName?.(
                entityId,
                componentName,
            );
            if (!component) return null;

            return serializeObject(component, 0, 3);
        } catch (e) {
            console.error(
                '[Three.js ECS Inspector] Error getting component:',
                e,
            );
            return null;
        }
    }

    function updateComponent(entityId: any, componentName: string, data: any) {
        if (!appWorld) return false;

        try {
            // This depends on how your ECS system allows component updates
            const component = appWorld.getComponentByName?.(
                entityId,
                componentName,
            );
            if (!component) return false;

            // If there's a dedicated method for updating components
            if (typeof appWorld.setComponentDataFromJson === 'function') {
                return appWorld.setComponentDataFromJson(
                    entityId,
                    componentName,
                    JSON.stringify(data),
                );
            }

            // Otherwise, try to update properties directly
            for (const key in data) {
                if (
                    Object.prototype.hasOwnProperty.call(data, key) &&
                    component[key] !== undefined
                ) {
                    component[key] = data[key];
                }
            }

            return true;
        } catch (e) {
            console.error(
                '[Three.js ECS Inspector] Error updating component:',
                e,
            );
            return false;
        }
    }

    function getSystemsList() {
        if (!appWorld || !appWorld.systems) return [];

        try {
            return appWorld.systems.map((system: any) => {
                // Basic system info
                const result: any = {
                    name: system.constructor.name,
                    active: true, // Assuming all systems are active by default
                    executionTime: system._lastExecutionTime || 0,
                };

                // Try to get more info if available
                if (typeof system.getEntitiesCount === 'function') {
                    result.entities = system.getEntitiesCount();
                }

                return result;
            });
        } catch (e) {
            console.error(
                '[Three.js ECS Inspector] Error getting systems list:',
                e,
            );
            return [];
        }
    }

    function getSystemByName(name: string) {
        if (!appWorld || !appWorld.systems) return null;

        try {
            const system = appWorld.systems.find(
                (s: any) => s.constructor.name === name,
            );
            if (!system) return null;

            return serializeObject(system, 0, 2);
        } catch (e) {
            console.error('[Three.js ECS Inspector] Error getting system:', e);
            return null;
        }
    }

    function queryEntities(componentTypes: string[]) {
        if (!appWorld) return [];

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
            console.error(
                '[Three.js ECS Inspector] Error querying entities:',
                e,
            );
            return [];
        }
    }

    // Communication with the content script
    function sendMessage(message: any) {
        window.postMessage(
            {
                source: 'three-ecs-bridge',
                data: message,
            },
            '*',
        );
    }

    function logConnectionStatus() {
        console.log('[Bridge] Connection status:', {
            appScene: !!appScene,
            appRenderer: !!appRenderer,
            appWorld: !!appWorld,
            appEcsDebug: !!appEcsDebug,
            devToolsConnected: devToolsConnected,
        });
    }

    // Set up message listener
    window.addEventListener('message', (event) => {
        // Only handle messages from the content script
        if (event.data && event.data.source === 'three-ecs-devtools') {
            handleMessage(event.data.data);
        }
    });

    // Try to find app objects immediately
    findAppObjects();

    setInterval(logConnectionStatus, 5000);

    // Notify that bridge is ready
    sendMessage({
        type: 'bridge-ready',
        timestamp: Date.now(),
    });
})();
