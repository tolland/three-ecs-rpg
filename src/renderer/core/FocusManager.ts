// src/renderer/core/FocusManager.ts
import { CameraSystem, ViewportLayoutSystem } from '@ecs/systems';
import { AppEventManager, appEventManager } from './AppEventManager';
import { World } from '@ecs/World';
import { AppAction } from '@shared/core';
import {
    CameraMode,
    CameraTargetComponent,
    InputControllableComponent,
    PlayerControlComponent,
} from '@ecs/components';
import { Entity } from '@ecs/Entity';
import { RegisterManager } from '@core/ManagerRegistry';
import { Manager } from '@core/types/manager';
import * as F from '@renderer/utils/chalkColors';
import { ActiveViewId, SplitDirection, ViewportID } from '@core/types/viewport';
import { Serializer } from '@shared/serialization/Serializer';
import { serializeForConsole } from '@shared/core/utils';
import { LogManager } from '@renderer/utils/ManagerLogger';
import { ViewConfiguration } from '@core/ViewConfiguration';


export const FocusManagerLoggingConfig = {
    /** Main toggle for enabling/disable all AudioManager logging */
    enabled: false,
    logConstructors: false,
    logFocusedChanged: false,
    logEnableDisable: false,
    /** Toggle for method invocation logging */
    logMethods: false,
    /** Style for manager names in logs */
    styleFocusChange: (name: string) => `\x1b[36m${name}\x1b[0m`, // Cyan color
    /** Style for lifecycle events */
    styleLifecycle: (event: string) => `\x1b[33m${event}\x1b[0m`, // Yellow color
};

@LogManager()
@RegisterManager()
export class FocusManager implements Manager {
    private focusedViewportId: ViewportID | null = null;
    private focusedActiveViewId: string | null = null;
    private focusCycleIndex = 0;

    private layoutSystem: ViewportLayoutSystem | undefined;
    private cameraSystem: CameraSystem | undefined;
    private world: World | undefined;

    constructor(private events: AppEventManager = appEventManager) {
        this.registerListeners();
    }

    // Call after systems are created
    registerDependencies(world: World) {
        this.world = world;
        this.layoutSystem = world.getSystem(ViewportLayoutSystem);
        this.cameraSystem = world.getSystem(CameraSystem);

        if (!this.layoutSystem || !this.cameraSystem || !this.world) {
            console.error(
                'FocusManager: Failed to get required system dependencies!',
            );
        }

        // Set initial focus (e.g., to the first available view)
        this.cycleFocus();
    }

    // region --- Event Handling

    private registerListeners() {
        this.events.on(AppAction.FOCUS_CYCLE_FOCUS, this.cycleFocus);
        this.events.on(AppAction.FOCUS_CYCLE_ENTITY, this.cycleFocusedEntity);
        this.events.on(
            AppAction.FOCUS_CYCLE_CAMERA_MODE,
            this.cycleFocusedCameraMode,
        );
        this.events.on(AppAction.FOCUS_SET_FOCUS, this.handleSetFocusEvent);
        // Listen for layout changes that might remove the focused viewport?
        // Maybe CameraSystem emits 'activeViewDestroyed' event?
        this.events.on(
            AppAction.FOCUS_MERGE_FOCUSED_VIEWPORT,
            this.handleMergeFocusedViewport.bind(this),
        );
        this.events.on(
            AppAction.FOCUS_SPLIT_FOCUSED_VIEWPORT,
            (payload: { splitDirection: SplitDirection | null }) => {
                if (this.focusedViewportId !== null) {
                    this.events.emit(AppAction.VIEWPORT_SPLIT_VIEWPORT, {
                        viewportId: this.focusedViewportId,
                    });
                }
            },
        );
        this.events.on(
            AppAction.FOCUS_SPLIT_FOCUSED_VIEWPORT_HORIZONTAL,
            (payload: { splitDirection: SplitDirection | null }) => {
                if (this.focusedViewportId !== null) {
                    this.events.emit(AppAction.VIEWPORT_SPLIT_VIEWPORT, {
                        viewportId: this.focusedViewportId,
                    });
                }
            },
        );
        this.events.on(
            AppAction.FOCUS_SPLIT_FOCUSED_VIEWPORT_VERTICAL,
            (payload: { splitDirection: SplitDirection | null }) => {
                if (this.focusedViewportId !== null) {
                    this.events.emit(AppAction.VIEWPORT_SPLIT_VIEWPORT, {
                        viewportId: this.focusedViewportId,
                        splitDirection: SplitDirection.VERTICAL,
                    });
                }
            },
        );
    }

