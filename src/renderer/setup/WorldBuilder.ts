import * as THREE from 'three';
import { Scene } from 'three';
import { World } from '@ecs/World';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CameraSystem, CollisionSystem } from '@ecs/systems';
import { RenderLayers } from '@setup/sceneSetup';
import { WorldConfigManager } from '@core/WorldConfigManager';
import { audioManager } from '@core/AudioManager';
import { createPlayable, PlayerAssets } from '@renderer/prefabs/playablePrefab';
import { createDebugArrow } from '@renderer/prefabs/debugArrowPrefab';
import { GenericMergedGeometry } from '@renderer/logic/GeometryMerging';
import { BVHCollisionWorld } from '@renderer/logic/CollisionWorldBVH';
import {
    acceleratedRaycast,
    computeBoundsTree,
    disposeBoundsTree,
} from 'three-mesh-bvh';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { WorldConfig } from '@renderer/types/worldConfig';

// Apply three-mesh-bvh extensions
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

/**
 * Holds loaded assets that can be reused
 */
interface LoadedAssets {
    models: Map<string, THREE.Group>;
    gltfs: Map<string, any>; // Store the raw GLTF data
    textures: Map<string, THREE.Texture>;
}

function isWorldConfig(config: string | WorldConfig): config is WorldConfig {
    return typeof config !== 'string' && 'environment' in config;
}

/**
 * WorldBuilder class handles building a world from a YAML configuration
 */
export class WorldBuilder {
    private worldConfig: WorldConfig | null = null;
    private configManager: WorldConfigManager;
    private loadedAssets: LoadedAssets = {
        models: new Map(),
        gltfs: new Map(),
        textures: new Map(),
    };

    constructor(configManager: WorldConfigManager) {
        this.configManager = configManager;
    }

    /**
     * Load a world configuration and build the world from it
     * @param config Path to the world config YAML file
     * @param world ECS World instance
     * @param scene Three.js Scene
     * @param collisionSystem Collision system instance
     * @param cameraSystem Camera system instance
     */
    public async buildFromConfig(
        config: string | WorldConfig,
        world: World,
        scene: Scene,
        collisionSystem: CollisionSystem,
        cameraSystem: CameraSystem,
    ): Promise<void> {
        try {
            // Load the configuration
            if (isWorldConfig(config)) {
                console.log('using worldConfig directly');
                this.worldConfig = config;
            } else {
                console.log('loading worldConfig from file');
                this.worldConfig = await this.configManager.loadConfig(config);
            }

            // Set up the world based on the configuration
            await this.setupEnvironment(scene);
            await this.loadSounds();
            await this.loadModels();
            await this.setupWorld(world, scene, collisionSystem, cameraSystem);
            await this.createPlayer(world, scene);
            await this.createNPCs(world, scene);

            console.log('World built successfully from config:', config);
        } catch (error) {
            console.error('Failed to build world from config:', error);
            throw error;
        }
    }

