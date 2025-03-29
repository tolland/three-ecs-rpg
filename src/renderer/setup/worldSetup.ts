import * as THREE from 'three';
import { World } from '@ecs/World';
import { Scene } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Octree } from 'three/examples/jsm/math/Octree.js';
import { PositionComponent, VelocityComponent, RotationComponent, RenderableComponent, GravityAffectedComponent, ColliderComponent, InputControllableComponent, PlayerControlledComponent, CameraTargetComponent, NeedsUpdateComponent } from '@ecs/components';
import { CollisionSystem } from '@ecs/systems/CollisionSystem'; // Import CollisionSystem type
import { WindAffectedComponent } from '@ecs/components';

export async function setupWorld(
    world: World,
    scene: Scene,
    collisionSystem: CollisionSystem // Inject CollisionSystem to give it the Octree
): Promise<void> {
    const loader = new GLTFLoader();
    const worldOctree = new Octree();

    try {
        // --- Load Collision World ---
        // Adjust path based on where Rollup copies assets
        const gltf = await loader.loadAsync('assets/collision-world.glb');

        scene.add(gltf.scene);
        gltf.scene.traverse(child => { // Ensure shadows are cast/received
            if (child.isObject3D) { // Check if it's an object that can cast/receive
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        worldOctree.fromGraphNode(gltf.scene);
        collisionSystem.setWorldOctree(worldOctree); // IMPORTANT: Give the Octree to the system
        console.log("World GLB loaded and Octree built.");


        // --- Create Player Entity ---
        const playerEntity = world.createEntity();
        const playerStartPos = new THREE.Vector3(0, 10, 0); // Adjust starting position
        const playerCapsuleRadius = 0.35;
        const playerCapsuleHeight = 1.0; // Total height below the center point

        // Player Components
        world.addComponent(playerEntity, new PositionComponent(playerStartPos));
        world.addComponent(playerEntity, new VelocityComponent());
        world.addComponent(playerEntity, new RotationComponent()); // For looking around
        world.addComponent(playerEntity, new GravityAffectedComponent());
        world.addComponent(playerEntity, new ColliderComponent(
            'capsule',
            playerCapsuleRadius,
            playerCapsuleHeight,
            new THREE.Vector3(0, playerCapsuleRadius + playerCapsuleHeight / 2, 0) // Offset center correctly
        ));
        world.addComponent(playerEntity, new InputControllableComponent()); // Can be controlled
        world.addComponent(playerEntity, new PlayerControlledComponent()); // Is currently controlled
        world.addComponent(playerEntity, new CameraTargetComponent('main', new THREE.Vector3(0, 0.8, 0))); // Main camera follows eyes
        world.addComponent(playerEntity, new NeedsUpdateComponent()); // Needs initial render update
        // world.addComponent(playerEntity, new WindAffectedComponent(1.0));

        // Optional: Add a simple visual representation for the player (e.g., a capsule mesh)
        const playerGeometry = new THREE.CapsuleGeometry(playerCapsuleRadius, playerCapsuleHeight, 4, 8);
        const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
        playerMesh.position.copy(playerStartPos); // Sync initial mesh position
        playerMesh.castShadow = true;
        world.addComponent(playerEntity, new RenderableComponent(playerMesh));
        scene.add(playerMesh); // Add mesh to the scene


        // --- Create NPC Entity (Example) ---
        const npcEntity = world.createEntity();
        const npcStartPos = new THREE.Vector3(5, 10, 2);

        world.addComponent(npcEntity, new PositionComponent(npcStartPos));
        world.addComponent(npcEntity, new VelocityComponent());
        world.addComponent(npcEntity, new RotationComponent());
        world.addComponent(npcEntity, new GravityAffectedComponent());
        world.addComponent(npcEntity, new ColliderComponent(
            'capsule', 0.4, 1.2, new THREE.Vector3(0, 0.4 + 1.2 / 2, 0)
        ));
        // Add CameraTargetComponent if you want a camera to follow this NPC
        world.addComponent(npcEntity, new CameraTargetComponent('npc1', new THREE.Vector3(0, 0.7, 0)));
        world.addComponent(npcEntity, new NeedsUpdateComponent());

        // Optional: Visual for NPC
        const npcGeometry = new THREE.CapsuleGeometry(0.4, 1.2, 4, 8);
        const npcMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
        const npcMesh = new THREE.Mesh(npcGeometry, npcMaterial);
        npcMesh.position.copy(npcStartPos);
        npcMesh.castShadow = true;
        world.addComponent(npcEntity, new RenderableComponent(npcMesh));
        scene.add(npcMesh);


        console.log("Initial entities created.");

    } catch (error) {
        console.error("Failed to load world assets:", error);
    }
}
