// src/renderer/core/FocusManager.ts
import { CameraSystem, InputSystem, ViewportLayoutSystem } from '@ecs/systems';
import { InputManager } from './InputManager';
import { AppEventManager, appEventManager } from './AppEventManager';
import { World } from '@ecs/World';
import { AppAction } from '@shared/core';
import {
    InputControllableComponent,
    PlayerControlledComponent,
} from '@ecs/components';
import { ViewportID } from '@core/ViewportLayout';
import { Entity } from '@ecs/Entity';
import { RegisterManager } from '@core/ManagerRegistry';
import { Manager } from '@core/types/manager';

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

        if (
            !this.layoutSystem ||
            !this.cameraSystem ||
            !this.world
        ) {
            console.error(
                'FocusManager: Failed to get required system dependencies!',
            );
        }

        // Set initial focus (e.g., to the first available view)
        this.cycleFocus();
    }

    private registerListeners() {
        this.events.on(AppAction.VIEWPORT_CYCLE_FOCUS, this.cycleFocus);
        this.events.on(AppAction.VIEWPORT_SET_FOCUS, this.handleSetFocusEvent);
        // Listen for layout changes that might remove the focused viewport?
        // Maybe CameraSystem emits 'activeViewDestroyed' event?
    }

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

    handleSetFocusEvent = (payload?: { viewportId: ViewportID }) => {
        if (!this.layoutSystem || !payload) return;
        const leaf = this.layoutSystem.findLeaf(payload.viewportId);
        if (leaf) {
            this.setFocus(leaf.id, leaf.activeViewId);
        }
    };

    setFocus(viewportId: ViewportID | null, activeViewId: string | null): void {
        if (this.focusedViewportId === viewportId) return; // No change

        const oldFocusedViewId = this.focusedActiveViewId;
        this.focusedViewportId = viewportId;
        this.focusedActiveViewId = activeViewId;

        // Notify CameraSystem
        this.cameraSystem?.setFocus(activeViewId); // CameraSystem handles internal state

        // Update PlayerControlledComponent
        this.updatePlayerControlTarget(oldFocusedViewId, activeViewId);

        console.log(
            `FocusManager: Focus set to Viewport ${viewportId} / ActiveView ${activeViewId}`,
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
                    `FocusManager: Removed PlayerControl from Entity ${oldTargetEntity}`,
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
                    `FocusManager: Added PlayerControl to Entity ${newTargetEntity}`,
                );
            } else {
                console.warn(
                    `FocusManager: Cannot set control, target entity ${newTargetEntity} lacks InputControllableComponent.`,
                );
            }
        }
    }

    getFocusedViewportId(): ViewportID | null {
        return this.focusedViewportId;
    }
    getFocusedActiveViewId(): string | null {
        return this.focusedActiveViewId;
    }
}
