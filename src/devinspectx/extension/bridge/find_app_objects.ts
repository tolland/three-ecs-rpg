import { bridgeState } from '@bridge/bridge_state';


export function findAppObjects() {
    // Find scene

    if (window.__ecsDebug) {
        bridgeState.appEcsDebug = window.__ecsDebug;
        console.log('[Three.js ECS Inspector] Found __ecsDebug object');
    }

    // Use the debug object to find other objects
    if (bridgeState.appEcsDebug && bridgeState.appEcsDebug.managers) {
        // Refresh managers to ensure we have the latest
        if (typeof bridgeState.appEcsDebug.refreshManagers === 'function') {
            bridgeState.appEcsDebug.refreshManagers();
        }

        // Iterate through managers to find important ones
        bridgeState.appEcsDebug.managers.forEach((manager: any, name: string) => {
            if (name === 'ManagerRegistry') {
                console.log('[Three.js ECS Inspector] Found ManagerRegistry');
            }

            // Look for SceneManager or similar
            if (name.includes('Scene') && manager.scene) {
                bridgeState.appScene = manager.scene;
                console.log('[Three.js ECS Inspector] Found scene object');
            }

            // Look for Renderer
            if (name.includes('Render') && manager.renderer) {
                bridgeState.appRenderer = manager.renderer;
                console.log('[Three.js ECS Inspector] Found renderer object');
            }

            // Look for World
            if (manager.world) {
                bridgeState.appWorld = manager.world;
                console.log('[Three.js ECS Inspector] Found world object %O', bridgeState.appWorld);
            }
        });
    }

    // If we didn't find objects through ECS debug, try to find them directly
    if (!bridgeState.appScene && window.scene) {
        bridgeState.appScene = window.scene;
        console.log('[Three.js ECS Inspector] Found scene in window');
    }

    if (!bridgeState.appRenderer && window.renderer) {
        bridgeState.appRenderer = window.renderer;
        console.log('[Three.js ECS Inspector] Found renderer in window');
    }

    if (!bridgeState.appWorld && window.world) {
        bridgeState.appWorld = window.world;
        console.log('[Three.js ECS Inspector] Found world in window %O', bridgeState.appWorld);
    }

    return {
        foundScene: !!bridgeState.appScene,
        foundRenderer: !!bridgeState.appRenderer,
        foundWorld: !!bridgeState.appWorld,
        foundEcsDebug: !!bridgeState.appEcsDebug,
    };
}
