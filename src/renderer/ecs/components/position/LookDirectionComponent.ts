// src/renderer/ecs/components/position/LookDirectionComponent.ts
import { Component } from '@ecs/Component';
import * as THREE from 'three';

/**
 * LookDirectionComponent
 *
 * Stores the entity's look direction, independent of the camera system.
 * This allows for decoupling player controls from camera behavior.
 */
export class LookDirectionComponent extends Component {
    // constructor(public value = new THREE.Quaternion()) {
    //     super();
    // }
    constructor(
        public orbitAngles = new THREE.Vector2(0, Math.PI / 6),
        public minPitch: number = -Math.PI / 3, // Limit looking down
        public maxPitch: number = Math.PI / 2 - 0.1, // Limit looking up
    ) {
        super();
    }
}

// X: Azimuth (horizontal), Y: Pitch (vertical, radians from horizontal)
// public orbitAngles = new THREE.Vector2(0, Math.PI / 6),
// public minPitch: number = -Math.PI / 3, // Limit looking down
// public maxPitch: number = Math.PI / 2 - 0.1, // Limit looking up
