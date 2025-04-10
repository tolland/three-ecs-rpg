import { System } from '@ecs/System';
import { World } from '@ecs/World';
import {
    CameraMode,
    CameraTargetComponent,
    ColliderComponent,
    ForceAccumulatorComponent,
    InputControllableComponent,
    LookDirectionComponent,
    NeedsUpdateComponent,
    PlayerControlledComponent,
    RotationComponent,
    VelocityComponent,
} from '@ecs/components';
import * as THREE from 'three';
import { PhysicsConfigManager, PlayerPhysicsConfig } from '@core/PhysicsConfigManager';
import { appEventManager, AppEventManager, InputManager } from '@renderer/core';
import { InputAction } from '@shared/core/InputActions';
import { MovementStateComponent } from '@components/MovementStateComponent';
import { CameraSystem } from '@systems/CameraSystem';
import { Entity } from '@ecs/Entity';
import { Formatting } from '@renderer/utils/formatting';
import { LoggingService } from '@systems/LoggingService';

/**
 * PlayerControlSystem
 *
 * Needs access to CameraSystem to get the focused view's configuration for orbit angles and camera orientation.
 */
export class PlayerControlSystem extends System {
    private cameraRotationVertical = 0; // Store vertical rotation separately to clamp it
    private flyToggleDebounce = false;
    private cameraSystem: CameraSystem | undefined;

    // Store reference to manager
    constructor(
        world: World,
        private physicsConfig: PhysicsConfigManager,
        private events: AppEventManager = appEventManager,
        private inputManager: InputManager,
    ) {
        super(world);
    }

    registerDependencies() {
        this.cameraSystem = this.world.getSystem(CameraSystem);
    }

    /**
     * Updates the player control system.
     * @param {number} deltaTime - The time elapsed since the last update.
     */
    update(deltaTime: number): void {
        if (!this.cameraSystem) return;

        const focusedView = this.cameraSystem.getFocusedActiveView();
        if (!focusedView) return; // No view has focus

        const viewConfig = this.cameraSystem.getViewConfiguration(
            focusedView.viewConfigId,
        );

        if (
            !viewConfig ||
            viewConfig.mode === 'FREECAM' ||
            viewConfig.targetEntity === null
        ) {
            // This system only controls entities linked to
            // non-freecam focused views
            return;
        }

        const entity = viewConfig.targetEntity; // The entity being controlled
        if (!this.world.hasComponent(entity, PlayerControlledComponent)) {
            return; // Only act if the target entity is marked as player controlled
        }

        // Ensure entity has LookDirectionComponent
        if (!this.world.hasComponent(entity, LookDirectionComponent)) {
            this.world.addComponent(entity, new LookDirectionComponent());
        }

        const entities = this.world.queryEntities([
            PlayerControlledComponent,
            VelocityComponent,
            RotationComponent,
            LookDirectionComponent,
            InputControllableComponent,
            MovementStateComponent,
            ForceAccumulatorComponent,
        ]);

        if (entities.length === 0) return;

        // @TODO erm this is a temp solution
        if (entities.length > 1 || entity !== entities[0]) {
            console.warn(
                'PlayerControlSystem: More than one player controlled entity found or entity mismatch!',
            );
        }

        const vel = this.world.getComponent(entity, VelocityComponent)!;
        const rot = this.world.getComponent(entity, RotationComponent)!;
        const lookDir = this.world.getComponent(entity, LookDirectionComponent)!;
        const input = this.world.getComponent(
            entity,
            InputControllableComponent,
        )!;
        const stateComp = this.world.getComponent(
            entity,
            MovementStateComponent,
        )!;
        const forceComp = this.world.getComponent(
            entity,
            ForceAccumulatorComponent,
        )!;
        const collider = this.world.getComponent(entity, ColliderComponent); // Need for jump check
        const cameraTarget = this.world.getComponent(
            entity,
            CameraTargetComponent,
        ); // Get camera target info

        const currentCameraMode = cameraTarget?.mode ?? CameraMode.FIRST_PERSON;
        const playerCfg = this.physicsConfig.getPlayerConfig();
        const globalDamping = this.physicsConfig.getGlobalDamping();

        // Update look direction based on input
        this.handleLookDirection(input, lookDir, currentCameraMode, cameraTarget);
        this.handleStateTransition(stateComp, collider);
        this.handleFlyingToggle(input, stateComp, vel);

        const thrustForce = new THREE.Vector3();
        const movementInputActive =
            input.actions.forward ||
            input.actions.backward ||
            input.actions.left ||
            input.actions.right ||
            input.actions.orbitLeft ||
            input.actions.orbitRight ||
            input.actions.rotateLeft ||
            input.actions.rotateRight;
        const worldMoveDirection = new THREE.Vector3();

        if (stateComp.state === 'flying') {
            this.handleFlyingControls(
                entity,
                input,
                playerCfg,
                vel,
                forceComp,
                thrustForce,
                lookDir,
            );
        } else {
            this.handleGroundedControls(
                input,
                playerCfg,
                deltaTime,
                lookDir,
                currentCameraMode,
                cameraTarget,
                vel,
                forceComp,
                thrustForce,
                worldMoveDirection,
                movementInputActive,
            );
            this.handleJumping(
                input,
                collider?.onGround ?? false,
                vel,
                stateComp,
                entity,
            );
        }
        forceComp.force.add(thrustForce);
        if (entity == 0 && Math.random() < 0.001) {
            console.log(
                `thrustForce after forceComp = ${Formatting.fVec3(thrustForce)} forceComp.force = ${Formatting.fVec3(forceComp.force)}`,
            );
        }
        LoggingService.getInstance().logVectorUpdate({
            entityId: entity,
            type: 'force',
            x: forceComp.force.x,
            y: forceComp.force.y,
            z: forceComp.force.z,
            timestamp: Date.now(),
        });
        this.handlePlayerRotation(
            stateComp,
            currentCameraMode,
            movementInputActive,
            rot,
            worldMoveDirection,
            entity,
        );
        this.handlePlayerActions(entity);
    }

