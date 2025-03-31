// src/renderer/prefabs/playerPrefab.ts
import { World } from '@ecs/World';
import { Entity } from '@ecs/Entity';
import {
    PositionComponent,
    VelocityComponent,
    RotationComponent,
    GravityAffectedComponent,
    ColliderComponent,
    InputControllableComponent,
    PlayerControlledComponent,
    CameraTargetComponent,
    WindAffectedComponent,
    NeedsUpdateComponent,
    AttachmentTargetComponent,
    RenderableComponent,
    AnimatedModelComponent, MassComponent, ForceAccumulatorComponent, MovementStateComponent,
} from '@ecs/components';
import * as THREE from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { RenderLayers } from '@setup/sceneSetup';
import { NameComponent } from '@components/NameComponent'; // Import for cloning

// Interface for required assets
export interface PlayerAssets {
    soldierGltf: GLTF;
}

// Interface for creation options
export interface PlayerOptions {
    position: THREE.Vector3;
    rotation?: THREE.Quaternion;
}

// The result includes the entity ID and the main object to add to the scene
export interface PlayerPrefabResult {
    entity: Entity;
    object3D: THREE.Object3D; // The root object for rendering
}

/**
 * Creates a playable entity with the specified assets and options.
 * @param world
 * @param assets
 * @param options
 */
export function createPlayer(
    world: World,
    assets: PlayerAssets,
    options: PlayerOptions,
): PlayerPrefabResult {

    const playerEntity = world.createEntity();

    // --- Physics/Core Components ---
    const playerStartPos = options.position; // This IS the feet position

    const playerCapsuleRadius = 0.35;
    const playerCapsuleHeight = 1.0; // Below center point

    world.addComponent(
        playerEntity,
        new PositionComponent(playerStartPos.clone()),
    ); // Position is feet

    world.addComponent(playerEntity, new VelocityComponent());
    world.addComponent(
        playerEntity,
        new RotationComponent(
            options.rotation?.clone() ?? new THREE.Quaternion(),
        ),
    );
    world.addComponent(playerEntity, new GravityAffectedComponent(1.0));

    world.addComponent(
        playerEntity,
        new ColliderComponent(
            'capsule',
            playerCapsuleRadius,
            playerCapsuleHeight,
            new THREE.Vector3(
                0,
                playerCapsuleRadius + playerCapsuleHeight / 2,
                0,
            ), // Offset relative to Position (feet)
        ),
    );

    world.addComponent(playerEntity, new MassComponent(70)); // Example mass in kg
    world.addComponent(playerEntity, new ForceAccumulatorComponent());
    world.addComponent(playerEntity, new MovementStateComponent('falling'));

    // Input, PlayerControlled, CameraTarget, Wind, NeedsUpdate, AttachmentTarget
    world.addComponent(playerEntity, new InputControllableComponent());
    world.addComponent(playerEntity, new PlayerControlledComponent());
    world.addComponent(playerEntity, new CameraTargetComponent('main')); // Use default settings initially
    // world.addComponent(playerEntity, new WindAffectedComponent(1.0)); // If using wind
    world.addComponent(playerEntity, new NeedsUpdateComponent()); // Needs initial sync
    world.addComponent(playerEntity, new AttachmentTargetComponent()); // Can be attached to
    world.addComponent(
        playerEntity,
        new NameComponent(`Playable_${playerEntity}`),
    );

    // --- Visuals / Animation ---

    // Clone the model using SkeletonUtils - ESSENTIAL for multiple instances
    // even if you only have one player now, it's good practice for NPCs later.
    const playerModel = clone(assets.soldierGltf.scene);
    playerModel.name = `PlayerModel_${playerEntity}`;

    // Calculate offset to align model's feet with the entity's origin
    const box = new THREE.Box3().setFromObject(playerModel);
    const feetOffset = -box.min.y; // Amount to shift model UP
    console.log(`Feet Offset: ${feetOffset}`);

    // Create the root object that RenderSystem will position/rotate
    const renderableRoot = new THREE.Object3D();
    renderableRoot.position.copy(playerStartPos);
    if (options.rotation) renderableRoot.quaternion.copy(options.rotation);
    renderableRoot.name = `PlayerRoot_${playerEntity}`;

    // Add the cloned model as a child, applying the feet offset
    renderableRoot.add(playerModel);
    playerModel.position.set(0, feetOffset, 0); // Position model locally

    playerModel.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.layers.set(RenderLayers.RENDER_LAYER);
        }
    });

    // Add ECS components for visuals
    world.addComponent(playerEntity, new RenderableComponent(renderableRoot)); // Render the ROOT
    world.addComponent(
        playerEntity,
        new AnimatedModelComponent(playerModel, assets.soldierGltf.animations),
    ); // Animate the CLONED model

    console.log(`Created Player Entity: ${playerEntity}`);
    return { entity: playerEntity, object3D: renderableRoot };
}
