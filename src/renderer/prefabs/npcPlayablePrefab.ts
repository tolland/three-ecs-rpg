import { World } from '@ecs/World';
import * as THREE from 'three';
import { Entity } from '@ecs/Entity';

import {
    CameraTargetComponent,
    PlayerControlledComponent,
} from '@ecs/components';
import { PlayerAssets, PlayerOptions } from '@renderer/prefabs/playablePrefab';

// Options for creating the arrow
export interface PlayableOptions {
    position: THREE.Vector3;
}

// The result includes the entity ID and the main object to add to the scene
export interface PlayableOptionsResult {
    entity: Entity;
    object3D: THREE.Object3D; // The root object for rendering
}

/**
 * create a playable entity with the specified assets and options.
 * initially will be set to have the same properties as the player
 * but will be modified to not be under control of the player
 */
export function createPlayableEntity(
    world: World,
    assets: PlayerAssets,
    options: PlayableOptions,
): PlayableOptionsResult {
    const npcOptions: PlayerOptions = {
        position: new THREE.Vector3(5, 5, 2),
    };
    // NOTE: This uses player controls - needs adjustment for NPC logic
    const { entity: npcEntity, object3D: npcObject } = createPlayableEntity(
        world,
        assets,
        npcOptions,
    );
    // Remove player-specific components
    world.removeComponent(npcEntity, PlayerControlledComponent);
    // world.removeComponent(npcEntity, InputControllableComponent);
    // Add specific NPC components (AI, different camera target?)
    world.addComponent(npcEntity, new CameraTargetComponent('npc1'));

    return {
        entity: npcEntity,
        object3D: npcObject,
    };
}