    /**
     * Handles camera rotation based on mouse input.
     * @param {Entity} entity - The entity to update.
     * @param {InputControllableComponent} input - The input component.
     * @param {RotationComponent} rot - The rotation component.
     * @param {CameraTargetComponent | undefined} cameraTarget - The camera target component.
     * @param {CameraMode} currentCameraMode - The current camera mode.
     * @param viewConfig
     */
    private handleLookDirection(
        input: InputControllableComponent,
        lookDir: LookDirectionComponent,
        currentCameraMode: CameraMode,
        cameraTarget: CameraTargetComponent | undefined,
    ) {
        if (input.pointerLocked) {
            const sensitivity = 0.002;

            const mouseDeltaX = input.mouseDelta.x * sensitivity;
            const mouseDeltaY = input.mouseDelta.y * sensitivity;

            if (currentCameraMode === CameraMode.FIRST_PERSON) {
                const euler = new THREE.Euler(0, 0, 0, 'YXZ');
                euler.setFromQuaternion(lookDir.value);
                euler.y -= mouseDeltaX;
                euler.x -= mouseDeltaY;
                euler.x = Math.max(
                    -Math.PI / 2 + 0.1,
                    Math.min(Math.PI / 2 - 0.1, euler.x),
                ); // Clamp pitch
                lookDir.value.setFromEuler(euler);
            } else if (cameraTarget) {
                cameraTarget.orbitAngles.x -= mouseDeltaX; // Azimuth
                cameraTarget.orbitAngles.y -= mouseDeltaY; // Pitch
                cameraTarget.orbitAngles.y = Math.max(
                    cameraTarget.minPitch,
                    Math.min(cameraTarget.maxPitch, cameraTarget.orbitAngles.y),
                ); // Clamp pitch
            }
        }
    }

