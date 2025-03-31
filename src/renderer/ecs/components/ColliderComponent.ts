// src/renderer/ecs/components/ColliderComponent.ts
import { Component } from '@ecs/Component';
import * as THREE from 'three';

// We might need more sophisticated shapes later
export class ColliderComponent extends Component {
    public groundNormal: THREE.Vector3 | null = null; // Store normal of the ground surface hit

    constructor(
        // Using a simple shape for now, like a capsule or sphere
        // This might store parameters or even a THREE geometry/helper
        public shape: 'capsule' | 'sphere' | 'box' = 'capsule',
        public radius: number = 0.5, // Example property
        public height: number = 1.8, // Example for capsule
        public offset = new THREE.Vector3(0, 0, 0), // Offset from entity position
        public onGround: boolean = false, // State often needed by physics/collision
        public timeCollisionDelta: number = 0,
        public timeCollisionDeltaLimit: number = 0.1,
        public collisions: {
            entity: number | null;
            normal: THREE.Vector3;
        }[] = [],
    ) {
        super();
    }

    public collisionTimeCheck(): boolean {
        return this.timeCollisionDelta > this.timeCollisionDeltaLimit;
    }
}
