import { System } from '@ecs/System';
import { World } from '@ecs/World';
import { PositionComponent, VelocityComponent, GravityAffectedComponent, ColliderComponent } from '@ecs/components'; // Import all needed components
import { NeedsUpdateComponent } from '@ecs/components/NeedsUpdateComponent';
import * as CORE from '@core/Constants'; // Import constants (e.g., GRAVITY)
import { PhysicsConfigManager } from '@core/PhysicsConfigManager';

export class PhysicsSystem extends System {
    // Store reference to manager
    constructor(world: World, private physicsConfig: PhysicsConfigManager) {
         super(world);
    }

    update(deltaTime: number): void {
        const entities = this.world.queryEntities([PositionComponent, VelocityComponent]);
        const baseGravity = this.physicsConfig.getBaseGravity(); // Get value
        const globalDamping = this.physicsConfig.getGlobalDamping(); // Get value

        for (const entity of entities) {
            const pos = this.world.getComponent(entity, PositionComponent)!;
            const vel = this.world.getComponent(entity, VelocityComponent)!;
            const collider = this.world.getComponent(entity, ColliderComponent); // Optional

            const gravityComp = this.world.getComponent(entity, GravityAffectedComponent); // Already getting this for multiplier

            // 1. Apply Gravity
            if (gravityComp) { // Check if entity has the component
                if (!collider || !collider.onGround) {
                    // Use configured base gravity and per-entity multiplier
                    vel.value.y -= baseGravity * gravityComp.gravityMultiplier * deltaTime;
                }
            } // Else: no gravity component, no gravity applied

            // 2. Update position based on velocity
            const deltaPosition = vel.value.clone().multiplyScalar(deltaTime);
            pos.value.add(deltaPosition);

            // Apply horizontal damping - PlayerControlSystem handles specific player stopping damping
            // This global damping affects NPCs or objects not controlled by PlayerControlSystem
             vel.value.x *= (1 - globalDamping * deltaTime);
             vel.value.z *= (1 - globalDamping * deltaTime);

            // 3. Apply Damping (Only if not on ground? Or always apply some horizontal?)
            // Let's apply horizontal damping always, and vertical if not on ground
            if(!collider?.onGround) {
                vel.value.y *= (1 - globalDamping * deltaTime);
            }

            // 4. Mark for render update (if it moved)
            if (deltaPosition.lengthSq() > 0.0001) {
                // Ensure component exists before adding (add it if PositionComponent is added)
                if (!this.world.hasComponent(entity, NeedsUpdateComponent)) {
                    this.world.addComponent(entity, new NeedsUpdateComponent());
                }
            }

            // Reset onGround status before collision check next frame
            if (collider) {
                collider.onGround = false;
                collider.collisions = []; // Clear previous collision results
            }
        }
    }
}