    /**
     * Handles state transitions based on the player's movement state and collider status.
     *
     * @param {MovementStateComponent} stateComp - The movement state component.
     * @param {ColliderComponent | undefined} collider - The collider component.
     */
    private handleStateTransition(
        stateComp: MovementStateComponent,
        collider: ColliderComponent | undefined,
    ) {
        const isOnGround = collider?.onGround ?? false; // Read current ground status

        if (isOnGround && stateComp.state !== 'grounded') {
            stateComp.state = 'grounded';
            console.log('%cState -> grounded', 'color: green');
        } else if (!isOnGround && stateComp.state === 'grounded') {
            stateComp.state = 'falling';
            console.log('%cState -> falling', 'color: blue');
        }
    }

    /**
     * Toggles the flying state based on input.
     * @param {InputControllableComponent} input - The input component.
     * @param {MovementStateComponent} stateComp - The movement state component.
     * @param {VelocityComponent} vel - The velocity component.
     */
    private handleFlyingToggle(
        input: InputControllableComponent,
        stateComp: MovementStateComponent,
        vel: VelocityComponent,
    ) {
        const jumpPressed = input.actions.jump;
        if (jumpPressed && !this.flyToggleDebounce) {
            this.flyToggleDebounce = true;
            if (stateComp.state === 'flying') {
                stateComp.state = 'falling';
                console.log('State -> falling (stopped flying)');
            } else if (
                stateComp.state === 'falling' ||
                stateComp.state === 'jumping'
            ) {
                stateComp.state = 'flying';
                vel.value.y = Math.max(0, vel.value.y);
                console.log('State -> flying');
            }
        } else if (!jumpPressed) {
            this.flyToggleDebounce = false;
        }
    }

    /**
     * Handles controls while the player is flying.
     * @param entity
     * @param {InputControllableComponent} input - The input component.
     * @param {any} playerCfg - The player configuration.
     * @param {VelocityComponent} vel - The velocity component.
     * @param {ForceAccumulatorComponent} forceComp - The force accumulator component.
     * @param {THREE.Vector3} thrustForce - The thrust force vector.
     */
    private handleFlyingControls(
        entity: Entity,
        input: InputControllableComponent,
        playerCfg: PlayerPhysicsConfig,
        vel: VelocityComponent,
        forceComp: ForceAccumulatorComponent,
        thrustForce: THREE.Vector3,
        lookDir: LookDirectionComponent,
    ) {
        const flySpeed = playerCfg.runSpeed;
        const flyVerticalSpeed = playerCfg.walkSpeed;
        const flyDamping = 2.0;

        const flyForward = new THREE.Vector3(0, 0, -1).applyQuaternion(lookDir.value);
        const flyRight = new THREE.Vector3(1, 0, 0).applyQuaternion(lookDir.value);
        const flyUp = new THREE.Vector3(0, 1, 0);

        let flyDirection = new THREE.Vector3();
        if (input.actions.forward) flyDirection.add(flyForward);
        if (input.actions.backward) flyDirection.sub(flyForward);
        if (input.actions.left) flyDirection.sub(flyRight);
        if (input.actions.right) flyDirection.add(flyRight);
        if (input.actions.run) flyDirection.add(flyUp);
        if (input.actions.crouch) flyDirection.sub(flyUp);

        flyDirection.normalize();
        thrustForce.copy(flyDirection).multiplyScalar(flySpeed);

        const dampingForce = vel.value.clone().multiplyScalar(-flyDamping);
        forceComp.force.add(dampingForce);
    }