    private handleMergeFocusedViewport(payload: {}) {
        if (this.focusedViewportId !== null) {
            this.events.emit(AppAction.VIEWPORT_MERGE_VIEWPORT, {
                viewportId: this.focusedViewportId,
            });
            // this.mergeLeaf(focusedView.viewportId);
            // // Focus might need to be reset after merge
            // cameraSystem.setFocus(null); // Or focus the sibling that remains
        }
    }

    handleSetFocusEvent = (payload?: {
        viewportId: ViewportID;
        activeViewId: ActiveViewId;
    }) => {
        console.log(`${F.fcCyan('FocusManager')}: handleSetFocusEvent
            payload: ${serializeForConsole(Serializer.serialize(payload))}`);
        if (!this.layoutSystem || !payload) return;
        const leaf = this.layoutSystem.findLeaf(payload.viewportId);
        if (leaf) {
            console.log(
                `${F.fcCyan('FocusManager')}: handleSetFocusEvent  leaf.id: ${leaf.id} leaf.activeViewId: ${leaf.activeViewId}`,
            );
            this.setFocus(leaf.id, leaf.activeViewId);
        }
    };

    // endregion

    // Cycles focus to the next available viewport leaf
    cycleFocus = () => {
        // Use arrow function to preserve 'this' if used as direct listener
        if (!this.layoutSystem) return;

        const leaves = this.layoutSystem.getAllLeafs();

        if (leaves.length > 0) {
            this.focusCycleIndex = (this.focusCycleIndex + 1) % leaves.length;
            const nextLeaf = leaves[this.focusCycleIndex];
            this.setFocus(nextLeaf.id, nextLeaf.activeViewId);
            return;
        }

        const allLeafs = this.layoutSystem.getAllLeafs();
        if (allLeafs.length == 1) {
            console.warn(
                `layoutsystem: ${serializeForConsole(Serializer.serialize(this.layoutSystem))}`,
            );
            this.setFocus(allLeafs[0].id, allLeafs[0].activeViewId);
        }
    };

    // Cycles focus to the next available viewport leaf
    cycleFocusedEntity = () => {
        const viewConfig = this.getViewConfigForActiveView();
        if (viewConfig) {
            const entities =
                this.world?.queryEntities([CameraTargetComponent]) || [];

            if (!entities.length) {
                console.warn('no entities found to cycle');
            }

            if (viewConfig.targetEntity === null) {
                viewConfig.targetEntity = entities[0]; // Default to the first entity if no target is set
            }

            let found = false;
            for (let i = 0; i < entities.length; i++) {
                const entity = entities[i];
                if (found) {
                    viewConfig.targetEntity = entity;
                    return; // Return the next entity after the current one
                }
                if (entity === viewConfig.targetEntity) {
                    found = true;
                }
            }
            // If we reach here, it means the target entity was the last one, so return the first entity
            if (found && entities.length > 0) {
                viewConfig.targetEntity = entities[0];
            }
        }
    };

    private getViewConfigForActiveView(): ViewConfiguration | undefined {
        if (!this.focusedActiveViewId) return;
        const activeView = this.cameraSystem?.getActiveView(
            this.focusedActiveViewId,
        );
        if (!activeView) return;
        return this.cameraSystem?.getViewConfiguration(activeView.viewConfigId);
    }

