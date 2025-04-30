// src/renderer/prefabs/playerPrefab.ts
import { World } from '@ecs/World';
import {
    AnimatedModelComponent,
    AttachmentTargetComponent,
    AudioSourceComponent,
    CameraTargetComponent,
    ColliderComponent,
    DebugBoundingBoxVisualComponent,
    DebugColliderVisualComponent,
    DebugPositionIndicatorComponent,
    ForceAccumulatorComponent,
    GravityAffectedComponent,
    InputControllableComponent,
    LookDirectionComponent,
    MassComponent,
    MovementStateComponent,
    NameComponent,
    NeedsUpdateComponent,
    PlayerControlComponent,
    PositionComponent,
    RenderableComponent,
    RotationComponent,
    VelocityComponent,
} from '@ecs/components';
import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { RenderLayers } from '@setup/sceneSetup';
import { PlayerAssets, PlayerOptions, PlayerPrefabResult } from '@renderer/prefabs/types/playables';
import { EyesComponent } from '@components/position/EyesComponent';
import { DebugLookAtComponent } from '@components/debug/DebugLookAtComponent';


/**
 * Creates a playable entity with the specified assets and options.
 * @param world
 * @param assets
 * @param options
 */
export function createPlayable(
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

    world.addComponent(playerEntity, new MassComponent(70));
    world.addComponent(playerEntity, new ForceAccumulatorComponent());
    world.addComponent(playerEntity, new MovementStateComponent('falling'));

    // Input, PlayerControlled, CameraTarget, Wind, NeedsUpdate, AttachmentTarget
    if (options.isControlled) {
        world.addComponent(playerEntity, new PlayerControlComponent());
    }
    world.addComponent(playerEntity, new LookDirectionComponent());
    world.addComponent(playerEntity, new EyesComponent(
        new THREE.Vector3(0, 2, 0),
    ));

    if (options.isControllable) {
        world.addComponent(playerEntity, new InputControllableComponent());
    }

    // Cameras
    world.addComponent(
        playerEntity,
        new CameraTargetComponent(),
    );
    // world.addComponent(playerEntity, new WindAffectedComponent(1.0)); // If using wind
    // Needs initial sync
    world.addComponent(playerEntity, new NeedsUpdateComponent());
    // Can be attached to
    world.addComponent(playerEntity, new AttachmentTargetComponent());
    world.addComponent(
        playerEntity,
        new NameComponent(`Playable_${playerEntity}`),
    );

    // --- Add Debug Visual Components to Player ---
    world.addComponent(
        playerEntity,
        new DebugColliderVisualComponent(0x00ff00),
    ); // Green collider
    world.addComponent(
        playerEntity,
        new DebugBoundingBoxVisualComponent(0x0000ff),
    ); // Blue bounding box
    world.addComponent(
        playerEntity,
        new DebugPositionIndicatorComponent(0xff0000, 0.1),
    ); // Red position sphere
    world.addComponent(
        playerEntity,
        new DebugLookAtComponent(),
    );

    // Add AudioSource to Player
    world.addComponent(
        playerEntity,
        new AudioSourceComponent({
            JUMP: { key: 'jump', volume: 0.6, positional: true }, // Player jump sound
            IMPACT_GROUND_HARD: {
                key: 'land_hard',
                volume: 0.8,
                positional: true,
            },
            IMPACT_WALL: {
                key: 'impact_wall',
                volume: 0.5,
                positional: true,
            },
            SAY_HELLO: {
                key: 'say_hello',
                volume: 1.0,
                positional: true,
                refDistance: 2,
            },
            // Add FOOTSTEP_LEFT, FOOTSTEP_RIGHT triggered by AnimationSystem events maybe?
        }),
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
    world.addComponent(playerEntity, new RenderableComponent(renderableRoot));
    world.addComponent(
        playerEntity,
        new AnimatedModelComponent(playerModel, assets.soldierGltf.animations),
    );

    console.log(`Created Player Entity: ${playerEntity}`);
    return { entity: playerEntity, object3D: renderableRoot };
}
