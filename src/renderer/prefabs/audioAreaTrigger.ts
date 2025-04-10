import { World } from '@ecs/World';
import {
    AreaTriggerComponent,
    NameComponent,
    PositionComponent,
    TriggerShape,
} from '@ecs/components';
import * as THREE from 'three';
import { Entity } from '@ecs/Entity';

// Options for creating the arrow
export interface AudioAreaTriggerOptions {
    position: THREE.Vector3;
}

// The result includes the entity ID and the main object to add to the scene
export interface AudioAreaTriggerResult {
    triggerEntity: Entity;
    triggerHelper?: THREE.Mesh;
}

export function createAudioAreaTrigger(
    world: World,
    options: AudioAreaTriggerOptions,
): AudioAreaTriggerResult {
    const caveTriggerEntity = world.createEntity();
    world.addComponent(
        caveTriggerEntity,
        new NameComponent('CaveEntranceTrigger'),
    );
    world.addComponent(
        caveTriggerEntity,
        new PositionComponent(new THREE.Vector3(10, 1, 5)),
    ); // Position the trigger
    world.addComponent(
        caveTriggerEntity,
        new AreaTriggerComponent({
            shape: TriggerShape.SPHERE,
            size: 4, // Radius of 4 units
            // triggerEventName: 'ENTER_CAVE_SPECIAL', // Optional specific event
            soundOnEnter: 'cave_ambience', // Play this ambient sound globally on enter
            // soundOnExit: 'exit_sound' // Optional exit sound
        }),
    );
    // Optional: Add a visual helper for the trigger area during debug
    const triggerHelper = new THREE.Mesh(
        new THREE.SphereGeometry(4, 16, 16),
        new THREE.MeshBasicMaterial({
            wireframe: true,
            color: 0x00ffff,
        }),
    );
    triggerHelper.position.set(10, 1, 5);
    return {
        triggerEntity: caveTriggerEntity,
        triggerHelper,
    }; // Return the entity and helper
}
