

/**
 * Interface for the complete world configuration
 */
export interface WorldConfig {
    name: string;
    version: string;
    assets: {
        models: AssetReference[];
        sounds: AssetReference[];
        textures?: AssetReference[];
        environments?: AssetReference[];
    };
    world: {
        model: string; // key reference to the world model asset
        collisionModel?: string;
        boundingBox?: {
            min: [number, number, number];
            max: [number, number, number];
        };
    };
    environment: SceneEnvironmentDefinition;
    player: PlayerDefinition;
    spawnPoints: SpawnPointDefinition[];
    npcs?: NPCDefinition[];
    debugOptions?: {
        showColliders: boolean;
        showBoundingBoxes: boolean;
        showSpawnPoints: boolean;
    };
}


/**
 * Interface for defining asset references
 */
export interface AssetReference {
    type: 'model' | 'sound' | 'texture' | 'environment';
    path: string;
    key: string;
}

/**
 * Interface for defining spawn points
 */
export interface SpawnPointDefinition {
    id: string;
    position: [number, number, number];
    rotation?: [number, number, number, number]; // Quaternion [x, y, z, w]
}

/**
 * Interface for defining threejs scene environment settings
 */
export interface SceneEnvironmentDefinition {
    fog?: {
        type: 'linear' | 'exponential';
        color: string; // hex color
        near?: number;
        far?: number;
        density?: number;
    };
    skybox?: {
        type: 'color' | 'cubemap' | 'hdri';
        value: string; // color or path to cubemap/hdri
    };
    ambient?: {
        type: 'ambientLight' | 'hemisphereLight';
        color: string;
        intensity: number;
        groundColor?: string; // for hemisphere light
    };
    directional?: {
        color: string;
        intensity: number;
        position: [number, number, number];
        castShadow: boolean;
        shadowMapSize?: [number, number];
        shadowBias?: number;
    };
    postprocessing?: {
        enabled: boolean;
        effects: string[];
    };
}

/**
 * Interface for defining player configuration
 */
export interface PlayerDefinition {
    model: string; // key reference to the model asset
    radius: number;
    height: number;
    mass: number;
    speed: number;
    jumpForce: number;
    sounds?: {
        [key: string]: string; // sound action to sound key mapping
    };
}

/**
 * Interface for defining NPC configuration
 */
export interface NPCDefinition {
    id: string;
    model: string; // key reference to the model asset
    position: [number, number, number];
    rotation?: [number, number, number, number];
    radius?: number;
    height?: number;
    mass?: number;
    behavior?: string;
}

export {};
