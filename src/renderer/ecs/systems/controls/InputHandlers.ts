import * as THREE from 'three';
import {
    ForceAccumulatorComponent,
    InputControllableComponent,
    LookDirectionComponent,
    RotationComponent,
    VelocityComponent,
} from '@ecs/components';
import { PlayerPhysicsConfig } from '@renderer/core';

export interface RotationInput {
    yaw: number; // rotation around Y axis
    pitch: number; // rotation around X axis
    roll: number; // rotation around Z axis
}

export type MovementInput = THREE.Vector3;

export type MouseDelta = THREE.Vector2;

/**
 * MovementInputHandler interface defines the methods for mapping inputs to movement.
 * The purpose is to allow plugging in different input handling strategies.
 * such as inverted mouse look, FPS-style controls, or step-based controls.
 */
export interface MovementInputHandler {
    getMovementInput(
        deltaTime: number,
        input: InputControllableComponent,
        rotComp: RotationComponent | undefined,
    ): MovementInput;
}

export interface MovementOutputHandler {
    applyMovement(
        deltaTime: number,
        movementInput: MovementInput,
        lookDir: LookDirectionComponent | undefined,
        rotComp: RotationComponent | undefined,
        velComp: VelocityComponent,
        forceComp: ForceAccumulatorComponent,
        thrustForce: THREE.Vector3,
        playerConfig: PlayerPhysicsConfig,
        inputController: InputControllableComponent,
    ): void;
}

export interface RotationInputHandler {
    getRotationInput(
        deltaTime: number,
        input: InputControllableComponent,
        lookDir: LookDirectionComponent | undefined,
        rotComp: RotationComponent,
    ): RotationInput;
}

export interface RotationOutputHandler {
    applyRotation(
        deltaTime: number,
        rotationInput: RotationInput,
        lookDir: LookDirectionComponent | undefined,
        rotComp: RotationComponent,
    ): void;
}

// Base class for input handlers that use InputManager
export abstract class InputManagerBasedHandler
    implements
        MovementInputHandler,
        RotationInputHandler,
        RotationOutputHandler,
        MovementOutputHandler
{
    abstract getMovementInput(
        deltaTime: number,
        input: InputControllableComponent,
        rotComp: RotationComponent | undefined,
    ): MovementInput;

    abstract applyMovement(
        deltaTime: number,
        movementInput: MovementInput,
        lookDir: LookDirectionComponent,
        rotComp: RotationComponent | undefined,
        velComp: VelocityComponent,
        forceComp: ForceAccumulatorComponent,
        thrustForce: THREE.Vector3,
        playerConfig: PlayerPhysicsConfig,
        inputController: InputControllableComponent,
    ): void;

    abstract getRotationInput(
        deltaTime: number,
        input: InputControllableComponent,
        lookDir: LookDirectionComponent | undefined,
        rotComp: RotationComponent,
    ): RotationInput;

    abstract applyRotation(
        deltaTime: number,
        rotationInput: RotationInput,
        lookDir: LookDirectionComponent | undefined,
        rotComp: RotationComponent,
    ): void;
}