    /**
     * Handles controls while the player is grounded.
     * @param {InputControllableComponent} input - The input component.
     * @param {any} playerCfg - The player configuration.
     * @param {number} deltaTime - The time elapsed since the last update.
     * @param {RotationComponent} rot - The rotation component.
     * @param {CameraMode} currentCameraMode - The current camera mode.
     * @param {CameraTargetComponent | undefined} cameraTarget - The camera target component.
     * @param {VelocityComponent} vel - The velocity component.
     * @param {ForceAccumulatorComponent} forceComp - The force accumulator component.
     * @param {THREE.Vector3} thrustForce - The thrust force vector.
     * @param {THREE.Vector3} worldMoveDirection - The world move direction vector.
     * @param {boolean} movementInputActive - Whether movement input is active.
     */
    private handleGroundedControls(
        input: InputControllableComponent,
        playerCfg: PlayerPhysicsConfig,
        deltaTime: number,
        lookDir: LookDirectionComponent,
        currentCameraMode: CameraMode,
        cameraTarget: CameraTargetComponent | undefined,
        vel: VelocityComponent,
        forceComp: ForceAccumulatorComponent,
        thrustForce: THREE.Vector3,
        worldMoveDirection: THREE.Vector3,
        movementInputActive: boolean,
    ) {
        const targetSpeed = input.actions.run
            ? playerCfg.runSpeed
            : playerCfg.walkSpeed;
        const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(lookDir.value);
        const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(lookDir.value);

        if (input.actions.forward) worldMoveDirection.add(forwardVector);
        if (input.actions.backward) worldMoveDirection.sub(forwardVector);
        if (input.actions.left) worldMoveDirection.sub(rightVector);
        if (input.actions.right) worldMoveDirection.add(rightVector);

        worldMoveDirection.y = 0;
        worldMoveDirection.normalize();

        if (movementInputActive) {
            const currentHorizontalVel = new THREE.Vector3(
                vel.value.x,
                0,
                vel.value.z,
            );
            const desiredVel = worldMoveDirection
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

    /**
     * Handles jumping based on input and ground status.
     * @param {InputControllableComponent} input - The input component.
     * @param {boolean} isOnGround - Whether the player is on the ground.
     * @param {VelocityComponent} vel - The velocity component.
     * @param {MovementStateComponent} stateComp - The movement state component.
     * @param {number} entity - The entity ID.
     */
    private handleJumping(
        input: InputControllableComponent,
        isOnGround: boolean,
        vel: VelocityComponent,
        stateComp: MovementStateComponent,
        entity: number,
    ) {
        if (input.actions.jump && isOnGround) {
            vel.value.y = this.physicsConfig.getPlayerConfig().jumpForce;
            stateComp.state = 'jumping';
            this.events.emit('PLAYER_ACTION' as any, {
                entityId: entity,
                action: 'JUMP',
            });
            console.log('State -> jumping');
        }
    }

    /**
     * Handles player rotation based on movement and camera mode.
     * @param {MovementStateComponent} stateComp - The movement state component.
     * @param {CameraMode} currentCameraMode - The current camera mode.
     * @param {boolean} movementInputActive - Whether movement input is active.
     * @param {RotationComponent} rot - The rotation component.
     * @param {THREE.Vector3} worldMoveDirection - The world move direction vector.
     * @param {number} entity - The entity ID.
     */
    private handlePlayerRotation(
        stateComp: MovementStateComponent,
        currentCameraMode: CameraMode,
        movementInputActive: boolean,
        rot: RotationComponent,
        worldMoveDirection: THREE.Vector3,
        entity: number,
    ) {
        if (
            stateComp.state !== 'flying' &&
            currentCameraMode !== CameraMode.FIRST_PERSON &&
            movementInputActive
        ) {
            const targetRotation = new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, -1),
                worldMoveDirection,
            );
            rot.value.slerp(targetRotation, 0.15);
            this.world.addComponent(entity, new NeedsUpdateComponent());
        }
    }

    /**
     * Handles player actions based on input.
     * @param {number} entity - The entity ID.
     */
    private handlePlayerActions(entity: number) {
        if (this.inputManager.getActionState(InputAction.INTERACT)) {
            this.events.emit('PLAYER_ACTION' as any, {
                entityId: entity,
                action: 'SAY_HELLO',
            });
        }
    }
}
