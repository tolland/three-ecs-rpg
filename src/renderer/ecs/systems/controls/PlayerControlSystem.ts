// src/renderer/ecs/systems/controls/PlayerControlSystem.ts
import { System } from '@ecs/System';
import { World } from '@ecs/World';
import {
    ColliderComponent,
    ForceAccumulatorComponent,
    InputControllableComponent,
    LookDirectionComponent,
    NeedsUpdateComponent,
    PlayerControlComponent,
    RotationComponent,
    VelocityComponent,
} from '@ecs/components';
import * as THREE from 'three';
import { PhysicsConfigManager } from '@core/PhysicsConfigManager';
import { appEventManager, AppEventManager } from '@core/index';
import { MovementStateComponent } from '@components/position/MovementStateComponent';
import { Formatting } from '@renderer/utils/formatting';
import { LoggingService } from '@systems/debug/LoggingService';
import { LogManager } from '@renderer/utils/ManagerLogger';
import {
    MovementInputHandler,
    MovementOutputHandler,
    RotationInputHandler,
    RotationOutputHandler,
} from '@systems/controls/InputHandlers';
import { FPSInputHandler } from '@systems/controls/FPSHandler';

const debugPCS = false;

/**
 * PlayerControlSystem
 *
 * Needs access to CameraSystem to get the focused view's configuration for orbit angles and camera orientation.
 */
@LogManager()
export class PlayerControlSystem extends System {
    private movementInputHandler?: MovementInputHandler;
    private rotationInputHandler?: RotationInputHandler;
    private rotationOutputHandler?: RotationOutputHandler;
    private movementOutputHandler?: MovementOutputHandler;

    constructor(
        world: World,
        private physicsConfig: PhysicsConfigManager,
        private events: AppEventManager = appEventManager,
    ) {
        super(world);
    }

    registerDependencies() {
        this.rotationInputHandler =
            this.movementInputHandler =
            this.movementOutputHandler =
            this.rotationOutputHandler =
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
            InputControllableComponent, // get the inputs from events
            PlayerControlComponent, // this is the entity being controlled
            ForceAccumulatorComponent,
            LookDirectionComponent,
            RotationComponent,
            VelocityComponent,
        ]);

        for (const entity of entities) {
            if (entities.length > 1 || entity !== entities[0]) {
                console.warn(
                    `PlayerControlSystem: More than one player controlled entity found or entity mismatch! ${entities.length}`,
                );
            }

            const {
                collider,
                forceComp,
                inputController,
                lookDir,
                rotationComp,
                velComp,
                stateComp,
            } = this.world.getComponents(entity, {
                collider: ColliderComponent,
                forceComp: ForceAccumulatorComponent,
                inputController: InputControllableComponent,
                lookDir: LookDirectionComponent,
                rotationComp: RotationComponent,
                velComp: VelocityComponent,
                stateComp: MovementStateComponent,
            });
            if (
                !collider ||
                !forceComp ||
                !inputController! ||
                !lookDir ||
                !rotationComp ||
                !velComp
            )
                throw new Error('Missing required components');
            // if (Math.random() < 0.05)
            //     console.log(serializeForConsole(Serializer.serialize(input)));

            // Get rotation input
            const rotationInput = this.rotationInputHandler?.getRotationInput(
                deltaTime,
                inputController,
                lookDir,
            );

            if (rotationInput)
                this.rotationOutputHandler?.applyRotation(
                    deltaTime,
                    rotationInput,
                    lookDir,
                    rotationComp,
                );

            // Get rotation input
            const movementInput = this.movementInputHandler?.getMovementInput(
                deltaTime,
                inputController,
                lookDir,
            );

            const thrustForce = new THREE.Vector3();

            const playerCfg = this.physicsConfig.getPlayerConfig();

            if (movementInput) {
                this.movementOutputHandler?.applyMovement(
                    deltaTime,
                    movementInput,
                    lookDir,
                    rotationComp,
                    velComp,
                    forceComp,
                    thrustForce,
                    playerCfg,
                    inputController,
                );
            }

            // if (Math.random() < 0.05)
            //     console.log(
            //         `${serializeForConsole(Serializer.serialize(movementInputActive))}`,
            //     );

            this.handleJumping(
                inputController,
                collider?.onGround ?? false,
                velComp,
                stateComp,
                entity,
            );

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

            // this.handlePlayerActions(entity);
            this.world.addComponent(entity, new NeedsUpdateComponent());
        }
    }

    /**
     * Handles jumping based on input and ground status.
     * @param {InputControllableComponent} input - The input component.
     * @param {boolean} isOnGround - Whether the player is on the ground.
     * @param {VelocityComponent} velocityComponent - The velocity component.
     * @param {MovementStateComponent} stateComp - The movement state component.
     * @param {number} entity - The entity ID.
     */
    private handleJumping(
        input: InputControllableComponent,
        isOnGround: boolean,
        velocityComponent: VelocityComponent,
        stateComp: MovementStateComponent | undefined,
        entity: number,
    ) {
        if (input.actions.jump && isOnGround) {
            velocityComponent.value.y =
                this.physicsConfig.getPlayerConfig().jumpForce;

            if(stateComp)
                stateComp.state = 'jumping';

            this.events.emit('PLAYER_ACTION' as any, {
                entityId: entity,
                action: 'JUMP',
            });
            console.log('State -> jumping');
        }
    }
}
