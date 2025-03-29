
// src/renderer/ecs/components/CameraTargetComponent.ts
import { Component } from '@ecs/Component';
import * as THREE from 'three';

export enum CameraMode {
    FIRST_PERSON = 'FIRST_PERSON',
    THIRD_PERSON_GLOBAL = 'THIRD_PERSON_GLOBAL', // Orbit controlled relative to world axes
    THIRD_PERSON_ENTITY = 'THIRD_PERSON_ENTITY', // Orbit controlled relative to entity's facing direction
}

/**
 * CameraTargetComponent
 *
 *     Purpose: Marks an entity that a camera should follow. It contains:
 *
 * - `cameraId`: A string identifier (e.g., 'main', 'npc1', 'overview') specifying which camera instance should follow this entity.
 * - `offset`: A `THREE.Vector3` defining the camera's position relative to the entity's origin (e.g., eye level).
 *
 * Used By: `CameraSystem` reads this component to find its target for each managed camera. It then uses the target entity's `PositionComponent` and `RotationComponent` to update the actual `THREE.PerspectiveCamera` object.
 *
 * Multiple entities can have `CameraTargetComponent`, potentially targeting different cameras (e.g., one for 'main', one for 'npc1').
 */
export class CameraTargetComponent extends Component {
    constructor(
        public cameraId: string = 'main', // Identifier for which camera follows
        public offset = new THREE.Vector3(0, 1.6, 0), // E.g., eye level offset
        // --- First Person Settings ---
        public firstPersonOffset = new THREE.Vector3(0, 0.8, 0), // E.g., eye level offset

        // --- Third Person Settings ---
        public mode: CameraMode = CameraMode.FIRST_PERSON, // Initial mode
        public desiredDistance: number = 5.0, // How far back camera wants to be
        public minDistance: number = 1.0,    // Closest camera can get (collision)
        public maxDistance: number = 10.0,   // Furthest camera can zoom (optional)
        public orbitAngles = new THREE.Vector2(0, Math.PI / 6), // X: Azimuth (horizontal), Y: Pitch (vertical, radians from horizontal)
        public minPitch: number = -Math.PI / 3, // Limit looking down
        public maxPitch: number = Math.PI / 2 - 0.1, // Limit looking up
        public collisionBuffer: number = 0.15, // How far to back off from collision point

        // --- Internal State (Managed by CameraSystem) ---
        public currentDistance: number = 5.0, // Actual current distance
        public lookAtOffset = new THREE.Vector3(0, 0.9, 0) // Point above target feet to look at

    ) {
        super();
        this.currentDistance = this.desiredDistance; // Initialize current distance
    }
}