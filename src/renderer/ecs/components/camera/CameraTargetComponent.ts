// src/renderer/ecs/components/camera/CameraTargetComponent.ts
import { Component } from '@ecs/Component';
import * as THREE from 'three';

export enum CameraMode {
    FIRST_PERSON = 'FIRST_PERSON',
    // Orbit controlled relative to world axes
    THIRD_PERSON_GLOBAL = 'THIRD_PERSON_GLOBAL',
    // Orbit controlled relative to entity's facing direction
    THIRD_PERSON_ENTITY = 'THIRD_PERSON_ENTITY',
    FREECAM = 'FREECAM',
}

/**
 * CameraTargetComponent
 *
 *     Purpose: Marks an entity that a camera should follow. It contains:
 *
 * Multiple entities can have `CameraTargetComponent`, potentially targeting different cameras (e.g., one for 'main', one for 'npc1').
 */
export class CameraTargetComponent extends Component {
    constructor(
        // X: Azimuth (horizontal), Y: Pitch (vertical, radians from horizontal)
        // public orbitAngles = new THREE.Vector2(0, Math.PI / 6),
        // public minPitch: number = -Math.PI / 3, // Limit looking down
        // public maxPitch: number = Math.PI / 2 - 0.1, // Limit looking up


        // public firstPersonOffset = new THREE.Vector3(0, 0.8, 0), // E.g., eye level offset
        //
        // // --- Third Person Settings ---
        // public mode: CameraMode = CameraMode.FIRST_PERSON, // Initial mode
        // public desiredDistance: number = 5.0, // How far back camera wants to be
        // public minDistance: number = 1.0, // Closest camera can get (collision)
        // public maxDistance: number = 10.0, // Furthest camera can zoom (optional)
        // public orbitAngles = new THREE.Vector2(0, Math.PI / 6), // X: Azimuth (horizontal), Y: Pitch (vertical, radians from horizontal)
        // public minPitch: number = -Math.PI / 3, // Limit looking down
        // public maxPitch: number = Math.PI / 2 - 0.1, // Limit looking up
        // public collisionBuffer: number = 0.15, // How far to back off from collision point
        //
        // // --- Internal State (Managed by CameraSystem) ---
        // public currentDistance: number = 5.0, // Actual current distance


    ) {
        super();
    }
}
