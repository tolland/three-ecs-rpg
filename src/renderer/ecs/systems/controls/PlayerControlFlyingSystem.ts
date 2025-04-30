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
    PlayerControlGroundedComponent,
    RotationComponent,
    VelocityComponent,
} from '@ecs/components';
import * as THREE from 'three';
import { PhysicsConfigManager, PlayerPhysicsConfig } from '@core/PhysicsConfigManager';
import { appEventManager, AppEventManager } from '@core/index';
import { MovementStateComponent } from '@components/position/MovementStateComponent';
import { Entity } from '@ecs/Entity';
import { Formatting } from '@renderer/utils/formatting';
import { LoggingService } from '@systems/debug/LoggingService';
import { LogManager } from '@renderer/utils/ManagerLogger';
import { MovementInputHandler, RotationInputHandler } from '@systems/controls/InputHandlers';
import { FPSInputHandler } from '@systems/controls/FPSHandler';

const debugPCS = false;

/**
 * PlayerControlFlyingSystem
 *
 * Needs access to CameraSystem to get the focused view's configuration for orbit angles and camera orientation.
 */
@LogManager()
export class PlayerControlFlyingSystem extends System {
    private cameraRotationVertical = 0; // Store vertical rotation separately to clamp it
    private flyToggleDebounce = false;
    private movementInputHander?: MovementInputHandler;
    private rotationInputHandler?: RotationInputHandler;

    // Store reference to manager
    constructor(
        world: World,
        private physicsConfig: PhysicsConfigManager,
        private events: AppEventManager = appEventManager,
    ) {
        super(world);
    }

    registerDependencies() {
        this.rotationInputHandler = this.movementInputHander =
            new FPSInputHandler({
                lookSensitivity: 0.002,
                invertX: false,
                invertY: false,
            });
    }

    /**
     * Updates the player control system.
     * @param {number} deltaTime - The time elapsed since the last update.
     */
    update(deltaTime: number): void {
        const entities = this.world.queryEntities([
            ForceAccumulatorComponent,
            InputControllableComponent,
            LookDirectionComponent,
            MovementStateComponent,
            PlayerControlGroundedComponent,
            RotationComponent,
            VelocityComponent,
        ]);

        for (const entity of entities) {
            // @TODO erm this is a temp solution
            if (entities.length > 1 || entity !== entities[0]) {
                console.warn(
                    `PlayerControlSystem: More than one player controlled entity found or entity mismatch! ${entities.length}`,
                );
            }

            const {
                cameraTarget,
                collider,
                forceComp,
                input,
                lookDir,
                rot,
                stateComp,
                vel,
            } = this.world.getComponents(entity, {
                cameraTarget: CameraTargetComponent,
                collider: ColliderComponent,
                forceComp: ForceAccumulatorComponent,
                input: InputControllableComponent,
                lookDir: LookDirectionComponent,
                rot: RotationComponent,
                stateComp: MovementStateComponent,
                vel: VelocityComponent,
            });
            if (
                !cameraTarget ||
                !collider ||
                !forceComp ||
                !input! ||
                !lookDir ||
                !rot ||
                !stateComp! ||
                !vel
            )
                return;
            // if (Math.random() < 0.05)
            //     console.log(serializeForConsole(Serializer.serialize(input)));

            // Get rotation input
            const rotationInput = this.rotationInputHandler?.getRotationInput(
                deltaTime,
                input,
                lookDir,
            );

            this.applyRotation(
                deltaTime,
                rotationInput,

                lookDir,
                rot,
            );

            const playerCfg = this.physicsConfig.getPlayerConfig();
            const globalDamping = this.physicsConfig.getGlobalDamping();

            // Update look direction based on input
            this.handleLookDirection(
                input,
                lookDir,
                entity,
            );
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

            // if (Math.random() < 0.05)
            //     console.log(
            //         `${serializeForConsole(Serializer.serialize(movementInputActive))}`,
            //     );

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
            }
            forceComp.force.add(thrustForce);
            if (entity == 0 && Math.random() < 0.001 && debugPCS) {
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
                movementInputActive,
                rot,
                worldMoveDirection,
                entity,
            );
            // this.handlePlayerActions(entity);
        }
    }

    private applyRotation(
        deltaTime: number,
        rotationInput: any, // RotationInput
        lookDir: LookDirectionComponent,
        rot: RotationComponent,
    ) {
        rot.value.slerp(
            new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, -1),
                lookDir.value,
            ),
            0.15,
        );
    }

    /**
     * Handles camera rotation based on mouse input.
     * @param {InputControllableComponent} input - The input component.
     * @param lookDir
     * @param entity
     */
    private handleLookDirection(
        input: InputControllableComponent,
        lookDir: LookDirectionComponent,
        entity: Entity,
    ) {
        // if (Math.random() < 0.1) {
        //     console.log(
        //         `handleLookDirection input:  entity: ${entity} ${serializeForConsole(Serializer.serialize(input))} lookDir: ${serializeForConsole(Serializer.serialize(lookDir))} currentCameraMode: ${serializeForConsole(Serializer.serialize(currentCameraMode))} cameraTarget: ${serializeForConsole(Serializer.serialize(cameraTarget))}`,
        //     );
        // }

        if (input.pointerLocked) {
            const sensitivity = 0.002;

            const mouseDeltaX = input.mouseDelta.x * sensitivity;
            const mouseDeltaY = input.mouseDelta.y * sensitivity;

            // if (currentCameraMode === CameraMode.FIRST_PERSON) {
                const euler = new THREE.Euler(0, 0, 0, 'YXZ');
                euler.setFromQuaternion(lookDir.value);
                euler.y -= mouseDeltaX;
                euler.x -= mouseDeltaY;
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
     * @param lookDir
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

        const flyForward = new THREE.Vector3(0, 0, -1).applyQuaternion(
            lookDir.value,
        );
        const flyRight = new THREE.Vector3(1, 0, 0).applyQuaternion(
            lookDir.value,
        );
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
        movementInputActive: boolean,
        rot: RotationComponent,
        worldMoveDirection: THREE.Vector3,
        entity: Entity,
    ) {
        if (
            stateComp.state !== 'flying' &&
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
}
