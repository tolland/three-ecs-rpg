// src/renderer/ecs/systems/WindSystem.ts
import { System } from '@ecs/System';
import { World } from '@ecs/World';
import { VelocityComponent, WindAffectedComponent } from '@ecs/components';
import * as THREE from 'three';

export class WindSystem extends System {
    // TODO: Make this configurable (PhysicsConfigManager or dedicated WeatherSystem?)
    private windVector: THREE.Vector3 = new THREE.Vector3(1.5, 0, 0.5); // Gentle wind from X/Z direction
    private time: number = 0; // For simulating gusts

    // Optional: Inject config manager if wind vector is stored there
    // constructor(world: World, private physicsConfig: PhysicsConfigManager) {
    constructor(world: World) {
        super(world);
    }

    update(deltaTime: number): void {
        this.time += deltaTime;

        // --- Optional: Simulate Gusts ---
        // Make wind strength vary over time using a sine wave
        const baseStrength = 1.5; // Base strength from config or hardcoded
        const gustStrength = (1.0 * (Math.sin(this.time * 0.5) + 1)) / 2; // Slow sine wave [0, 1]
        const currentWindStrength = baseStrength + gustStrength;
        const currentWind = this.windVector
            .clone()
            .normalize()
            .multiplyScalar(currentWindStrength);
        // --- End Gust Simulation ---
        // If not simulating gusts, just use: const currentWind = this.windVector;

        const entities = this.world.queryEntities([
            VelocityComponent,
            WindAffectedComponent,
        ]);

        for (const entity of entities) {
            const vel = this.world.getComponent(entity, VelocityComponent)!;
            const windComp = this.world.getComponent(
                entity,
                WindAffectedComponent,
            )!;

            // Apply wind force, scaled by resistance and delta time
            // Ensure resistance is not zero to avoid division issues
            const resistanceFactor = Math.max(0.1, windComp.resistance); // Prevent <= 0 resistance
            const windForce = currentWind
                .clone()
                .multiplyScalar(1 / resistanceFactor);

            vel.value.addScaledVector(windForce, deltaTime);

            // Mark entity for update if velocity changed significantly (optional)
            // if (windForce.lengthSq() > 0.001) {
            //    this.world.addComponent(entity, new NeedsUpdateComponent());
            // }
        }
    }
}
