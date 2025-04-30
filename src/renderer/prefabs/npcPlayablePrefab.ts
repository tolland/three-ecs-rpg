import { World } from '@ecs/World';
import * as THREE from 'three';
import { PlayableOptions, PlayerAssets, PlayerOptions, PlayerPrefabResult } from '@renderer/prefabs/types/playables';
import { CameraTargetComponent, PlayerControlGroundedComponent } from '@ecs/components';

/**
 * create a playable entity with the specified assets and options.
 * initially will be set to have the same properties as the player
 * but will be modified to not be under control of the player
 */
export function createPlayableEntity(
    world: World,
    assets: PlayerAssets,
    options: PlayableOptions,
): PlayerPrefabResult {
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
    world.removeComponent(npcEntity, PlayerControlGroundedComponent);
    // world.removeComponent(npcEntity, InputControllableComponent);
    // Add specific NPC components (AI, different camera target?)
    world.addComponent(npcEntity, new CameraTargetComponent());

    return {
        entity: npcEntity,
        object3D: npcObject,
    };
}
