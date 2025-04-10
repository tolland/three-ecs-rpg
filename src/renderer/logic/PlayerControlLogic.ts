// src/renderer/logic/PlayerControlLogic.ts
import * as THREE from 'three';
import {
    CameraTargetComponent,
    ColliderComponent,
    InputControllableComponent,
    MovementStateComponent,
    MovementStateType,
} from '@ecs/components';

export class PlayerControlLogic {
    static updateMovementState(
        stateComp: MovementStateComponent,
        collider: ColliderComponent | undefined,
    ): void {
        const isOnGround = collider?.onGround ?? false;
        if (isOnGround && stateComp.state !== 'grounded')
            stateComp.state = 'grounded';
        else if (!isOnGround && stateComp.state === 'grounded')
            stateComp.state = 'falling';
        // Add transitions for jumping based on velocity / input?
    }

    static calculateLookRotation(
        inputDelta: {
            x: number;
            y: number;
        },
        currentRotation: THREE.Quaternion,
        sensitivity: number,
    ): THREE.Quaternion {
        // Logic from PlayerControlSystem for first person rotation
        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        // ... apply delta, clamp pitch ...
        return new THREE.Quaternion().setFromEuler(euler);
    }

    static updateOrbitAngles(
        inputDelta: {
            x: number;
            y: number;
        },
        cameraTarget: CameraTargetComponent,
        sensitivity: number,
    ): void {
        // Logic from PlayerControlSystem for third person orbit
        // ... update cameraTarget.orbitAngles, clamp pitch ...
    }

    static calculateForces(
        state: MovementStateType,
        input: InputControllableComponent,
        /*...,*/ deltaTime: number,
    ): THREE.Vector3 {
        // Logic for calculating thrust/damping based on state (flying vs grounded)
        const totalForce = new THREE.Vector3();
        // ... calculate thrustForce, dampingForce based on state ...
        // totalForce.add(thrustForce).add(dampingForce);
        return totalForce;
    }

    static calculateModelRotation(
        state: MovementStateType /* ... */,
    ): THREE.Quaternion {
        // Logic for calculating target model rotation in 3rd person/flying
        const targetRotation = new THREE.Quaternion();
        // ... setFromUnitVectors or align with camera ...
        return targetRotation;
    }
}