    // Cycles the camera mode of the viewConfig in focus
    cycleFocusedCameraMode = () => {
        const viewConfig = this.getViewConfigForActiveView();
        if (viewConfig) {
            viewConfig.mode =
                Object.values(CameraMode)[
                    (Object.values(CameraMode).indexOf(viewConfig.mode) + 1) %
                        Object.values(CameraMode).length
                ];
        }
    };

    setFocus(viewportId: ViewportID | null, activeViewId: string | null): void {
        console.log(
            `${F.fcCyan('FocusManager')}: setFocus viewportId: ${viewportId} activeViewId: ${activeViewId}`,
        );
        if (this.focusedViewportId === viewportId) return; // No change

        const oldFocusedViewId = this.focusedActiveViewId;
        this.focusedViewportId = viewportId;
        this.focusedActiveViewId = activeViewId;

        // Notify CameraSystem
        this.events.emit(AppAction.FOCUS_CHANGED, {
            viewportId: viewportId,
            activeViewId: activeViewId,
            oldActiveViewId: oldFocusedViewId,
        });

        // Update PlayerControlledComponent
        this.updatePlayerControlTarget(oldFocusedViewId, activeViewId);

        console.log(
            `${F.fcCyan('FocusManager')}: Focus set to Viewport ${viewportId} / ActiveView ${activeViewId}`,
        );
        // TODO: Update visual indicator for focused viewport? (e.g., border)
    }

    // Moves the PlayerControlComponent to the entity targeted by the
    // newly focused view
    private updatePlayerControlTarget(
        oldActiveViewId: string | null,
        newActiveViewId: string | null,
    ): void {
        if (!this.world || !this.cameraSystem) return;

        let oldTargetEntity: Entity | null = null;
        console.log(
            `${F.fcCyan('FocusManager')}: updatePlayerControlTarget oldActiveViewId ${oldActiveViewId} newActiveViewId ${newActiveViewId}`,
        );
        if (oldActiveViewId) {
            const oldView = this.cameraSystem.getActiveView(oldActiveViewId);
            const oldConfig = oldView
                ? this.cameraSystem.getViewConfiguration(oldView.viewConfigId)
                : null;
            oldTargetEntity = oldConfig?.targetEntity ?? null;
        }

        let newTargetEntity: Entity | null = null;
        if (newActiveViewId) {
            const newView = this.cameraSystem.getActiveView(newActiveViewId);
            const newConfig = newView
                ? this.cameraSystem.getViewConfiguration(newView.viewConfigId)
                : null;
            newTargetEntity = newConfig?.targetEntity ?? null;
        }

        console.log(
            `${F.fcCyan('FocusManager')}: oldTargetEntity ${oldTargetEntity} newTargetEntity ${newTargetEntity}`,
        );

        if (oldTargetEntity !== null && oldTargetEntity !== newTargetEntity) {
            this.world.removeComponent(oldTargetEntity, PlayerControlComponent);
            console.log(
                `${F.fcCyan('FocusManager')}: Removed PlayerControlComponent from Entity ${oldTargetEntity}`,
            );
        }

        if (
            newTargetEntity !== null &&
            !this.world.hasComponent(newTargetEntity, PlayerControlComponent)
        ) {
            // Ensure the target can be controlled
            if (
                this.world.hasComponent(
                    newTargetEntity,
                    InputControllableComponent,
                )
            ) {
                this.world.addComponent(
                    newTargetEntity,
                    new PlayerControlComponent(),
                );
                console.log(
                    `${F.fcCyan('FocusManager')}: Added PlayerControlComponent to Entity ${newTargetEntity}`,
                );
            } else {
                console.warn(
                    `${F.fcCyan('FocusManager')}: Cannot set control, target entity ${newTargetEntity} lacks InputControllableComponent.`,
                );
            }
        }
    }
}
