// src/renderer/core/ViewConfiguration.ts
import * as THREE from 'three';
import { Entity } from '@ecs/Entity';
import { CameraMode } from '@components/CameraTargetComponent';
import { ViewConfigID } from '@core/types/viewport';

/**
 * (Data Object):
 * Describes what a view shows. Managed by CameraSystem.
 */
export interface ViewConfiguration {
    id: ViewConfigID;
    name: string; // User-friendly name (e.g., "Player 1 Cam", "NPC Overview")
    targetEntity: Entity | null; // null for freecam
    mode: CameraMode | 'FREECAM'; // Add FREECAM mode

    // Settings (can be grouped)
    firstPersonOffset: THREE.Vector3;

    // First person-specific settings
    thirdPersonDistance: number;
    thirdPersonMinDistance: number;
    thirdPersonMaxDistance: number;
    thirdPersonOrbitAngles: THREE.Vector2; // Stored here now
    thirdPersonMinPitch: number;
    thirdPersonMaxPitch: number;
    thirdPersonCollisionBuffer: number;
    thirdPersonLookAtOffset: THREE.Vector3;

    // Freecam-specific settings
    freecamPosition: THREE.Vector3; // State for freecam
    freecamRotation: THREE.Quaternion; // State for freecam

    // Internal state managed by CameraSystem
    currentDistance: number; // For third person lerping/collision
}

// Factory function for default config
export function createDefaultViewConfig(id: ViewConfigID, name: string): ViewConfiguration {
    return {
        id, name,
        targetEntity: null,
        mode: 'FREECAM',
        firstPersonOffset: new THREE.Vector3(0, 0.8, 0),
        thirdPersonDistance: 5.0,
        thirdPersonMinDistance: 1.0,
        thirdPersonMaxDistance: 10.0,
        thirdPersonOrbitAngles: new THREE.Vector2(0, Math.PI / 6),
        thirdPersonMinPitch: -Math.PI / 3,
        thirdPersonMaxPitch: Math.PI / 2 - 0.1,
        thirdPersonCollisionBuffer: 0.15,
        thirdPersonLookAtOffset: new THREE.Vector3(0, 0.9, 0),

        freecamPosition: new THREE.Vector3(0, 10, 10), // Default freecam start
        freecamRotation: new THREE.Quaternion(),

        currentDistance: 5.0,
    };
}
