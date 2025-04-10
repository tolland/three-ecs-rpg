import { AppEventManager, GameLoop, UberConfigManager } from '@renderer/core';
import { AppAction } from '@shared/core';
import {
    CameraMode,
    CameraTargetComponent,
    ColliderComponent,
    GodModeComponent,
    InputControllableComponent,
    NameComponent,
    PlayerControlledComponent,
    PositionComponent,
    VelocityComponent,
} from '@ecs/components';
import * as THREE from 'three';
import { simulationConfigManager } from '@core/SimulationConfigManager';
import { scene } from '@core/sceneManager';
import {
    CameraSystem,
    DebugVisualsSystem,
    InputSystem,
    ViewportLayoutSystem,
} from '@ecs/systems';
import { World } from '@ecs/World';
import { Entity } from '@ecs/Entity';
import { ViewConfiguration } from '@core/ViewConfiguration';

// Toggle HUDs (Example - assumes you have corresponding systems/logic)
let isDebugHudVisible = true; // Keep track of state
const debugHudElement = document.getElementById('debug-hud');

export function initAppEventManager(
    eventManager: AppEventManager,
    gameLoop: GameLoop,
    debugVisualsSystem: DebugVisualsSystem,
    world: World,
    inputSystem: InputSystem,
    cameraSystem: CameraSystem,
    container: HTMLElement,
    uberConfigManager: UberConfigManager,
    cleanupControlListener: (() => void) | undefined,
    cleanupConfigListener: (() => void) | undefined,
) {
    // --- Need references to systems ---
    const layoutSystem = world.getSystem(ViewportLayoutSystem)!;

    // Initialize the AppEventManager

    // Handle reload notification
    eventManager.on(AppAction.RELOAD, () => {
        console.log('Renderer: Preparing for reload...');
        if (cleanupControlListener) cleanupControlListener();
        if (cleanupConfigListener) cleanupConfigListener();
        gameLoop.stop();
        scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach((material) =>
                            material.dispose(),
                        );
                    } else {
                        object.material.dispose();
                    }
                }
            }
        });
        console.log('Renderer: Cleanup complete, ready for reload');
    });

    eventManager.on(AppAction.TOGGLE_DEBUG_HUD, () => {
        isDebugHudVisible = !isDebugHudVisible;
        if (debugHudElement) {
            debugHudElement.style.display = isDebugHudVisible
                ? 'block'
                : 'none'; // Or toggle a class
        }
        console.log('Debug HUD toggled:', isDebugHudVisible);
    });
    // Add similar handler for TOGGLE_MAP_HUD

    // Pause Game
    eventManager.on(AppAction.PAUSE_GAME, () => {
        gameLoop.togglePause(); // Add a togglePause method to GameLoop
        console.log('Game Paused:', gameLoop.isPaused()); // Add isPaused method
        // Optional: Show/hide a pause menu overlay
    });

    eventManager.on(AppAction.TOGGLE_DEBUG_VISUALS, () => {
        debugVisualsSystem.toggle(); // Call the toggle method on the system
    });

    // Switch Player Control
    eventManager.on(AppAction.SWITCH_PLAYER_CONTROL, () => {
        console.log('Attempting to switch control via event...');
        // --- Paste the existing KeyP logic here ---
        const playerEntities = world.queryEntities([PlayerControlledComponent]);
        const npcEntities = world.queryEntities([CameraTargetComponent]); // Find potential NPCs

        if (playerEntities.length > 0 && npcEntities.length > 0) {
            const currentPcEntity = playerEntities[0];
            // Find the NPC entity (assuming it's the first one found with CameraTarget that isn't the player)
            let targetNpcEntity = -1;
            for (const npc of npcEntities) {
                if (
                    npc !== currentPcEntity &&
                    world.hasComponent(npc, ColliderComponent)
                ) {
                    // Make sure it's not player and is collidable
                    targetNpcEntity = npc;
                    break;
                }
            }
            if (targetNpcEntity !== -1) {
                console.log(
                    `Switching PlayerControl from ${currentPcEntity} to ${targetNpcEntity}`,
                );

                // Remove control from current player
                world.removeComponent(
                    currentPcEntity,
                    PlayerControlledComponent,
                );
                const currentInputComp = world.getComponent(
                    currentPcEntity,
                    InputControllableComponent,
                );
                if (currentInputComp) currentInputComp.pointerLocked = false; // Release pointer lock if held

                // Add control to NPC
                if (
                    !world.hasComponent(
                        targetNpcEntity,
                        InputControllableComponent,
                    )
                ) {
                    world.addComponent(
                        targetNpcEntity,
                        new InputControllableComponent(),
                    );
                }
                world.addComponent(
                    targetNpcEntity,
                    new PlayerControlledComponent(),
                );

                // Make the main camera follow the newly controlled entity
                const playerTargetComp = world.getComponent(
                    currentPcEntity,
                    CameraTargetComponent,
                );
                const npcTargetComp = world.getComponent(
                    targetNpcEntity,
                    CameraTargetComponent,
                );

                if (playerTargetComp && playerTargetComp.cameraId === 'main') {
                    world.removeComponent(
                        currentPcEntity,
                        CameraTargetComponent,
                    );
                }
                if (!npcTargetComp || npcTargetComp.cameraId !== 'main') {
                    // Ensure the new entity has a main camera target component
                    world.addComponent(
                        targetNpcEntity,
                        new CameraTargetComponent(
                            'main',
                            npcTargetComp?.offset ||
                                new THREE.Vector3(0, 0.7, 0),
                        ),
                    );
                }
            }
        }
        // --- End of KeyP logic ---
    });

    // Camera Mode Switching
    eventManager.on(AppAction.SET_CAMERA_FIRST_PERSON, () => {
        const controlled = world.queryEntities([PlayerControlledComponent])[0];
        if (controlled !== undefined) {
            console.warn('Setting camera to first person via event');
            //cameraSystem.setCameraMode('main', CameraMode.FIRST_PERSON, controlled);
        }
    });

    eventManager.on(AppAction.SET_CAMERA_THIRD_PERSON_GLOBAL, () => {
        const controlled = world.queryEntities([PlayerControlledComponent])[0];
        if (controlled !== undefined) {
            console.warn(
                'SET_CAMERA_THIRD_PERSON_GLOBAL camera to first person via event',
            );
            // cameraSystem.setCameraMode(
            //     'main',
            //     CameraMode.THIRD_PERSON_GLOBAL,
            //     controlled,
            // );
        }
    });

    eventManager.on(AppAction.SET_CAMERA_THIRD_PERSON_ENTITY, () => {
        const controlled = world.queryEntities([PlayerControlledComponent])[0];
        if (controlled !== undefined) {
            console.warn(
                'SET_CAMERA_THIRD_PERSON_ENTITY camera to first person via event',
            );
            // cameraSystem.setCameraMode(
            //     'main',
            //     CameraMode.THIRD_PERSON_ENTITY,
            //     controlled,
            // );
        }
    });

    eventManager.on(AppAction.SPLITSCREEN_HORIZONTAL, () => {
        console.log('Setting Single Screen (Main)');
        //cameraSystem.setSingleScreen('main');
    });

    // Optional: Cycle Camera Logic
    let availableCameraIds: string[] = ['main', 'npc1']; // Example IDs
    let currentCameraIndex = 0;
    // eventManager.on(AppAction.CYCLE_CAMERA_NEXT, () => {
    //     currentCameraIndex =
    //         (currentCameraIndex + 1) % availableCameraIds.length;
    //     const nextCamId = availableCameraIds[currentCameraIndex];
    //     console.log(`Cycling camera to: ${nextCamId}`);
    //     //cameraSystem.setSingleScreen(nextCamId);
    //     isSplitScreen = false; // Cycling implies single screen view
    // });

    eventManager.on(AppAction.AREA_TRIGGER_ENTER, () => {
        console.log(`Area Trigger Entered - ${AppAction.AREA_TRIGGER_ENTER}`);
        // payload: { triggerEntityId: number, activatorEntityId: number, areaName: string, soundKey?: string }
    });

    eventManager.on(AppAction.TOGGLE_GOD_MODE, () => {
        const playerEntities = world.queryEntities([PlayerControlledComponent]);
        if (playerEntities.length > 0) {
            const playerEntity = playerEntities[0];
            const hasGodMode = world.hasComponent(
                playerEntity,
                GodModeComponent,
            );

            if (hasGodMode) {
                world.removeComponent(playerEntity, GodModeComponent);
                console.log('God mode disabled');
            } else {
                world.addComponent(playerEntity, new GodModeComponent());
                world.removeComponent(playerEntity, VelocityComponent);
                world.addComponent(playerEntity, new VelocityComponent());
                console.log('God mode enabled');
            }
        }
    });

    const TIME_SCALE_STEP = 0.1;

    eventManager.on(AppAction.INCREASE_TIME_SCALE, () => {
        const currentScale = simulationConfigManager.getTimeScale();
        uberConfigManager.set(
            'simulation.timeScale',
            currentScale + TIME_SCALE_STEP,
        );
    });

    eventManager.on(AppAction.DECREASE_TIME_SCALE, () => {
        const currentScale = simulationConfigManager.getTimeScale();
        uberConfigManager.set(
            'simulation.timeScale',
            currentScale - TIME_SCALE_STEP,
        );
    });

    eventManager.on(AppAction.RESET_TIME_SCALE, () => {
        uberConfigManager.set('simulation.timeScale', 1.0);
    });

    // --- Viewport Manipulation ---
    eventManager.on(AppAction.VIEWPORT_SPLIT_HORIZONTAL, () => {
        const focusedView = cameraSystem.getFocusedActiveView();
        if (focusedView) {
            layoutSystem.splitHorizontal(focusedView.viewportId);
        } else {
            // If no focus, split the root maybe?
            if (layoutSystem.getRootNode().type === 'leaf') {
                layoutSystem.splitHorizontal(layoutSystem.getRootNode().id);
            }
        }
    });
    eventManager.on(AppAction.VIEWPORT_SPLIT_VERTICAL, () => {
        const focusedView = cameraSystem.getFocusedActiveView();
        if (focusedView) {
            layoutSystem.splitVertical(focusedView.viewportId);
        } else {
            if (layoutSystem.getRootNode().type === 'leaf') {
                layoutSystem.splitVertical(layoutSystem.getRootNode().id);
            }
        }
    });
    eventManager.on(AppAction.VIEWPORT_MERGE_FOCUSED, () => {
        const focusedView = cameraSystem.getFocusedActiveView();
        if (focusedView) {
            layoutSystem.mergeLeaf(focusedView.viewportId);
            // Focus might need to be reset after merge
            cameraSystem.setFocus(null); // Or focus the sibling that remains
        }
    });

    // // --- Focus Cycling ---
    // let focusCycleIndex = 0;
    // eventManager.on(AppAction.VIEWPORT_CYCLE_FOCUS, () => {
    //     const leaves = layoutSystem.getActiveLeafs();
    //     if (leaves.length > 0) {
    //         focusCycleIndex = (focusCycleIndex + 1) % leaves.length;
    //         const nextLeaf = leaves[focusCycleIndex];
    //         if (nextLeaf.activeViewId) {
    //             cameraSystem.setFocus(nextLeaf.activeViewId);
    //         }
    //     }
    // });
    // Optional: Set focus on click (needs event listener on container/canvas)
    // container.addEventListener('click', (event) => {
    //      const rect = container.getBoundingClientRect();
    //      const x = (event.clientX - rect.left) / rect.width;
    //      const y = (event.clientY - rect.top) / rect.height;
    //      const clickedLeaf = layoutSystem.getLeafAtScreenCoord(x, y); // Need this method
    //      if(clickedLeaf?.activeViewId) {
    //           eventManager.emit(AppAction.VIEWPORT_SET_FOCUS, { viewportId: clickedLeaf.id });
    //      }
    // });
    // eventManager.on(AppAction.VIEWPORT_SET_FOCUS, (payload) => {
    //      const leaf = layoutSystem.findLeaf(payload.viewportId);
    //       if(leaf?.activeViewId) cameraSystem.setFocus(leaf.activeViewId);
    // });

    // --- View Configuration Cycling ---
    eventManager.on(AppAction.VIEW_CYCLE_ENTITY, () => {
        const focusedView = cameraSystem.getFocusedActiveView();
        if (!focusedView) return;
        const viewConfig = cameraSystem.getViewConfiguration(
            focusedView.viewConfigId,
        );
        if (!viewConfig) return;

        // Get list of potential target entities (e.g., player + NPCs)
        const playableEntities = world.queryEntities([
            NameComponent,
            ColliderComponent,
        ]); // Example criteria
        const currentTargetIndex = playableEntities.indexOf(
            viewConfig.targetEntity ?? -1,
        );
        const nextTargetIndex =
            (currentTargetIndex + 1) % (playableEntities.length + 1); // +1 for null/freecam option

        let nextTargetId: Entity | null = null;
        if (nextTargetIndex < playableEntities.length) {
            nextTargetId = playableEntities[nextTargetIndex];
            // If cycling into freecam, reset mode?
            if (viewConfig.mode === 'FREECAM')
                viewConfig.mode = CameraMode.THIRD_PERSON_ENTITY;
        } else {
            // Cycle to freecam
            nextTargetId = null;
            // Set reasonable freecam position based on previous target?
            if (viewConfig.targetEntity !== null) {
                const lastPos = world.getComponent(
                    viewConfig.targetEntity,
                    PositionComponent,
                );
                if (lastPos)
                    viewConfig.freecamPosition
                        .copy(lastPos.value)
                        .add(new THREE.Vector3(0, 5, 5));
            }
            viewConfig.mode = 'FREECAM';
        }

        // Update the view configuration
        cameraSystem.updateViewConfiguration(viewConfig.id, {
            targetEntity: nextTargetId,
            mode: viewConfig.mode,
        });
        console.log(
            `View ${viewConfig.id}: Cycled entity to ${nextTargetId === null ? 'FREECAM' : world.getComponent(nextTargetId, NameComponent)?.name}`,
        );
    });

    eventManager.on(AppAction.VIEW_CYCLE_MODE, () => {
        const focusedView = cameraSystem.getFocusedActiveView();
        if (!focusedView) return;
        const viewConfig = cameraSystem.getViewConfiguration(
            focusedView.viewConfigId,
        );
        if (!viewConfig) return;

        console.log('got here');
        const modes: (CameraMode | 'FREECAM')[] = [
            CameraMode.FIRST_PERSON,
            CameraMode.THIRD_PERSON_ENTITY,
            CameraMode.THIRD_PERSON_GLOBAL,
            'FREECAM',
        ];

        const currentIndex = modes.indexOf(viewConfig.mode);
        const nextIndex = (currentIndex + 1) % modes.length;
        const nextMode = modes[nextIndex];

        // If switching TO freecam, clear target entity
        let updates: Partial<ViewConfiguration> = { mode: nextMode };
        if (nextMode === 'FREECAM' && viewConfig.targetEntity !== null) {
            updates.targetEntity = null;
            // Set freecam position based on current view?
            const currentCam = cameraSystem.getCameraInstance(
                focusedView.cameraId,
            );
            if (currentCam) {
                updates.freecamPosition = currentCam.position.clone();
                updates.freecamRotation = currentCam.quaternion.clone();
            }
        }
        // If switching FROM freecam, assign a default entity?
        else if (viewConfig.mode === 'FREECAM' && nextMode !== 'FREECAM') {
            const player = world.queryEntities([PlayerControlledComponent])[0];
            updates.targetEntity = player ?? null; // Assign player or null
        }

        cameraSystem.updateViewConfiguration(viewConfig.id, updates);
        console.log(`View ${viewConfig.id}: Cycled mode to ${nextMode}`);
    });

    // TODO hmm.. do we need both QUITTING and QUIT??
    eventManager.on(AppAction.QUITTING, () => {
        console.log('informed of QUITTING in renderer (Main)');
        //cameraSystem.setSingleScreen('main');
    });

    eventManager.on(AppAction.QUIT, () => {
        console.log('informed of QUITTING in renderer (Main)');
        //cameraSystem.setSingleScreen('main');
        world.destroy();
    });

    console.log('AppEventManager initialized');
}

// 'ENTITY_COLLISION_IMPACT', payload: { entityId: number, impactVelocity: number, surfaceType: 'ground' | 'wall' }
//
// 'PLAYER_ACTION', payload: { entityId: number, action: string } (e.g., action: "JUMP", "SAY_HELLO")
//
// 'AREA_TRIGGER_ENTER', payload: { triggerEntityId: number, activatorEntityId: number, areaName: string, soundKey?: string }
//
// 'AREA_TRIGGER_EXIT', payload: { triggerEntityId: number, activatorEntityId: number, areaName: string, soundKey?: string }
