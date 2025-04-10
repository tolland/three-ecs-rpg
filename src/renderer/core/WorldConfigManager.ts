import * as YAML from 'yaml';
import * as THREE from 'three';
import { ConfigManager } from './ConfigManager';
import { readFile, saveConfig } from '@renderer/logic/ConfigManager';
import { Serializer } from '@shared/serialization/Serializer';
import { AssetReference, NPCDefinition, SpawnPointDefinition, WorldConfig } from '@renderer/types/worldConfig';


/**
 * Manager for loading and accessing world configuration data from YAML files
 */
export class WorldConfigManager extends ConfigManager<WorldConfig> {
    private _config: WorldConfig | null = null;
    private _configPath: string | null = null;

    /**
     * Load configuration from a YAML file
     * @param configPath Path to the configuration file
     */
    public async loadConfig(configPath: string): Promise<WorldConfig> {
        try {
            this._configPath = configPath;

            // const response = await fetch(configPath);

            const response = await readFile(configPath);
            if (!response) {
                throw new Error(
                    `Failed to fetch configuration file: ${response}`,
                );
            }

            this._config = YAML.parse(response) as WorldConfig;

            // Validate the configuration
            this.validateConfig(this._config);

            return this._config;
        } catch (error) {
            console.error(
                `Failed to load world configuration from ${configPath}:`,
                error,
            );
            throw error;
        }
    }

    /**
     * Get the current configuration
     */
    public getConfig(): WorldConfig | null {
        return this._config;
    }

    /**
     * Get the current configuration file path
     */
    public getConfigPath(): string | null {
        return this._configPath;
    }

    /**
     * Validate the loaded configuration
     * @param config The configuration to validate
     */
    private validateConfig(config: WorldConfig): void {
        // Basic validation
        if (!config.name) throw new Error('World config must have a name');
        if (!config.version)
            throw new Error('World config must have a version');
        if (!config.assets)
            throw new Error('World config must have assets defined');
        if (!config.world)
            throw new Error('World config must have a world defined');
        if (!config.player)
            throw new Error('World config must have a player defined');
    }

    /**
     * Helper method to convert array coordinates to Vector3
     * @param coords Array of 3 numbers [x, y, z]
     */
    public coordsToVector3(coords: [number, number, number]): THREE.Vector3 {
        return new THREE.Vector3(coords[0], coords[1], coords[2]);
    }

    /**
     * Helper method to convert array quaternion to Quaternion
     * @param quat Array of 4 numbers [x, y, z, w]
     */
    public arrayToQuaternion(
        quat: [number, number, number, number],
    ): THREE.Quaternion {
        return new THREE.Quaternion(quat[0], quat[1], quat[2], quat[3]);
    }

    /**
     * Get an asset reference by key
     * @param key The key of the asset to find
     * @param type Optional asset type filter
     */
    public getAssetByKey(
        key: string,
        type?: 'model' | 'sound' | 'texture' | 'environment',
    ): AssetReference | undefined {
        if (!this._config) return undefined;

        // Search in all asset collections
        const allAssets = [
            ...(this._config.assets.models || []),
            ...(this._config.assets.sounds || []),
            ...(this._config.assets.textures || []),
            ...(this._config.assets.environments || []),
        ];

        return allAssets.find(
            (asset) =>
                asset.key === key &&
                (type === undefined || asset.type === type),
        );
    }

    /**
     * Get a spawn point by ID
     * @param id The ID of the spawn point
     */
    public getSpawnPoint(id: string): SpawnPointDefinition | undefined {
        if (!this._config) return undefined;
        return this._config.spawnPoints.find((sp) => sp.id === id);
    }

    /**
     * Get an NPC definition by ID
     * @param id The ID of the NPC
     */
    public getNPC(id: string): NPCDefinition | undefined {
        if (!this._config || !this._config.npcs) return undefined;
        return this._config.npcs.find((npc) => npc.id === id);
    }

    /**
     * Save the current configuration to the original file
     */
    public async saveConfig(): Promise<void> {
        if (!this._config || !this._configPath) {
            throw new Error('No configuration loaded to save');
        }

        try {
            const yamlString = Serializer.serialize(this._config);
            await saveConfig(this._configPath, yamlString, 'yaml');
        } catch (error) {
            console.error(
                `Failed to save world configuration to ${this._configPath}:`,
                error,
            );
            throw error;
        }
    }

