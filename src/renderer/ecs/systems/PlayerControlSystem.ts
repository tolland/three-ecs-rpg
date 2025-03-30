import { System } from '@ecs/System';
import { World } from '@ecs/World';
import {
    CameraMode,
    CameraTargetComponent,
    ColliderComponent,
    InputControllableComponent,
    NeedsUpdateComponent,
    PlayerControlledComponent,
    RotationComponent,
    VelocityComponent,
} from '@ecs/components'; // Import CameraMode
import * as THREE from 'three';
import { PhysicsConfigManager } from '@core/PhysicsConfigManager';

export class PlayerControlSystem extends System {
    private playerRotation = new THREE.Quaternion();
    private cameraRotationVertical = 0; // Store vertical rotation separately to clamp it

    // Store reference to manager
    constructor(
        world: World,
        private physicsConfig: PhysicsConfigManager,
    ) {
        super(world);
    }

    update(deltaTime: number): void {
        const entities = this.world.queryEntities([
            PlayerControlledComponent,
            VelocityComponent,
            RotationComponent,
            InputControllableComponent,
        ]);

        if (entities.length === 0) return;

        const entity = entities[0]; // Assume one player

        const vel = this.world.getComponent(entity, VelocityComponent)!;
        const rot = this.world.getComponent(entity, RotationComponent)!;
        const input = this.world.getComponent(
            entity,
            InputControllableComponent,
        )!;
        const collider = this.world.getComponent(entity, ColliderComponent); // Need for jump check
        const cameraTarget = this.world.getComponent(
            entity,
            CameraTargetComponent,
        ); // Get camera target info

        // Determine current camera mode for the controlled entity
        const currentCameraMode = cameraTarget?.mode ?? CameraMode.FIRST_PERSON;

        // Get player specific config
        const playerCfg = this.physicsConfig.getPlayerConfig();
        const globalDamping = this.physicsConfig.getGlobalDamping();

        // --- Camera Rotation (from mouse input) ---
        if (input.pointerLocked) {
            const sensitivity = 0.002;
            const mouseDeltaX = input.mouseDelta.x * sensitivity;
            const mouseDeltaY = input.mouseDelta.y * sensitivity;

            if (currentCameraMode === CameraMode.FIRST_PERSON) {
                // Rotate player entity directly
                const euler = new THREE.Euler(0, 0, 0, 'YXZ');
                euler.setFromQuaternion(rot.value);
                euler.y -= mouseDeltaX;
                euler.x -= mouseDeltaY;
                euler.x = Math.max(
                    -Math.PI / 2 + 0.1,
                    Math.min(Math.PI / 2 - 0.1, euler.x),
                ); // Clamp pitch
                rot.value.setFromEuler(euler);
                this.world.addComponent(entity, new NeedsUpdateComponent());
            } else if (cameraTarget) {
                // Only apply orbit if target component exists
                // Update orbit angles stored in CameraTargetComponent
                cameraTarget.orbitAngles.x -= mouseDeltaX; // Azimuth
                cameraTarget.orbitAngles.y -= mouseDeltaY; // Pitch
                // Clamp pitch
                cameraTarget.orbitAngles.y = Math.max(
                    cameraTarget.minPitch,
                    Math.min(cameraTarget.maxPitch, cameraTarget.orbitAngles.y),
                );
                // Azimuth wraps around automatically (handled by trig functions)
            }
        }

        // --- Player Rotation based on Movement (Third Person) ---
        const forwardVector = new THREE.Vector3(0, 0, -1);
        const rightVector = new THREE.Vector3(1, 0, 0);
        let worldMoveDirection = new THREE.Vector3(); // Direction relative to world/camera

        if (currentCameraMode === CameraMode.FIRST_PERSON) {
            forwardVector.applyQuaternion(rot.value); // Use player's facing direction
            rightVector.applyQuaternion(rot.value);
        } else {
            // In third person, movement is relative to camera's horizontal rotation (azimuth)
            // Get camera's horizontal rotation quaternion
            const cameraHorizontalQuat =
                new THREE.Quaternion().setFromAxisAngle(
                    new THREE.Vector3(0, 1, 0),
                    cameraTarget?.orbitAngles.x ?? 0,
                );
            forwardVector.applyQuaternion(cameraHorizontalQuat);
            rightVector.applyQuaternion(cameraHorizontalQuat);
        }

        if (input.actions.forward) worldMoveDirection.add(forwardVector);
        if (input.actions.backward) worldMoveDirection.sub(forwardVector);
        if (input.actions.left) worldMoveDirection.sub(rightVector);
        if (input.actions.right) worldMoveDirection.add(rightVector);

        worldMoveDirection.y = 0; // Ignore vertical component for movement direction
        worldMoveDirection.normalize();

        // --- Movement Velocity ---
        const speed = input.actions.run
            ? playerCfg.runSpeed
            : playerCfg.walkSpeed;
        let moveVelocity = new THREE.Vector3();

        if (worldMoveDirection.lengthSq() > 0) {
            moveVelocity.copy(worldMoveDirection).multiplyScalar(speed);
            vel.value.x = moveVelocity.x;
            vel.value.z = moveVelocity.z;

            // --- Update Player Entity Rotation in Third Person ---
            if (currentCameraMode !== CameraMode.FIRST_PERSON) {
                // Smoothly rotate player model to face movement direction
                const targetRotation = new THREE.Quaternion();
                targetRotation.setFromUnitVectors(
                    new THREE.Vector3(0, 0, -1),
                    worldMoveDirection,
                ); // Target rotation faces movement
                rot.value.slerp(targetRotation, 0.1); // Adjust smoothing factor (0.1 = fairly quick)
                this.world.addComponent(entity, new NeedsUpdateComponent());
            }
        } else {
            // Apply stronger damping *only* when stopping (no input)
            const stopDamping = globalDamping * playerCfg.stopDampingMultiplier;
            vel.value.x *= 1 - stopDamping * deltaTime;
            vel.value.z *= 1 - stopDamping * deltaTime;
        }

        // --- Jumping ---
        if (input.actions.jump && collider?.onGround) {
            vel.value.y = playerCfg.jumpForce; // Use configured jump force
            collider.onGround = false;
        }
    }
}
