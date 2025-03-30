// src/renderer/prefabs/CapsulePlayer.ts
import * as THREE from 'three';

export class CapsulePlayer {
    constructor() {
        // // Optional: Add a simple visual representation for the player (e.g., a capsule mesh)
        const playerStartPos = new THREE.Vector3(0, 10, 0); // Adjust starting position
        const playerCapsuleRadius = 0.35;
        const playerCapsuleHeight = 1.0; // Total height below the center point
        const playerGeometry = new THREE.CapsuleGeometry(
            playerCapsuleRadius,
            playerCapsuleHeight,
            4,
            8,
        );
        const playerMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
        });
        const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
        playerMesh.position.copy(playerStartPos); // Sync initial mesh position
        playerMesh.castShadow = true;
        // world.addComponent(playerEntity, new RenderableComponent(playerMesh));
        //scene.add(playerMesh); // Add mesh to the scene
    }
}
