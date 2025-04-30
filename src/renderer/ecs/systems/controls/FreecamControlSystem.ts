// src/renderer/ecs/systems/FreecamControlSystem.ts
import { System } from '@ecs/System';
import { World } from '@ecs/World';
import { InputManager } from '@core/InputManager';
import * as THREE from 'three';
import { appEventManager, AppEventManager, physicsConfigManager } from '@core/index';
import { CameraSystem } from '@systems/CameraSystem';
import { ViewConfiguration } from '@core/ViewConfiguration';
import { MovementInputHandler, FPSCameraHandler } from '@systems/controls/MovementInputHandler';
import { AppAction } from '@shared/core';
import { ActiveView, ActiveViewId, ViewportID } from '@core/types/viewport';

/**
 * This implements a physics-free camera control system.
 * It allows for free movement and rotation of the camera
 * However it seems duplicative of the PlayerControlSystem especially
 * in god mode, which has the same behavior. I think freecam should be
 * an entities component that can have a camera attached similar to a
 * playable entity.
 */
export class FreecamControlSystem extends System {
    private inputManager: InputManager | undefined;
    private cameraSystem: CameraSystem | undefined;
    // private simulationConfig: SimulationConfigManager | undefined;
    private moveDirection: THREE.Vector3;
    private tempEuler: THREE.Euler;
    private rotateSpeed: number;
    private inputHandler?: MovementInputHandler;
    private focusedActiveView: ActiveView | undefined;

    constructor(
        world: World,
        private events: AppEventManager = appEventManager,
    ) {
        super(world);
        this.registerListeners();
        this.moveDirection = new THREE.Vector3();
        this.tempEuler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.rotateSpeed = 2.0; // radians per second
    }

    registerDependencies(inputManager: InputManager) {
        this.inputManager = inputManager;
        this.cameraSystem = this.world.getSystem(CameraSystem);
        //this.simulationConfig = simulationConfigManager;

        if (
            !this.inputManager ||
            !this.cameraSystem
        ) {
            console.error(
                'FreecamControlSystem: Missing dependencies!',
                this.inputManager,
                this.cameraSystem,
            );
            return;
        }

        // Initialize the input handler with the current input manager
        this.inputHandler = new FPSCameraHandler(this.inputManager, {
            lookSensitivity: 0.002,
            invertX: false,
            invertY: false,
        });
    }

    private registerListeners() {
        this.events.on(
            AppAction.FOCUS_CHANGED,
            this.handleFocusChanged.bind(this),
        );
    }

    private handleFocusChanged(payload: {
        viewportId: ViewportID | null;
        activeViewId: ActiveViewId | null;
        oldActiveViewId: ActiveViewId | null;
    }) {
        if (payload.activeViewId) {
            this.focusedActiveView = this.cameraSystem?.getActiveView(
                payload.activeViewId,
            );
        }
    }


    update(deltaTime: number): void {
        if (!this.inputManager || !this.cameraSystem)
            return;

        const focusedView: ActiveView | undefined =
            this.focusedActiveView;
        if (!focusedView) return;

        const viewConfig: ViewConfiguration | undefined =
            this.cameraSystem.getViewConfiguration(focusedView.viewConfigId);
        if (!viewConfig || viewConfig.mode !== 'FREECAM') {
            return; // Only run for focused freecam views
        }

        // Reset movement
        this.moveDirection.set(0, 0, 0);

        const moveSpeed = physicsConfigManager.getPlayerConfig().runSpeed * 2; // Faster freecam speed

        // Get rotation input
        const rotationInput = this.inputHandler?.getRotationInput(
            deltaTime,
        ) || { yaw: 0, pitch: 0 };

        // Convert current rotation to Euler for modification
        this.tempEuler.setFromQuaternion(viewConfig.freecamRotation);

        // Apply rotation changes
        this.tempEuler.y += rotationInput.yaw;
        this.tempEuler.x += rotationInput.pitch;

        // Clamp pitch to prevent gimbal lock
        this.tempEuler.x = Math.max(
            -Math.PI / 2 + 0.01,
            Math.min(Math.PI / 2 - 0.01, this.tempEuler.x),
        );

        // Convert back to quaternion
        viewConfig.freecamRotation.setFromEuler(this.tempEuler);

        // Get movement input
        const movementInput = this.inputHandler?.getMovementInput(
            deltaTime,
        ) || { forward: 0, right: 0, up: 0 };

        // Apply movement based on camera orientation
        if (movementInput.forward !== 0) {
            const forwardVec = new THREE.Vector3(0, 0, -1)
                .applyQuaternion(viewConfig.freecamRotation)
                .multiplyScalar(movementInput.forward);
            this.moveDirection.add(forwardVec);
        }
        if (movementInput.right !== 0) {
            const rightVec = new THREE.Vector3(1, 0, 0)
                .applyQuaternion(viewConfig.freecamRotation)
                .multiplyScalar(movementInput.right);
            this.moveDirection.add(rightVec);
        }
        if (movementInput.up !== 0) {
            this.moveDirection.y += movementInput.up;
        }

        // Apply movement
        if (this.moveDirection.lengthSq() > 0) {
            this.moveDirection
                .normalize()
                .multiplyScalar(moveSpeed * deltaTime);
            viewConfig.freecamPosition.add(this.moveDirection);
        }
    }
}