    /**
     * Set up the scene environment based on configuration
     * @param scene Three.js Scene
     */
    private async setupEnvironment(scene: Scene): Promise<void> {
        if (!this.worldConfig) return;

        const env = this.worldConfig.environment;

        // Set up fog
        if (env.fog) {
            if (
                env.fog.type === 'linear' &&
                env.fog.near !== undefined &&
                env.fog.far !== undefined
            ) {
                scene.fog = new THREE.Fog(
                    env.fog.color,
                    env.fog.near,
                    env.fog.far,
                );
            } else if (
                env.fog.type === 'exponential' &&
                env.fog.density !== undefined
            ) {
                scene.fog = new THREE.FogExp2(env.fog.color, env.fog.density);
            }
        }

        // Set up skybox/background
        if (env.skybox) {
            if (env.skybox.type === 'color') {
                scene.background = new THREE.Color(env.skybox.value);
            }
            // You can implement cubemap and HDRI loading here
        }

        // Set up ambient lighting
        if (env.ambient) {
            if (env.ambient.type === 'ambientLight') {
                const ambientLight = new THREE.AmbientLight(
                    env.ambient.color,
                    env.ambient.intensity,
                );
                scene.add(ambientLight);
            } else if (
                env.ambient.type === 'hemisphereLight' &&
                env.ambient.groundColor
            ) {
                const hemiLight = new THREE.HemisphereLight(
                    env.ambient.color,
                    env.ambient.groundColor,
                    env.ambient.intensity,
                );
                scene.add(hemiLight);
            }
        }

        // Set up directional light
        if (env.directional) {
            const directionalLight = new THREE.DirectionalLight(
                env.directional.color,
                env.directional.intensity,
            );

            const position = this.configManager.coordsToVector3(
                env.directional.position,
            );
            directionalLight.position.copy(position);

            if (env.directional.castShadow) {
                directionalLight.castShadow = true;

                if (env.directional.shadowMapSize) {
                    directionalLight.shadow.mapSize.width =
                        env.directional.shadowMapSize[0];
                    directionalLight.shadow.mapSize.height =
                        env.directional.shadowMapSize[1];
                }

                if (env.directional.shadowBias !== undefined) {
                    directionalLight.shadow.bias = env.directional.shadowBias;
                }
            }

            scene.add(directionalLight);
        }
    }

    /**
     * Load sounds defined in the configuration
     */
    private async loadSounds(): Promise<void> {
        if (!this.worldConfig) return;

        const soundAssets = this.worldConfig.assets.sounds || [];
        const soundsToLoad = soundAssets.map((sound) => ({
            key: sound.key,
            path: sound.path,
        }));

        await audioManager.loadSounds(soundsToLoad);
    }

    /**
     * Load models defined in the configuration
     */
    private async loadModels(): Promise<void> {
        if (!this.worldConfig) return;

        const gltfLoader = new GLTFLoader();
        gltfLoader.setMeshoptDecoder(MeshoptDecoder);
        const modelAssets = this.worldConfig.assets.models || [];

        const loadPromises = modelAssets.map(async (model) => {
            try {
                const gltf = await gltfLoader.loadAsync(model.path);
                this.loadedAssets.gltfs.set(model.key, gltf);
                this.loadedAssets.models.set(model.key, gltf.scene);
                console.log(`Model loaded: ${model.key} (${model.path})`);
            } catch (error) {
                console.error(
                    `Failed to load model: ${model.key} (${model.path})`,
                    error,
                );
                throw error;
            }
        });

        await Promise.all(loadPromises);
    }

    /**
     * Set up the world model and collision system
     */
    private async setupWorld(
        world: World,
        scene: Scene,
        collisionSystem: CollisionSystem,
        cameraSystem: CameraSystem,
    ): Promise<void> {
        if (!this.worldConfig) return;

        const worldModelKey = this.worldConfig.world.model;
        const worldScene = this.loadedAssets.models.get(worldModelKey);

        if (!worldScene) {
            throw new Error(`World model not found: ${worldModelKey}`);
        }

        // Update matrices before creating merged geometry
        worldScene.updateMatrixWorld(true);

        // Create merged geometry for collision
        const mergedGeometry = new GenericMergedGeometry(worldScene);

        // Generate BVH for collision detection
        console.log('Generating merged geometry for world geometry...');
        mergedGeometry.mergedGeometries.computeBoundsTree({ strategy: 0 }); // 0 = CENTER strategy
        console.log('World BVH generated.');

        // Add debug visualization if enabled
        if (this.worldConfig.debugOptions?.showColliders) {
            const collisionMesh = new THREE.Mesh(
                mergedGeometry.mergedGeometries,
                new THREE.MeshBasicMaterial({
                    wireframe: true,
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.5,
                }),
            );
            collisionMesh.name = 'CollisionDebugMesh';
            scene.add(collisionMesh);
        }

        // Add debug bounding box visualization if enabled
        if (this.worldConfig.debugOptions?.showBoundingBoxes) {
            const positionAttribute = mergedGeometry.mergedGeometries.attributes
                .position as THREE.BufferAttribute;
            const boundingBox = new THREE.Box3().setFromBufferAttribute(
                positionAttribute,
            );
            const boxHelper = new THREE.Box3Helper(boundingBox, 0xff0000);
            boxHelper.name = 'WorldBoundingBox';
            scene.add(boxHelper);
        }

        // Add world model to scene
        scene.add(worldScene);

        // Set up materials, shadows, and layers
        worldScene.traverse((child: THREE.Object3D) => {
            if (child.isObject3D) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.layers.set(RenderLayers.RENDER_LAYER);
            }
        });

