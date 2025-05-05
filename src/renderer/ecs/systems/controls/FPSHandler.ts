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
        return {
            yaw: input.mouseDelta.x * this.lookSensitivity * xScale,
            pitch: input.mouseDelta.y * this.lookSensitivity * yScale,
            roll: 0,
        };
    }

    applyRotation(
        deltaTime: number,
        rotationInput: RotationInput,
        lookDirComp: LookDirectionComponent,
        rotComp: RotationComponent,
    ): void {
        this.applyLookAndRotation(
            deltaTime,
            rotationInput,
            lookDirComp,
            rotComp,)
    }

    applyJustRotation(
        deltaTime: number,
        rotationInput: RotationInput,
        lookDirComp: LookDirectionComponent,
        rotComp: RotationComponent,

    ){

        const clampedYaw = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationInput.yaw));

        const euler = new THREE.Euler(
            0,
            clampedYaw,
            0,
            'YXZ'
        );
        const quaternion = new THREE.Quaternion().setFromEuler(euler);
        rotComp.value.multiply(quaternion);
    }

    applyLookAndRotation(
        deltaTime: number,
        rotationInput: RotationInput,
        lookDirComp: LookDirectionComponent,
        rotComp: RotationComponent,

    ){

        const deltaYaw = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationInput.yaw));
        const deltaPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationInput.pitch));

        const lookEuler = new THREE.Euler(
            deltaPitch,
            deltaYaw,
            0,
            'YXZ'
        );
        const quaternion = new THREE.Quaternion().setFromEuler(lookEuler);

        lookDirComp.value.multiply(quaternion);

        const targetYawQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, lookEuler.y, 0));

        rotComp.value.slerp(targetYawQuat.premultiply(rotComp.value), 0.75);
    }

    getMovementInput(
        deltaTime: number,
        input: InputControllableComponent,
        rotComp: RotationComponent,
    ): MovementInput {
        const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(
            rotComp.value,
        );
        const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(
            rotComp.value,
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
