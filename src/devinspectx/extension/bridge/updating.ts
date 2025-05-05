import { bridgeState } from '@bridge/bridge_state';
import { serializeSceneHierarchy } from '@bridge/serialize_scene';
import { sendMessage } from '@bridge/send_message';
import { findObjectByUUID, getEntitiesList } from '@bridge/finding_objects';
import { getSystemsList } from '@bridge/get_objects';
import { findAppObjects } from '@bridge/find_app_objects';


// Update interval settings
const ACTIVE_UPDATE_INTERVAL = 500; // ms
const INACTIVE_UPDATE_INTERVAL = 2000; // ms

// Use TimeoutId type from our global definitions
let updateInterval: TimeoutId | null = null;
let lastUpdateTime = 0;

export function updateComponent(entityId: any, componentName: string, data: any) {
    if (!bridgeState.appWorld) return false;

    try {
        // This depends on how your ECS system allows component updates
        const component = bridgeState.appWorld.getComponentByName?.(
            entityId,
            componentName,
        );
        if (!component) return false;

        // If there's a dedicated method for updating components
        if (typeof bridgeState.appWorld.setComponentDataFromJson === 'function') {
            return bridgeState.appWorld.setComponentDataFromJson(
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



// Send initial state to DevTools
export  function sendInitialState() {
    // Find app objects if not already found
    if (!bridgeState.appScene || !bridgeState.appRenderer || !bridgeState.appWorld) {
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


// Handle commands from DevTools
export function handleCommand(message: any) {
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
export function startUpdates() {
    if (updateInterval) {
        clearInterval(updateInterval as number);
    }

    updateInterval = setInterval(() => {
        if (bridgeState.devToolsConnected) {
            sendUpdates();
        }
    }, ACTIVE_UPDATE_INTERVAL);
}

// Stop sending updates
export function stopUpdates() {
    if (updateInterval) {
        clearInterval(updateInterval as number);
        updateInterval = null;
    }
}

// Send periodic updates
export function sendUpdates() {
    const now = Date.now();

    // Throttle updates
    if (now - lastUpdateTime < ACTIVE_UPDATE_INTERVAL) {
        return;
    }

    lastUpdateTime = now;

    // Only send if we have the objects and DevTools is connected
    if (bridgeState.devToolsConnected) {
        if (bridgeState.appScene) sendSceneData();
        if (bridgeState.appWorld) {
            sendEntityData();
            sendSystemData();
        }
        if (bridgeState.appRenderer) sendStatsData();
    }
}

// Helper functions for sending specific data types

export function sendSceneData() {
    if (!bridgeState.appScene) return;

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

export function sendEntityData() {
    if (!bridgeState.appWorld) return;

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

export function sendSystemData() {
    if (!bridgeState.appWorld) return;

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

export function sendStatsData() {
    if (!bridgeState.appRenderer) return;

    try {
        // Get basic stats
        const memory = bridgeState.appRenderer.info?.memory || {
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
        if (bridgeState.appWorld && bridgeState.appWorld.systems) {
            bridgeState.appWorld.systems.forEach((system: any) => {
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

export function highlightObject(uuid: string) {
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

export function toggleObjectVisibility(uuid: string) {
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

