// src/renderer/ecs/systems/PhysicsSystem.ts
import { System } from '@ecs/System';
import { World } from '@ecs/World';
import {
    ColliderComponent,
    ForceAccumulatorComponent,
    GravityAffectedComponent,
    MassComponent,
    NeedsUpdateComponent,
    PositionComponent,
    VelocityComponent,
} from '@ecs/components';
import { PhysicsConfigManager } from '@core/PhysicsConfigManager';
import { statsManager } from '@renderer/utils/CustomStats';
import { PhysicsLogic } from '@renderer/logic/PhysicsLogic';
import { Entity } from '@ecs/Entity';
import { LoggingService } from '@shared/utils/LoggingService';

export class PhysicsSystem extends System {
    // Store reference to manager
    constructor(
        world: World,
        private physicsConfig: PhysicsConfigManager,
    ) {
        super(world);
    }

    update(deltaTime: number): void {
        const entities: Entity[] = this.world.queryEntities([
            PositionComponent,
            VelocityComponent,
            MassComponent,
            ForceAccumulatorComponent,
        ]);
        const globalDamping = this.physicsConfig.getGlobalDamping();
        const baseGravity = this.physicsConfig.getBaseGravity();

        for (const entity of entities) {
            const pos = this.world.getComponent(entity, PositionComponent)!;
            const vel = this.world.getComponent(entity, VelocityComponent)!;
            const massComp = this.world.getComponent(entity, MassComponent)!;
            const forceComp = this.world.getComponent(
                entity,
                ForceAccumulatorComponent,
            )!;
            const collider = this.world.getComponent(entity, ColliderComponent); // Optional

            const gravityComp = this.world.getComponent(
                entity,
                GravityAffectedComponent,
            );

            // --- Apply Ground Friction ---
            if (collider?.onGround && collider.groundNormal) {
                forceComp.force.add(
                    PhysicsLogic.calcGroundFriction(
                        vel.value,
                        massComp.mass,
                        deltaTime,
                    ),
                );
            }

            // --- Integration (using accumulated forces) ---
            if (massComp.mass > 0) {
                PhysicsLogic.calcVelocityFromForce(
                    forceComp.force,
                    massComp.mass,
                    deltaTime,
                    globalDamping,
                    vel.value,
                );
                if (entity == 0) {
                    // this.velocityStats.addValue(Math.round(vel.value.y));
                    if (Math.random() < 0.05) {
                        // console.dir(statsManager.constructor.name);
                        // console.log(typeof statsManager);
                        // console.dir(statsManager);
                        //console.log(`sending vel ${Formatting.fVec3(vel.value)}`);
                        // statsManager.addValue(
                        //     'velocity.x',
                        //     vel.value.x,
                        // );
                        LoggingService.getInstance().logVectorUpdate({
                            entityId: entity,
                            type: 'velocity',
                            x: vel.value.x,
                            y: vel.value.y,
                            z: vel.value.z,
                            timestamp: Date.now(),
                        });
                        statsManager.addValue('velocity.y', vel.value.y);
                        // statsManager.addValue(
                        //     'velocity.z',
                        //     vel.value.z,
                        // );
                    }
                }
            }

            // 4. Update position: p += v * dt
            pos.value.addScaledVector(vel.value, deltaTime);
            if (entity == 0 && Math.random() < 0.05) {
                // console.dir(statsManager.constructor.name);
                // console.log(typeof statsManager);
                // console.dir(statsManager);
                // console.log(`sending pos ${Formatting.fVec3(pos.value)}`);
                LoggingService.getInstance().logVectorUpdate({
                    entityId: entity,
                    type: 'velocity',
                    x: vel.value.x,
                    y: vel.value.y,
                    z: vel.value.z,
                    timestamp: Date.now(),
                });
                // statsManager.addValue(
                //     'velocity.x',
                //     vel.value.x,
                // );
                // statsManager.addValue(
                //     'velocity.y',
                //     vel.value.y,
                // );
                // statsManager.addValue(
                //     'velocity.z',
                //     vel.value.z,
                // );
            }

            // 5. Clear force accumulator for next frame
            forceComp.force.set(0, 0, 0);

            // Mark for render update
            this.world.addComponent(entity, new NeedsUpdateComponent());
        }
        // statsManager.update();
    }
}
