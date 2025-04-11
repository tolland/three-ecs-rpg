// src/renderer/core/FocusManager.ts
import { CameraSystem, ViewportLayoutSystem } from '@ecs/systems';
import { AppEventManager, appEventManager } from './AppEventManager';
import { World } from '@ecs/World';
import { AppAction } from '@shared/core';
import {
    InputControllableComponent,
    PlayerControlledComponent,
} from '@ecs/components';
import { Entity } from '@ecs/Entity';
import { RegisterManager } from '@core/ManagerRegistry';
import { Manager } from '@core/types/manager';
import * as F from '@renderer/utils/chalkColors';
import { ViewportID } from '@core/types/viewport';

@RegisterManager()
export class FocusManager implements Manager {
    private focusedViewportId: ViewportID | null = null;
    private focusedActiveViewId: string | null = null;
    private focusCycleIndex = 0;

    private layoutSystem: ViewportLayoutSystem | undefined;
    private cameraSystem: CameraSystem | undefined;
    //private inputManager: InputManager | undefined;
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
        this.events.on(AppAction.VIEWPORT_CYCLE_FOCUS, this.cycleFocus);
        this.events.on(AppAction.FOCUS_SET_FOCUS, this.handleSetFocusEvent);
        // Listen for layout changes that might remove the focused viewport?
        // Maybe CameraSystem emits 'activeViewDestroyed' event?
        this.events.on(
            AppAction.FOCUS_MERGE_FOCUSED_VIEWPORT,
            this.handleMergeFocusedViewport.bind(this),
        );
        this.events.on(
            AppAction.FOCUS_SPLIT_FOCUSED_VIEWPORT,
            this.handleSplitFocusedViewport.bind(this),
        );
    }

    private handleSplitFocusedViewport(payload: {}) {
        if (this.focusedViewportId !== null) {
            this.events.emit(AppAction.VIEWPORT_SPLIT_VIEWPORT, {
                viewportId: this.focusedViewportId,
            });
        }
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

    handleSetFocusEvent = (payload?: { viewportId: ViewportID }) => {
        if (!this.layoutSystem || !payload) return;
        const leaf = this.layoutSystem.findLeaf(payload.viewportId);
        if (leaf) {
            this.setFocus(leaf.id, leaf.activeViewId);
        }
    };

    // endregion

    // Cycles focus to the next available viewport leaf
    cycleFocus = () => {
        // Use arrow function to preserve 'this' if used as direct listener
        if (!this.layoutSystem) return;
        const leaves = this.layoutSystem
            .getActiveLeafs()
            .filter((leaf) => leaf.activeViewId); // Only leaves with views
        if (leaves.length > 0) {
            this.focusCycleIndex = (this.focusCycleIndex + 1) % leaves.length;
            const nextLeaf = leaves[this.focusCycleIndex];
            this.setFocus(nextLeaf.id, nextLeaf.activeViewId);
        } else {
            this.setFocus(null, null); // No focus if no views
        }
    };

    setFocus(viewportId: ViewportID | null, activeViewId: string | null): void {
        if (this.focusedViewportId === viewportId) return; // No change

        const oldFocusedViewId = this.focusedActiveViewId;
        this.focusedViewportId = viewportId;
        this.focusedActiveViewId = activeViewId;

        // Notify CameraSystem
        this.events.emit(AppAction.FOCUS_CHANGED, {
            viewportId,
            activeViewId,
            oldActiveViewId: oldFocusedViewId,
        });

        // Update PlayerControlledComponent
        this.updatePlayerControlTarget(oldFocusedViewId, activeViewId);

        console.log(
            `${F.fcCyan('FocusManager')}: Focus set to Viewport ${viewportId} / ActiveView ${activeViewId}`,
        );
        // TODO: Update visual indicator for focused viewport? (e.g., border)
    }

    // Moves the PlayerControlledComponent to the entity targeted by the newly focused view
    private updatePlayerControlTarget(
        oldActiveViewId: string | null,
        newActiveViewId: string | null,
    ): void {
        if (!this.world || !this.cameraSystem) return;

        let oldTargetEntity: Entity | null = null;
        console.log(
            `${F.fcCyan('FocusManager')}: oldActiveViewId ${oldActiveViewId} newActiveViewId ${newActiveViewId}`,
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
            if (
                this.world.hasComponent(
                    oldTargetEntity,
                    PlayerControlledComponent,
                )
            ) {
                this.world.removeComponent(
                    oldTargetEntity,
                    PlayerControlledComponent,
                );
                console.log(
                    `${F.fcCyan('FocusManager')}: Removed PlayerControl from Entity ${oldTargetEntity}`,
                );
            }
        }

        if (
            newTargetEntity !== null &&
            !this.world.hasComponent(newTargetEntity, PlayerControlledComponent)
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
                    new PlayerControlledComponent(),
                );
                console.log(
                    `${F.fcCyan('FocusManager')}: Added PlayerControl to Entity ${newTargetEntity}`,
                );
            } else {
                console.warn(
                    `${F.fcCyan('FocusManager')}: Cannot set control, target entity ${newTargetEntity} lacks InputControllableComponent.`,
                );
            }
        }
    }
}
