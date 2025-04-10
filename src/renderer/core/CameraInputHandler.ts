import * as THREE from 'three';
import { InputManager } from './InputManager';
import { InputAction } from '@shared/core/InputActions';

export interface RotationInput {
    yaw: number; // rotation around Y axis
    pitch: number; // rotation around X axis
    roll: number; // rotation around Z axis
}

export interface MovementInput {
    forward: number; // movement along Z axis
    right: number; // movement along X axis
    up: number; // movement along Y axis
}

/**
 * CameraInputHandler interface defines the methods for handling camera input.
 * The purpose is to allow plugging in different input handling strategies.
 * such as inverted mouse look, FPS-style controls, or step-based controls.
 */
export interface CameraInputHandler {
    getRotationInput(deltaTime: number): RotationInput;

    getMovementInput(deltaTime: number): MovementInput;
}

// Base class for input handlers that use InputManager
export abstract class InputManagerBasedHandler implements CameraInputHandler {
    constructor(protected inputManager: InputManager) {}

    abstract getRotationInput(deltaTime: number): RotationInput;

    abstract getMovementInput(deltaTime: number): MovementInput;
}

// Standard FPS-style camera controls with mouse look
export class FPSCameraHandler extends InputManagerBasedHandler {
    private lookSensitivity: number;
    private invertX: boolean;
    private invertY: boolean;

    constructor(
        inputManager: InputManager,
        options: {
            lookSensitivity?: number;
            invertX?: boolean;
            invertY?: boolean;
        } = {},
    ) {
        super(inputManager);
        this.lookSensitivity = options.lookSensitivity ?? 0.002;
        this.invertX = options.invertX ?? false;
        this.invertY = options.invertY ?? false;
    }

    getRotationInput(deltaTime: number): RotationInput {
        if (!this.inputManager.pointerLocked) {
            return { yaw: 0, pitch: 0, roll: 0 };
        }

        const mouseDelta = this.inputManager.consumeMouseDelta();
        const xScale = this.invertX ? 1 : -1;
        const yScale = this.invertY ? 1 : -1;

        return {
            yaw: mouseDelta.x * this.lookSensitivity * xScale,
            pitch: mouseDelta.y * this.lookSensitivity * yScale,
            roll: 0,
        };
    }

    getMovementInput(deltaTime: number): MovementInput {
        return {
            forward:
                (this.inputManager.getActionState(InputAction.MOVE_FORWARD)
                    ? 1
                    : 0) +
                (this.inputManager.getActionState(InputAction.MOVE_BACKWARD)
                    ? -1
                    : 0),
            right:
                (this.inputManager.getActionState(InputAction.MOVE_RIGHT)
                    ? 1
                    : 0) +
                (this.inputManager.getActionState(InputAction.MOVE_LEFT)
                    ? -1
                    : 0),
            up:
                (this.inputManager.getActionState(InputAction.JUMP) ? 1 : 0) +
                (this.inputManager.getActionState(InputAction.CROUCH) ? -1 : 0),
        };
    }
}

// Step-based camera controls (like the original implementation)
export class StepCameraHandler extends InputManagerBasedHandler {
    private stepSize: number;
    private invertX: boolean;
    private invertY: boolean;

    constructor(
        inputManager: InputManager,
        options: {
            stepSize?: number;
            invertX?: boolean;
            invertY?: boolean;
        } = {},
    ) {
        super(inputManager);
        this.stepSize = options.stepSize ?? 0.1;
        this.invertX = options.invertX ?? false;
        this.invertY = options.invertY ?? false;
    }

    getRotationInput(deltaTime: number): RotationInput {
        if (!this.inputManager.pointerLocked) {
            return { yaw: 0, pitch: 0, roll: 0 };
        }

        const mouseDelta = this.inputManager.consumeMouseDelta();
        const xScale = this.invertX ? -1 : 1;
        const yScale = this.invertY ? -1 : 1;

        return {
            yaw:
                (mouseDelta.x > 0 ? 1 : mouseDelta.x < 0 ? -1 : 0) *
                this.stepSize *
                xScale,
            pitch:
                (mouseDelta.y > 0 ? 1 : mouseDelta.y < 0 ? -1 : 0) *
                this.stepSize *
                yScale,
            roll: 0,
        };
    }

    getMovementInput(deltaTime: number): MovementInput {
        return {
            forward: this.inputManager.getActionState(InputAction.MOVE_FORWARD)
                ? 1
                : 0,
            right: this.inputManager.getActionState(InputAction.MOVE_RIGHT)
                ? 1
                : 0,
            up: this.inputManager.getActionState(InputAction.JUMP) ? 1 : 0,
        };
    }
}

// Example of a more advanced handler with acceleration
export class AcceleratedCameraHandler extends InputManagerBasedHandler {
    private lookSensitivity: number;
    private acceleration: number;
    private maxSpeed: number;
    private currentSpeed: THREE.Vector2;

    constructor(
        inputManager: InputManager,
        options: {
            lookSensitivity?: number;
            acceleration?: number;
            maxSpeed?: number;
        } = {},
    ) {
        super(inputManager);
        this.lookSensitivity = options.lookSensitivity ?? 0.002;
        this.acceleration = options.acceleration ?? 2.0;
        this.maxSpeed = options.maxSpeed ?? 0.1;
        this.currentSpeed = new THREE.Vector2();
    }

    getRotationInput(deltaTime: number): RotationInput {
        if (!this.inputManager.pointerLocked) {
            this.currentSpeed.set(0, 0);
            return { yaw: 0, pitch: 0, roll: 0 };
        }

        const mouseDelta = this.inputManager.consumeMouseDelta();

        // Apply acceleration
        this.currentSpeed.x += mouseDelta.x * this.acceleration * deltaTime;
        this.currentSpeed.y += mouseDelta.y * this.acceleration * deltaTime;

        // Clamp to max speed
        this.currentSpeed.clampLength(0, this.maxSpeed);

        return {
            yaw: this.currentSpeed.x * this.lookSensitivity,
            pitch: this.currentSpeed.y * this.lookSensitivity,
            roll: 0,
        };
    }

    getMovementInput(deltaTime: number): MovementInput {
        return {
            forward: this.inputManager.getActionState(InputAction.MOVE_FORWARD)
                ? 1
                : 0,
            right: this.inputManager.getActionState(InputAction.MOVE_RIGHT)
                ? 1
                : 0,
            up: this.inputManager.getActionState(InputAction.JUMP) ? 1 : 0,
        };
    }
}
