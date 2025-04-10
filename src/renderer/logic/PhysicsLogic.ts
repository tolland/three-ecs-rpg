// src/renderer/logic/PhysicsLogic.ts
import * as THREE from 'three';

export class PhysicsLogic {
    /**
     * Calculate ground friction and apply it to the given velocity.
     *
     * Apply Ground Friction (Direct Velocity Modification - Simpler)
     *
     * @param {THREE.Vector3} velocity - The current velocity of the entity.
     * @param {number} mass - The mass of the entity.
     * @param {number} deltaTime - The time step for the simulation.
     */
    static calcGroundFriction(
        velocity: THREE.Vector3,
        mass: number,
        deltaTime: number,
    ): THREE.Vector3 {
        // TODO: Get friction coefficient based on groundNormal or material later
        // For now, use a constant friction value when grounded
        let groundFriction = 5.0 * deltaTime; // Tune this value (higher = more friction)

        // Apply friction against horizontal velocity
        const horizontalVel = new THREE.Vector3(velocity.x, 0, velocity.z);

        const frictionMagnitude = Math.min(
            horizontalVel.length() / deltaTime,
            groundFriction * mass * 9.81,
        ); // Simplified friction limit approximation
        return horizontalVel
            .clone()
            .normalize()
            .multiplyScalar(-frictionMagnitude);
    }

    /**
     * Calculate updated velocity from force, mass and deltaTime
     *
     * Apply Ground Friction (Direct Velocity Modification - Simpler)
     *
     * @param {THREE.Vector3} force
     * @param {number} mass - The mass of the entity.
     * @param {number} deltaTime - The time step for the simulation.
     * @param {number} globalDamping
     * @param {THREE.Vector3} outVector
     */
    static calcVelocityFromForce(
        force: THREE.Vector3,
        mass: number,
        deltaTime: number,
        globalDamping: number = 0,
        outVector: THREE.Vector3 | undefined,
    ): THREE.Vector3 {
        if (mass == 0) throw new Error('Mass cannot be zero');
        if (!outVector) outVector = new THREE.Vector3();
        // console.log(`in down velocity: ${outVector.y}`);
        // 1. Calculate acceleration: a = F / m
        const acceleration = force.clone().multiplyScalar(1 / mass);

        const befVec = outVector.clone();
        // 2. Update velocity: v += a * dt
        outVector.addScaledVector(acceleration, deltaTime);
        const afVec = outVector.clone();

        // 3. Apply Air Damping (non-ground velocity damping)
        // Make damping velocity-dependent for more realism (e.g., linear or quadratic)
        const dampingFactor = 1.0 - globalDamping * deltaTime; // Simple linear damping
        outVector.multiplyScalar(dampingFactor);
        //console.log(`out down velocity: ${outVector.y}`);
        //if (Math.random() < 0.02) console.log(`velocity ${befVec.y.toFixed(3)} -> ${outVector.y.toFixed(3)}-> ${outVector.y.toFixed(3)}`);
        return outVector;
    }

    /**
     * Generate a sine wave value between -100 and 100 with a period of 60 seconds.
     *
     * @param {number} time - The current time in milliseconds.
     * @param amplitude
     * @param period
     * @returns {number} - The sine wave value.
     */
    static generateSineWave(
        time: number,
        amplitude: number = 100,
        period: number = 60000,
    ): number {
        const frequency = (2 * Math.PI) / period;
        return amplitude * Math.sin(frequency * time);
    }
}
