// src/renderer/setup/worldSetup.ts
import * as THREE from 'three';
import { Scene } from 'three';
import { World } from '@ecs/World';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Octree } from 'three/examples/jsm/math/Octree.js';
import {
    AreaTriggerComponent,
    AudioSourceComponent,
    CameraTargetComponent,
    DebugBoundingBoxVisualComponent,
    DebugColliderVisualComponent,
    DebugPositionIndicatorComponent,
    InputControllableComponent,
    NameComponent,
    PlayerControlledComponent,
    PositionComponent,
    TriggerShape,
} from '@ecs/components';
import { CollisionSystem } from '@ecs/systems/CollisionSystem';
import { RenderLayers } from '@setup/sceneSetup';
import {
    createPlayer,
    PlayerAssets,
    PlayerOptions,
} from '@renderer/prefabs/playerPrefab';
import {
    createDebugArrow,
    DebugArrowOptions,
    DebugArrowPrefabResult,
} from '@renderer/prefabs/debugArrowPrefab';
import { audioManager } from '@core/AudioManager'; // Import manager

export async function setupWorld(
    world: World,
    scene: Scene,
    collisionSystem: CollisionSystem, // Inject CollisionSystem to give it the Octree
): Promise<void> {
    const gltfLoader = new GLTFLoader();
    const worldOctree = new Octree();

    try {
        // --- Preload Sounds ---
        await Promise.all([
            audioManager.loadSound('jump', 'assets/sounds/jump.wav'), // Replace with actual paths/keys
            audioManager.loadSound('land_hard', 'assets/sounds/land_hard.wav'),
            audioManager.loadSound(
                'impact_wall',
                'assets/sounds/impact_wall.wav',
            ),
            audioManager.loadSound('say_hello', 'assets/sounds/hello.wav'),
            audioManager.loadSound(
                'cave_ambience',
                'assets/sounds/cave_ambience.wav',
            ),
            // Add footstep sounds, etc.
        ]);

        // --- Load Collision World ---
        const [worldGltf, soldierGltf] = await Promise.all([
            gltfLoader.loadAsync('assets/collision-world.glb'),
            gltfLoader.loadAsync('assets/Soldier.glb'),
        ]);
        console.log('Assets loaded: World, Soldier');

        scene.add(worldGltf.scene);
        worldGltf.scene.traverse((child) => {
            if (child.isObject3D) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.layers.set(RenderLayers.RENDER_LAYER);
            }
        });
        worldOctree.fromGraphNode(worldGltf.scene);
        collisionSystem.setWorldOctree(worldOctree);
        console.log('World GLB loaded and Octree built.');

        // --- Load Animated Model (Soldier) ---
        console.log(
            'Soldier GLB loaded. Animations:',
            soldierGltf.animations.map((a) => a.name),
        );

        // Make model cast shadows
        soldierGltf.scene.traverse((child) => {
            if ('isMesh' in child && child.isMesh) {
                // Check specifically for meshes
                child.castShadow = true;
                child.layers.set(RenderLayers.RENDER_LAYER); // <<<<< SET LAYER for player model parts
                // Optional: Disable receiving shadows on the character model itself
                // child.receiveShadow = false;
            }
        });

        // --- Create Player using Prefab ---
        const playerAssets: PlayerAssets = { soldierGltf };
        const playerOptions: PlayerOptions = {
            position: new THREE.Vector3(0, 10, 5), // Initial feet position
        };
        const { entity: playerEntity, object3D: playerObject } = createPlayer(
            world,
            playerAssets,
            playerOptions,
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
        scene.add(playerObject); // Add the player's renderable root to the scene

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

        // --- Create Debug Arrow Entity ---
        const arrowOptions: DebugArrowOptions = {
            parentEntity: playerEntity,
            // Offset calculation remains the same relative to parent origin (feet)
            offset: new THREE.Vector3(0, 1.0 + 0.35 * 2 + 0.1, 0), // capsuleHeight + 2*radius + buffer
            // color: 0xff00ff // Optional custom color
        };
        const arrow: DebugArrowPrefabResult = createDebugArrow(
            world,
            arrowOptions,
        );
        // @TODO: Add arrow to renderable system to track player movement

        // --- Create Area Triggers ---
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
        scene.add(triggerHelper);

        // --- Create NPC Entity (Example) ---
        const npcOptions: PlayerOptions = {
            position: new THREE.Vector3(5, 5, 2),
        };
        // NOTE: This uses player controls - needs adjustment for NPC logic
        const { entity: npcEntity, object3D: npcObject } = createPlayer(
            world,
            playerAssets,
            npcOptions,
        );
        // Remove player-specific components
        world.removeComponent(npcEntity, PlayerControlledComponent);
        world.removeComponent(npcEntity, InputControllableComponent);
        // Add specific NPC components (AI, different camera target?)
        world.addComponent(npcEntity, new CameraTargetComponent('npc1')); // Example
        scene.add(npcObject);

        console.log('Initial entities created.');
    } catch (error) {
        console.error('Failed to load world assets:', error);
    }
}
