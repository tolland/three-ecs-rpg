import * as THREE from 'three';
import {
    ForceAccumulatorComponent,
    InputControllableComponent,
    LookDirectionComponent,
    RotationComponent, VelocityComponent,
} from '@ecs/components';
import {
    InputManagerBasedHandler,
    MovementInput,
    RotationInput,
} from '@systems/controls/InputHandlers';
import { PlayerPhysicsConfig } from '@renderer/core';

/**
 * Standard FPS-style camera controls with mouse look
 */
export class FPSInputHandler extends InputManagerBasedHandler {
    private lookSensitivity: number;
    private invertX: boolean;
    private invertY: boolean;

    constructor(
        options: {
            lookSensitivity?: number;
            invertX?: boolean;
            invertY?: boolean;
        } = {},
    ) {
        super();
        this.lookSensitivity = options.lookSensitivity ?? 0.002;
        this.invertX = options.invertX ?? false;
        this.invertY = options.invertY ?? false;
    }

    getRotationInput(
        deltaTime: number,
        input: InputControllableComponent,
        lookDir: LookDirectionComponent,
    ): RotationInput {
        const xScale = this.invertX ? 1 : -1;
        const yScale = this.invertY ? 1 : -1;

        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        euler.setFromQuaternion(lookDir.value);
        euler.y -= input.mouseDelta.x;
        euler.x -= input.mouseDelta.y;
        euler.x = Math.max(
            -Math.PI / 2 + 0.1,
            Math.min(Math.PI / 2 - 0.1, euler.x),
        ); // Clamp pitch
        lookDir.value.setFromEuler(euler);
        // } else if (cameraTarget) {
        //     cameraTarget.orbitAngles.x -= mouseDeltaX; // Azimuth
        //     cameraTarget.orbitAngles.y -= mouseDeltaY; // Pitch
        //     cameraTarget.orbitAngles.y = Math.max(
        //         cameraTarget.minPitch,
        //         Math.min(cameraTarget.maxPitch, cameraTarget.orbitAngles.y),
        //     ); // Clamp pitch
        // }
        return {
            yaw: input.mouseDelta.x * this.lookSensitivity * xScale,
            pitch: input.mouseDelta.y * this.lookSensitivity * yScale,
            roll: 0,
        };
    }

    applyRotation(
        deltaTime: number,
        rotationInput: RotationInput,
        lookDir: LookDirectionComponent,
        rotComp: RotationComponent,
    ): void {
        // rotComp.value.slerp(
        //     new THREE.Quaternion().setFromUnitVectors(
        //         new THREE.Vector3(0, 0, -1),
        //         lookDir.value,
        //     ),
        //     0.15,
        // );
    }

    getMovementInput(
        deltaTime: number,
        input: InputControllableComponent,
        lookDir: LookDirectionComponent,
    ): MovementInput {
        const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(
            lookDir.value,
        );
        const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(
            lookDir.value,
        );
        const worldMoveDirection = new THREE.Vector3();

        if (input.actions.forward) worldMoveDirection.add(forwardVector);
        if (input.actions.backward) worldMoveDirection.sub(forwardVector);
        if (input.actions.left) worldMoveDirection.sub(rightVector);
        if (input.actions.right) worldMoveDirection.add(rightVector);

        worldMoveDirection.y = 0;
        worldMoveDirection.normalize();

        return worldMoveDirection;
    }

    applyMovement(
        deltaTime: number,
        movementInput: MovementInput,
        lookDir: LookDirectionComponent,
        rotComp: RotationComponent,
        velComp: VelocityComponent,
        forceComp: ForceAccumulatorComponent,
        thrustForce: THREE.Vector3,
        playerCfg: PlayerPhysicsConfig,
        input: InputControllableComponent,
    ): void {
        const targetSpeed = input.actions.run
            ? playerCfg.runSpeed
            : playerCfg.walkSpeed;
        const currentHorizontalVel = new THREE.Vector3(
            velComp.value.x,
            0,
            velComp.value.z,
        );
        const desiredVel = movementInput
            .clone()
            .multiplyScalar(targetSpeed);
        const requiredAccel = desiredVel
            .sub(currentHorizontalVel)
            .divideScalar(deltaTime);

        const maxAccel = 200.0;
        requiredAccel.clampLength(0, maxAccel);
        thrustForce.copy(requiredAccel);
    }
}