        // Set up collision world
        const bvhCollisionWorld = new BVHCollisionWorld(
            mergedGeometry.mergedGeometries,
        );
        collisionSystem.setCollisionWorld(bvhCollisionWorld);
        cameraSystem.setCollisionWorld(bvhCollisionWorld);
    }

    /**
     * Create player entity from configuration
     */
    private async createPlayer(world: World, scene: Scene): Promise<void> {
        if (!this.worldConfig) return;

        // Get player configuration
        const playerConfig = this.worldConfig.player;
        const playerModelKey = playerConfig.model;
        const playerGltf = this.loadedAssets.gltfs.get(playerModelKey);

        if (!playerGltf) {
            throw new Error(`Player model not found: ${playerModelKey}`);
        }

        // Get spawn position
        const spawnPoint =
            this.worldConfig.spawnPoints.find((sp) => sp.id === 'default') ||
            this.worldConfig.spawnPoints[0];

        if (!spawnPoint) {
            throw new Error('No spawn point defined for player');
        }

        // Set up player assets
        const playerAssets: PlayerAssets = { soldierGltf: playerGltf };

        // Create player entity
        const { entity: playerEntity, object3D: playerObject } = createPlayable(
            world,
            playerAssets,
            {
                position: this.configManager.coordsToVector3(
                    spawnPoint.position,
                ),
                rotation: spawnPoint.rotation
                    ? this.configManager.arrayToQuaternion(spawnPoint.rotation)
                    : undefined,
                isControlled: true,
            },
        );

        scene.add(playerObject);

        // Add debug arrow to player if debug is enabled
        if (this.worldConfig.debugOptions?.showColliders) {
            const { entity: arrowEntity, object3D: arrowObject } =
                createDebugArrow(world, {
                    parentEntity: playerEntity,
                    offset: new THREE.Vector3(0, 1.0 + 0.35 * 2 + 0.1, 0),
                });
            scene.add(arrowObject);
        }
    }

    /**
     * Create NPC entities from configuration
     */
    private async createNPCs(world: World, scene: Scene): Promise<void> {
        if (!this.worldConfig || !this.worldConfig.npcs) return;

        for (const npcConfig of this.worldConfig.npcs) {
            const npcModelKey = npcConfig.model;
            const npcGltf = this.loadedAssets.gltfs.get(npcModelKey);

            if (!npcGltf) {
                console.error(
                    `NPC model not found: ${npcModelKey} for NPC ${npcConfig.id}`,
                );
                continue;
            }

            // Set up NPC assets (same structure as player assets)
            const npcAssets: PlayerAssets = { soldierGltf: npcGltf };

            // Create NPC entity (similar to player but with different settings)
            const { entity: _npcEntity, object3D: npcObject } = createPlayable(
                world,
                npcAssets,
                {
                    position: this.configManager.coordsToVector3(
                        npcConfig.position,
                    ),
                    rotation: npcConfig.rotation
                        ? this.configManager.arrayToQuaternion(
                              npcConfig.rotation,
                          )
                        : undefined,
                    isControlled: false,
                    cameraId: npcConfig.id,
                },
            );

            scene.add(npcObject);
        }
    }
}
