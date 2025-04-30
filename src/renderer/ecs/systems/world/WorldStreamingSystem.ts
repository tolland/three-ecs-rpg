import { System } from '@ecs/System';
import { World } from '@ecs/World';
import { PlayerControlGroundedComponent, PositionComponent } from '@ecs/components';
import { CollisionSystem } from './CollisionSystem'; // To notify about Octrees
import { CameraSystem } from '../CameraSystem'; // To notify about Octrees
import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Octree } from 'three/examples/jsm/math/Octree.js';

interface ChunkData {
    coords: THREE.Vector2; // Chunk coordinates (e.g., x, z)
    object3D: THREE.Object3D;
    octree: Octree;
    // Add entity ID if chunk represented as entity, loading promise, etc.
}

interface ChunkLoadingState {
    promise: Promise<GLTF>;
    abortController: AbortController;
}

export class WorldStreamingSystem extends System {
    private chunkSize: number = 100; // Match the size used during export
    private loadDistance: number = 250; // Load chunks within this distance
    private unloadDistance: number = 350; // Unload chunks beyond this distance
    private playerPosition: THREE.Vector3 = new THREE.Vector3();

    private loadedChunks: Map<string, ChunkData> = new Map(); // Key: "x_z"
    private loadingChunks: Map<string, ChunkLoadingState> = new Map();
    private chunksToUnload: Set<string> = new Set();

    private gltfLoader = new GLTFLoader();
    private collisionSystem: CollisionSystem | undefined;
    private cameraSystem: CameraSystem | undefined;

    private lastPlayerChunkCoords: THREE.Vector2 = new THREE.Vector2(NaN, NaN);
    private updateCooldown: number = 1.0; // Check for new chunks every second
    private timeSinceLastUpdate: number = 0;

    constructor(
        world: World,
        private scene: THREE.Scene,
    ) {
        super(world);
    }

    // Call this after all systems are created
    registerDependencies() {
        this.collisionSystem = this.world.getSystem(CollisionSystem);
        this.cameraSystem = this.world.getSystem(CameraSystem);
        if (!this.collisionSystem || !this.cameraSystem) {
            console.error(
                'WorldStreamingSystem: Failed to get CollisionSystem or CameraSystem!',
            );
        }
    }

    private getChunkCoords(position: THREE.Vector3): THREE.Vector2 {
        const x = Math.floor(position.x / this.chunkSize);
        const z = Math.floor(position.z / this.chunkSize);
        return new THREE.Vector2(x, z);
    }

    private getChunkKey(coords: THREE.Vector2): string {
        return `${coords.x}_${coords.y}`;
    }

    update(deltaTime: number): void {
        this.timeSinceLastUpdate += deltaTime;

        const playerEntity = this.world.queryEntities([
            PlayerControlGroundedComponent,
            PositionComponent,
        ])[0];
        if (playerEntity === undefined) return; // No player found

        const posComp = this.world.getComponent(
            playerEntity,
            PositionComponent,
        )!;
        this.playerPosition.copy(posComp.value);

        const currentPlayerChunkCoords = this.getChunkCoords(
            this.playerPosition,
        );

        // Only run the expensive check periodically or if player changed chunk
        if (
            this.timeSinceLastUpdate < this.updateCooldown &&
            currentPlayerChunkCoords.equals(this.lastPlayerChunkCoords)
        ) {
            return;
        }

        // console.log("WorldStreamingSystem: Checking chunk status..."); // Debug
        this.timeSinceLastUpdate = 0;
        this.lastPlayerChunkCoords.copy(currentPlayerChunkCoords);

        const requiredChunks = new Set<string>();
        const loadRadiusSq =
            (this.loadDistance / this.chunkSize) *
            (this.loadDistance / this.chunkSize); // Check radius in chunk units squared

        // Calculate range based on load distance
        const range = Math.ceil(this.loadDistance / this.chunkSize);

        // Identify required chunks around the player
        for (
            let x = currentPlayerChunkCoords.x - range;
            x <= currentPlayerChunkCoords.x + range;
            x++
        ) {
            for (
                let z = currentPlayerChunkCoords.y - range;
                z <= currentPlayerChunkCoords.y + range;
                z++
            ) {
                const coords = new THREE.Vector2(x, z);
                const key = this.getChunkKey(coords);
                // Simple distance check (can be improved with actual distance to chunk center)
                const chunkCenter = new THREE.Vector3(
                    (x + 0.5) * this.chunkSize,
                    0,
                    (z + 0.5) * this.chunkSize,
                );
                if (
                    chunkCenter.distanceToSquared(this.playerPosition) <
                    this.loadDistance * this.loadDistance
                ) {
                    requiredChunks.add(key);
                }
            }
        }

        // --- Determine Chunks to Load ---
        for (const key of requiredChunks) {
            if (
                !this.loadedChunks.has(key) &&
                !this.loadingChunks.has(key) &&
                !this.chunksToUnload.has(key)
            ) {
                this.loadChunk(this.parseKey(key));
            }
            // If it was marked for unload, cancel the unload
            if (this.chunksToUnload.has(key)) {
                this.chunksToUnload.delete(key);
                // console.log(`WorldStreamingSystem: Cancelled unload for ${key}`);
            }
        }

        // --- Determine Chunks to Unload ---
        const unloadDistanceSq = this.unloadDistance * this.unloadDistance;
        for (const [key, chunkData] of this.loadedChunks) {
            if (!requiredChunks.has(key)) {
                // If no longer required
                const chunkCenter = new THREE.Vector3(
                    (chunkData.coords.x + 0.5) * this.chunkSize,
                    0,
                    (chunkData.coords.y + 0.5) * this.chunkSize,
                );
                if (
                    chunkCenter.distanceToSquared(this.playerPosition) >
                    unloadDistanceSq
                ) {
                    if (!this.chunksToUnload.has(key)) {
                        this.chunksToUnload.add(key);
                        // console.log(`WorldStreamingSystem: Marked chunk ${key} for unload`);
                    }
                }
            }
        }

        // --- Process Unloads ---
        // Process only a few unloads per frame to avoid hitches
        let unloadsProcessed = 0;
        const maxUnloadsPerFrame = 1;
        for (const key of this.chunksToUnload) {
            if (unloadsProcessed >= maxUnloadsPerFrame) break;
            if (this.loadedChunks.has(key)) {
                this.unloadChunk(key);
                unloadsProcessed++;
            }
            this.chunksToUnload.delete(key); // Remove from set regardless
        }
    }