    /**
     * Save the configuration to a specific file path
     * @param filePath Path to save the configuration to
     */
    public async saveConfigAs(filePath: string): Promise<void> {
        if (!this._config) {
            throw new Error('No configuration loaded to save');
        }

        try {
            const yamlString = Serializer.serialize(this._config);
            await saveConfig(filePath, yamlString, 'yaml');
            this._configPath = filePath;
        } catch (error) {
            console.error(
                `Failed to save world configuration to ${filePath}:`,
                error,
            );
            throw error;
        }
    }

    /**
     * Open a world configuration file using the Electron file dialog
     * @returns Promise that resolves when the config is loaded
     */
    public async openConfigViaDialog(): Promise<WorldConfig> {
        try {
            const result = await window.electronIPC.invoke('open-world-config');

            if (!result.success) {
                if (result.canceled) {
                    throw new Error('File dialog was canceled');
                }
                throw new Error(
                    result.error || 'Failed to open world configuration',
                );
            }

            this._configPath = result.path;
            this._config = result.config;

            if (!this._config) {
                throw new Error('Failed to load world configuration');
            }
            // Validate the loaded configuration
            this.validateConfig(this._config);
            return this._config;
        } catch (error) {
            console.error('Failed to open world configuration:', error);
            throw error;
        }
    }

    /**
     * Save the current configuration using the Electron file dialog
     * @returns Promise that resolves when the config is saved
     */
    public async saveConfigViaDialog(): Promise<string> {
        if (!this._config) {
            throw new Error('No configuration to save');
        }

        try {
            const result = await window.electronIPC.invoke(
                'save-world-config',
                this._config,
            );

            if (!result.success) {
                if (result.canceled) {
                    throw new Error('File dialog was canceled');
                }
                throw new Error(
                    result.error || 'Failed to save world configuration',
                );
            }

            this._configPath = result.path;
            return result.path;
        } catch (error) {
            console.error('Failed to save world configuration:', error);
            throw error;
        }
    }

    /**
     * Create a default world configuration
     * @returns A new default world configuration
     */
    public createDefaultConfig(): WorldConfig {
        const defaultConfig: WorldConfig = {
            name: 'New World',
            version: '1.0.0',
            assets: {
                models: [
                    {
                        type: 'model',
                        key: 'world',
                        path: 'assets/worlds/low-poly_fps_map.glb',
                    },
                    {
                        type: 'model',
                        key: 'soldier',
                        path: 'assets/skins/character.glb',
                    },
                ],
                sounds: [
                    {
                        type: 'sound',
                        key: 'jump',
                        path: 'assets/sounds/jump.wav',
                    },
                    {
                        type: 'sound',
                        key: 'land_hard',
                        path: 'assets/sounds/land_hard.wav',
                    },
                ],
            },
            world: {
                model: 'world',
                boundingBox: {
                    min: [-50, -10, -50],
                    max: [50, 30, 50],
                },
            },
            environment: {
                fog: {
                    type: 'exponential',
                    color: '#88ccee',
                    density: 0.05,
                },
                skybox: {
                    type: 'color',
                    value: '#88ccee',
                },
                ambient: {
                    type: 'hemisphereLight',
                    color: '#ffffff',
                    intensity: 0.8,
                    groundColor: '#444444',
                },
                directional: {
                    color: '#ffffff',
                    intensity: 1.0,
                    position: [10, 20, 10],
                    castShadow: true,
                },
            },
            player: {
                model: 'soldier',
                radius: 0.35,
                height: 1.0,
                mass: 70,
                speed: 5.0,
                jumpForce: 8.0,
                sounds: {
                    JUMP: 'jump',
                    IMPACT_GROUND_HARD: 'land_hard',
                },
            },
            spawnPoints: [
                {
                    id: 'default',
                    position: [0, 2, 5],
                },
            ],
            debugOptions: {
                showColliders: true,
                showBoundingBoxes: true,
                showSpawnPoints: true,
            },
        };

        this._config = defaultConfig;
        this._configPath = null;

        return defaultConfig;
    }
}

// Create and export singleton instance
export const worldConfigManager = new WorldConfigManager();
