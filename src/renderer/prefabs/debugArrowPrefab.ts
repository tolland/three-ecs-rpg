// src/renderer/prefabs/debugArrowPrefab.ts (New File)
import { World } from '@ecs/World';
import { Entity } from '@ecs/Entity';
import {
    AttachToComponent,
    NameComponent,
    RenderableComponent,
} from '@ecs/components';
import * as THREE from 'three';
import { DebugArrowComponent } from '@components/DebugArrowComponent';

// Options for creating the arrow
export interface DebugArrowOptions {
    parentEntity: Entity; // Entity to attach to
    offset?: THREE.Vector3; // Local position offset from parent
    rotation?: THREE.Quaternion; // Local rotation offset from parent
    boneName?: string; // Optional bone name
    color?: number;
    length?: number;
}

// The result includes the entity ID and the main object to add to the scene
export interface DebugArrowPrefabResult {
    entity: Entity;
    object3D: THREE.Object3D; // The root object for rendering
}

// Returns only the entity ID, as the object is managed by RenderableComponent/AttachmentSystem
export function createDebugArrow(
    world: World,
    options: DebugArrowOptions,
): DebugArrowPrefabResult {
    const arrowEntity = world.createEntity();

    // 1. Create the visual component
    const arrowComp = new DebugArrowComponent(
        new THREE.Vector3(0, 0, -1), // Default forward dir
        options.length ?? 0.6,
        options.color ?? 0xffff00,
    );
    // Ensure arrow helper is on the correct render layer
    const RENDER_LAYER = 0; // Or import
    arrowComp.arrowHelper.layers.set(RENDER_LAYER);
    world.addComponent(arrowEntity, arrowComp);
    world.addComponent(
        arrowEntity,
        new NameComponent(`DebugArrow_${arrowEntity}`),
    );
    // 2. Make it renderable
    world.addComponent(
        arrowEntity,
        new RenderableComponent(arrowComp.arrowHelper),
    );

    // 3. Define the attachment
    world.addComponent(
        arrowEntity,
        new AttachToComponent(
            options.parentEntity,
            options.offset ?? new THREE.Vector3(0, 1.9, 0), // Default offset above head
            options.rotation ?? new THREE.Quaternion(),
            options.boneName,
        ),
    );

    console.log(
        `Created Debug Arrow Entity: ${arrowEntity} attached to ${options.parentEntity}`,
    );

    console.log(`Created Debug Arrow Entity: ${arrowEntity}`);
    return { entity: arrowEntity, object3D: arrowComp.arrowHelper };
}
