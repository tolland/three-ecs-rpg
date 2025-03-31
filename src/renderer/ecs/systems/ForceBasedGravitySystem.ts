// src/renderer/ecs/systems/ForceBasedGravitySystem.ts
import { System } from '@ecs/System';
import { World } from '@ecs/World';
import {
    GravityAffectedComponent,
    MassComponent,
    ForceAccumulatorComponent,
    MovementStateComponent,
} from '@ecs/components';
import { PhysicsConfigManager } from '@core/PhysicsConfigManager';
import * as THREE from 'three';

export class ForceBasedGravitySystem extends System {
    private gravityVector = new THREE.Vector3(0, -1, 0);

    constructor(world: World, private physicsConfig: PhysicsConfigManager) { super(world); }

    update(deltaTime: number): void {
        const entities = this.world.queryEntities([GravityAffectedComponent, MassComponent, ForceAccumulatorComponent]);
        const baseGravityMagnitude = this.physicsConfig.getBaseGravity();

        for (const entity of entities) {
            // --- Apply gravity only if not flying ---
            const stateComp = this.world.getComponent(entity, MovementStateComponent)!;
            // @TODO not sure about this, seems like gravity would be opposed by some flying force
            if (stateComp.state !== 'flying') {
                const gravComp = this.world.getComponent(entity, GravityAffectedComponent)!;
                const massComp = this.world.getComponent(entity, MassComponent)!;
                const forceComp = this.world.getComponent(entity, ForceAccumulatorComponent)!;

                // Calculate gravitational force: F = m * g * multiplier
                const gravityForce = this.gravityVector.clone().multiplyScalar(
                    massComp.mass * baseGravityMagnitude * gravComp.gravityMultiplier
                );

                // Add force to the accumulator
                forceComp.force.add(gravityForce);
            }
        }
    }
}
