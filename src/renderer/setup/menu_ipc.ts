import { worldConfigManager } from '@renderer/core';
import { WorldBuilder } from '@setup/WorldBuilder';
import { World } from '@ecs/World';
import { Scene } from 'three';
import { CameraSystem, CollisionSystem } from '@ecs/systems';
import { createInitialView } from '@renderer/prefabs';


/**
 * Setup listeners for file menu events from Electron
 */
export function setupFileMenuListeners(
    builder: WorldBuilder,
    ecsWorld: World,
    threeScene: Scene,
    collisionSys: CollisionSystem,
    cameraSys: CameraSystem,
) {
    // Setup listener for 'new-world' menu event
    const cleanupNewWorld = window.electronIPC.on('new-world', async () => {
        try {
            console.log('Creating new world from default template');
            const defaultConfig = worldConfigManager.createDefaultConfig();

            // Clear current scene/world
            // This would be more complex in a real application with proper cleanup
            threeScene.clear();
            ecsWorld.clear();

            // Build world from default config
            await builder.buildFromConfig(
                defaultConfig,
                ecsWorld,
                threeScene,
                collisionSys,
                cameraSys,
            );
            createInitialView(ecsWorld, cameraSys);

            console.log('New world created successfully');
        } catch (error) {
            console.error('Failed to create new world:', error);
        }
    });

    // Setup listener for 'open-world' menu event
    const cleanupOpenWorld = window.electronIPC.on('open-world', async () => {
        try {
            console.log('Opening world configuration...');

            // Open file dialog and load configuration
            const config = await worldConfigManager.openConfigViaDialog();

            // Clear current scene/world
            ecsWorld.clear();
            threeScene.clear();

            // Build world from loaded config
            await builder.buildFromConfig(
                config,
                ecsWorld,
                threeScene,
                collisionSys,
                cameraSys,
            );

            createInitialView(ecsWorld, cameraSys);



            console.log('World loaded successfully');
        } catch (error) {
            if (
                error instanceof Error &&
                error.message === 'File dialog was canceled'
            ) {
                console.log('Open operation canceled by user');
            } else {
                console.error('Failed to open world:', error);
            }
        }
    });

    // Setup listener for 'save-world' menu event
    const cleanupSaveWorld = window.electronIPC.on('save-world', async () => {
        try {
            console.log('Saving world configuration...');

            // If we have a current path, save to it, otherwise do Save As
            if (worldConfigManager.getConfigPath()) {
                await worldConfigManager.saveConfig();
                console.log('World saved successfully');
            } else {
                // No current path, use Save As dialog
                await worldConfigManager.saveConfigViaDialog();
                console.log('World saved successfully with new filename');
            }
        } catch (error) {
            if (
                error instanceof Error &&
                error.message === 'File dialog was canceled'
            ) {
                console.log('Save operation canceled by user');
            } else {
                console.error('Failed to save world:', error);
            }
        }
    });

    // Setup listener for 'save-world-as' menu event
    const cleanupSaveWorldAs = window.electronIPC.on(
        'save-world-as',
        async () => {
            try {
                console.log('Saving world configuration as...');

                // Use Save As dialog
                await worldConfigManager.saveConfigViaDialog();
                console.log('World saved successfully with new filename');
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.message === 'File dialog was canceled'
                ) {
                    console.log('Save As operation canceled by user');
                } else {
                    console.error('Failed to save world:', error);
                }
            }
        },
    );

    // Return a cleanup function that removes all listeners
    return () => {
        cleanupNewWorld();
        cleanupOpenWorld();
        cleanupSaveWorld();
        cleanupSaveWorldAs();
    };
}

