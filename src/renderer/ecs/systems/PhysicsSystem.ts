// src/renderer/ecs/systems/PhysicsSystem.ts
import { System } from '@ecs/System';
import { World } from '@ecs/World';
import {
    ColliderComponent,
    GravityAffectedComponent,
    PositionComponent,
    VelocityComponent,
} from '@ecs/components';
import { NeedsUpdateComponent } from '@ecs/components';
import { PhysicsConfigManager } from '@core/PhysicsConfigManager';
import { MassComponent, ForceAccumulatorComponent /* ... other comps ... */ } from '@ecs/components';
import * as THREE from 'three';

export class PhysicsSystem extends System {
    // Store reference to manager
    constructor(
        world: World,
        private physicsConfig: PhysicsConfigManager,
    ) {
        super(world);
    }

    update(deltaTime: number): void {
        const entities = this.world.queryEntities([
            PositionComponent, VelocityComponent, MassComponent, ForceAccumulatorComponent
        ]);
        const globalDamping = this.physicsConfig.getGlobalDamping();
        const baseGravity = this.physicsConfig.getBaseGravity();


        for (const entity of entities) {
            const pos = this.world.getComponent(entity, PositionComponent)!;
            const vel = this.world.getComponent(entity, VelocityComponent)!;
            const massComp = this.world.getComponent(entity, MassComponent)!;
            const forceComp = this.world.getComponent(entity, ForceAccumulatorComponent)!;
            const collider = this.world.getComponent(entity, ColliderComponent); // Optional

            const gravityComp = this.world.getComponent(
                entity,
                GravityAffectedComponent,
            );

            // --- Apply Ground Friction (Direct Velocity Modification - Simpler) ---
            let groundFriction = 0.0; // Assume no friction initially
            if (collider?.onGround && collider.groundNormal) {
                // TODO: Get friction coefficient based on groundNormal or material later
                // For now, use a constant friction value when grounded
                groundFriction = 5.0 * deltaTime; // Tune this value (higher = more friction)
                // Apply friction against horizontal velocity
                const horizontalVel = new THREE.Vector3(vel.value.x, 0, vel.value.z);
                const frictionMagnitude = Math.min(horizontalVel.length() / deltaTime, groundFriction * massComp.mass * 9.81); // Simplified friction limit approximation
                const frictionForce = horizontalVel.clone().normalize().multiplyScalar(-frictionMagnitude);
                forceComp.force.add(frictionForce); // Add friction to accumulator for this frame
            }

            // --- Integration (using accumulated forces) ---
            if (massComp.mass > 0) {
                // 1. Calculate acceleration: a = F / m
                const acceleration = forceComp.force.clone().multiplyScalar(1 / massComp.mass);

                // 2. Update velocity: v += a * dt
                vel.value.addScaledVector(acceleration, deltaTime);

                // 3. Apply Air Damping (non-ground velocity damping)
                // Make damping velocity-dependent for more realism (e.g., linear or quadratic)
                const dampingFactor = 1.0 - (globalDamping * deltaTime); // Simple linear damping
                vel.value.multiplyScalar(dampingFactor);
            }
            // 4. Update position: p += v * dt
            pos.value.addScaledVector(vel.value, deltaTime);


            // 5. Clear force accumulator for next frame
            forceComp.force.set(0, 0, 0);


            // Mark for render update
            this.world.addComponent(entity, new NeedsUpdateComponent());
        }
    }
}
