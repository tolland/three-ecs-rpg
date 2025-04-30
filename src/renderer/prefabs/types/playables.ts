import { Entity } from '@ecs/Entity';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

// Interface for required assets
export interface PlayerAssets {
    soldierGltf: GLTF;
}

// Interface for creation options
export interface PlayerOptions {
    position: THREE.Vector3;
    rotation?: THREE.Quaternion;
    isControlled?: boolean; // Flag to indicate if the entity is controlled initially
    isControllable?: boolean; // Flag to indicate if the entity can be switched to the active controlled entity
    cameraId?: string; // Optional camera ID for the CameraTargetComponent
}

// The result includes the entity ID and the main object to add to the scene
export interface PlayerPrefabResult {
    entity: Entity;
    object3D: THREE.Object3D; // The root object for rendering
}

// Options for creating the arrow
export interface PlayableOptions {
    position: THREE.Vector3;
}

// Default options for player creation
export const DEFAULT_PLAYER_OPTIONS: Omit<PlayerOptions, 'position'> = {
  rotation: new THREE.Quaternion(),
  isControlled: false,
  isControllable: true,
  cameraId: undefined
};

/**
 * Factory function that creates a PlayerOptions object with required position
 * and optional parameters filled with defaults if not provided
 */
export function createPlayerOptions(
  position: THREE.Vector3,
  options: Partial<Omit<PlayerOptions, 'position'>> = {}
): PlayerOptions {
  return {
    position,
    rotation: options.rotation ?? new THREE.Quaternion(),
    isControlled: options.isControlled ?? false,
    isControllable: options.isControllable ?? true,
    cameraId: options.cameraId
  };
}

// Usage example:
// const playerOpts = createPlayerOptions(new THREE.Vector3(0, 0, 0), { isControlled: true });
