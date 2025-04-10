// src/renderer/ecs/systems/VelocityGravitySystem.ts
import { System } from '@ecs/System';
import { World } from '@ecs/World';
import {
    ColliderComponent,
    GravityAffectedComponent,
    VelocityComponent,
} from '@ecs/components';
import { PhysicsConfigManager } from '@core/PhysicsConfigManager';

export class VelocityGravitySystem extends System {
    constructor(
        world: World,
        private physicsConfig: PhysicsConfigManager,
    ) {
        super(world);
    }

    update(deltaTime: number): void {
        const entities = this.world.queryEntities([
            GravityAffectedComponent,
            VelocityComponent,
        ]);
        const baseGravity = this.physicsConfig.getBaseGravity();

        for (const entity of entities) {
            const gravComp = this.world.getComponent(
                entity,
                GravityAffectedComponent,
            )!;
            const velComp = this.world.getComponent(entity, VelocityComponent)!;
            const collider = this.world.getComponent(entity, ColliderComponent); // Check if grounded

            // Apply gravity directly to velocity if not grounded
            if (!collider || !collider.onGround) {
                if (entity == 0 && Math.random() < 0.05)
                    console.dir('applying velocity gravity');
                velComp.value.y -=
                    baseGravity * gravComp.gravityMultiplier * deltaTime;
            }
        }
    }
}
