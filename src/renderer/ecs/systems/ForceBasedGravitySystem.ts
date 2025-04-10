// src/renderer/ecs/systems/ForceBasedGravitySystem.ts
import { System } from '@ecs/System';
import { World } from '@ecs/World';
import {
    ForceAccumulatorComponent,
    GodModeComponent,
    GravityAffectedComponent,
    MassComponent,
    MovementStateComponent,
} from '@ecs/components';
import { PhysicsConfigManager } from '@core/PhysicsConfigManager';
import * as THREE from 'three';
import { statsManager } from '@renderer/utils/CustomStats';

export class ForceBasedGravitySystem extends System {
    private gravityVector = new THREE.Vector3(0, -1, 0);

    constructor(
        world: World,
        private physicsConfig: PhysicsConfigManager,
    ) {
        super(world);
    }

    update(deltaTime: number): void {
        const entities = this.world.queryEntities([
            GravityAffectedComponent,
            MassComponent,
            ForceAccumulatorComponent,
        ]);
        const baseGravityMagnitude = this.physicsConfig.getBaseGravity();

        for (const entity of entities) {
            // --- Apply gravity only if not flying ---
            const stateComp = this.world.getComponent(
                entity,
                MovementStateComponent,
            )!;
            // @TODO not sure about this, seems like gravity would be opposed by some flying force
            if (stateComp.state !== 'flying') {
                const gravComp = this.world.getComponent(
                    entity,
                    GravityAffectedComponent,
                )!;
                const massComp = this.world.getComponent(
                    entity,
                    MassComponent,
                )!;
                const forceComp = this.world.getComponent(
                    entity,
                    ForceAccumulatorComponent,
                )!;
                const godMode = this.world.getComponent(
                    entity,
                    GodModeComponent,
                )!;
                if (godMode) return;

                // Calculate gravitational force: F = m * g * multiplier
                const gravityForce = this.gravityVector
                    .clone()
                    .multiplyScalar(
                        massComp.mass *
                            baseGravityMagnitude *
                            gravComp.gravityMultiplier,
                    );
                if (Math.random() < 0.05) {
                    // console.dir(statsManager.constructor.name);
                    // console.log(typeof statsManager);
                    // console.dir(statsManager);
                    //console.log(`sending ${Formatting.fVec3(gravityForce)}`);
                    // statsManager.addValue(
                    //     'force.x',
                    //     Math.abs(gravityForce.x),
                    // );
                    statsManager.addValue('force.y', Math.abs(gravityForce.y));
                    // statsManager.addValue(
                    //     'force.z',
                    //     Math.abs(gravityForce.z),
                    // );
                }
                // Add force to the accumulator
                forceComp.force.add(gravityForce);
            }
        }
    }
}