    private parseKey(key: string): THREE.Vector2 {
        const parts = key.split('_');
        return new THREE.Vector2(
            parseInt(parts[0], 10),
            parseInt(parts[1], 10),
        );
    }

    private async loadChunk(coords: THREE.Vector2): Promise<void> {
        const key = this.getChunkKey(coords);
        if (this.loadingChunks.has(key) || this.loadedChunks.has(key)) return; // Already loading or loaded

        const chunkPath = `assets/world_chunks/world_chunk_x${coords.x}_z${coords.y}.glb`; // Adjust path/naming
        console.log(
            `WorldStreamingSystem: Loading chunk ${key} from ${chunkPath}`,
        );

        const abortController = new AbortController();
        const loadPromise = this.gltfLoader.loadAsync(
            chunkPath /*, progress => {}*/,
        ); // Load with signal maybe? Check loader docs

        this.loadingChunks.set(key, { promise: loadPromise, abortController });

        try {
            const gltf = await loadPromise;
            // Ensure still needed (might have moved far away during load)
            if (!this.loadingChunks.has(key)) {
                console.log(
                    `WorldStreamingSystem: Chunk ${key} load cancelled.`,
                );
                // TODO: Dispose potentially loaded GLTF data if loader doesn't handle abort signal well
                return;
            }

            console.log(`WorldStreamingSystem: Loaded chunk ${key}`);
            const chunkObject = gltf.scene;
            chunkObject.name = `Chunk_${key}`;
            // Apply chunk offset? Usually models are exported relative to 0,0,0
            // chunkObject.position.set(coords.x * this.chunkSize, 0, coords.y * this.chunkSize); // Maybe not needed if model origin is chunk center

            chunkObject.traverse((child) => {
                if (child.isObject3D) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // --- Generate Octree for this chunk ---
            const chunkOctree = new Octree();
            chunkOctree.fromGraphNode(chunkObject);
            console.log(
                `WorldStreamingSystem: Generated Octree for chunk ${key}`,
            );

            // Add to scene
            this.scene.add(chunkObject);

            // Store data
            const chunkData: ChunkData = {
                coords,
                object3D: chunkObject,
                octree: chunkOctree,
            };
            this.loadedChunks.set(key, chunkData);

            // --- Notify other systems ---
            //this.collisionSystem?.addChunkOctree(key, chunkOctree);
            //this.cameraSystem?.addChunkOctree(key, chunkOctree);
        } catch (error: any) {
            // Handle file not found gracefully (404) vs other errors
            if (error.message?.includes('404')) {
                // Basic check, improve if needed
                console.log(
                    `WorldStreamingSystem: Chunk ${key} not found at ${chunkPath}. Assuming empty space.`,
                );
            } else {
                console.error(
                    `WorldStreamingSystem: Failed to load chunk ${key}:`,
                    error,
                );
            }
        } finally {
            // Always remove from loading state
            this.loadingChunks.delete(key);
        }
    }

    private unloadChunk(key: string): void {
        const chunkData = this.loadedChunks.get(key);
        if (!chunkData) return;

        console.log(`WorldStreamingSystem: Unloading chunk ${key}`);

        // --- Notify other systems ---
        this.collisionSystem?.removeChunk(key);
        this.cameraSystem?.removeChunk(key);

        // Remove from scene
        this.scene.remove(chunkData.object3D);

        // Dispose resources (IMPORTANT!)
        chunkData.object3D.traverse((object: any) => {
            if (object.isMesh) {
                object.geometry?.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach((material: any) =>
                            material.dispose(),
                        );
                    } else {
                        object.material.dispose();
                    }
                }
            }
        });
        // Dispose of Octree resources if necessary (check Octree docs, usually not needed)

        // Remove from state
        this.loadedChunks.delete(key);
    }
}
