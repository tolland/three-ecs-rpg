import { World } from '@ecs/World';
import { CameraSystem, CollisionSystem, ViewportLayoutSystem } from '@ecs/systems';
import { AppAction } from '@shared/core';
import { AppEventManager, UberConfigManager } from '@renderer/core';
import { Serializer } from '@shared/serialization/Serializer';
import { serializeForConsole } from '@shared/core/utils';

/**
 *
 * @TODO need to distinguish between window, game and playable entity ipc
 * calls, as would like to be able to remote control arbitrary playable entities
 *
 * @param world
 * @param cleanupControlListener
 * @param cleanupConfigListener
 * @param collisionSystem
 * @param eventManager
 * @param uberConfigManager
 * @param cameraSystem
 * @param viewPortLayoutSystem
 */
export async function setupIpc(
    world: World,
    cleanupControlListener: (() => void) | undefined,
    cleanupConfigListener: (() => void) | undefined,
    collisionSystem: CollisionSystem,
    eventManager: AppEventManager,
    uberConfigManager: UberConfigManager,
    cameraSystem: CameraSystem, // Inject CameraSystem to set the collision world
    viewPortLayoutSystem: ViewportLayoutSystem,
): Promise<void> {
    // --- Register IPC Handlers ---
    if (window.electronIPC) {


        // --- Register IPC Handlers ---
        // messages from main process that need a reply
        window.electronIPC.handleRequest('ecs:listEntities', () => {
            console.log('IPC Handler Registered: ecs:listEntities');
            return world.getAllEntitiesWithName();
        });

        window.electronIPC.handleRequest(
            'ecs:listComponents',
            ({ entityId }) => {
                console.log(
                    `IPC Handler: ecs:listComponents invoked for entity ${entityId}`,
                );
                return world.getEntityComponentNames(entityId);
            },
        );

        window.electronIPC.handleRequest(
            'ecs:setComponentValue',
            ({ entityId, componentName, value }) => {
                console.log(
                    `IPC Handler: ecs:setComponentValue invoked for entity ${entityId}`,
                );
                world.setComponentDataFromJson(entityId, componentName, value);
                return world.getComponentDataAsJson(entityId, componentName);
            },
        );

        window.electronIPC.handleRequest(
            'ecs:getComponentData',
            ({ entityId, componentName }) => {
                console.log(
                    `IPC Handler: ecs:getComponentData invoked for entity ${entityId}, component ${componentName}`,
                );
                return world.getComponentDataAsJson(entityId, componentName);
            },
        );

        // --- system debugging methods ---
        window.electronIPC.handleRequest('ecs:listSystems', () => {
            console.log(`IPC Handler: ecs:listSystems invoked`);
            console.dir(world.getSystem(CollisionSystem));
            return world.getSystemsDataAsJson();
        });

        // --- system debugging methods ---
        window.electronIPC.handleRequest('ecs:getViewportLayout', () => {
            console.log(`IPC Handler: ecs:getViewportLayout invoked`);
            // console.dir(world.getSystem(ViewportLayoutSystem));
            // console.dir(
            //     Serializer.serialize(
            //         world.getSystem(ViewportLayoutSystem),
            //     ),
            // );
            const layout = world.getSystem(ViewportLayoutSystem);
            //debugger;
            const serlializedLayout = Serializer.serializeToJSON(
                layout,
            );
            console.dir(serlializedLayout);
            return serlializedLayout;
        });

        // --- system debugging methods ---
        window.electronIPC.handleRequest(
            'ecs:getSystemData',
            ({ systemName }) => {
                console.log(`IPC Handler: ecs:getSystemData invoked`);
                const system = world.getSystemByName(systemName);
                // debugger;
                console.log(serializeForConsole(Serializer.serialize(system)));
                return Serializer.serializeToJSON(system);
            },
        );

        window.electronIPC.handleRequest('layout:getState', () =>
            viewPortLayoutSystem.getFullLayoutState(),
        );
        window.electronIPC.handleRequest(
            'layout:setState',
            ({ layoutJson }) => {
                try {
                    return viewPortLayoutSystem.loadLayoutState(
                        JSON.parse(layoutJson),
                    );
                } catch (e) {
                    console.error('Failed to parse/load layout state:', e);
                    return false;
                }
            },
        );

        // --- Listen for One-Way Control Messages ---
        cleanupControlListener = window.electronIPC.on(
            'app:control',
            ({ action, payload }) => {
                console.log(`IPC Received: app:control for action ${action}`);
                if (Object.values(AppAction).includes(action as AppAction)) {
                    eventManager.emit(action as AppAction, payload);
                } else {
                    console.warn(`Unknown app:control action: ${action}`);
                }
            },
        );

        cleanupConfigListener = window.electronIPC.on(
            'app:setConfig',
            ({ key, value }) => {
                console.log(`IPC Event Received: app:setConfig for key ${key}`);
                uberConfigManager.set(key, value);
            },
        );


    } else {
        console.error(
            'Renderer: electronIPC not found! Preload script error or contextIsolation disabled.',
        );
    }
}
