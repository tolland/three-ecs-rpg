// src/renderer/core/PhysicsConfigManager.ts

import { ConfigMetadata } from '@core/UberConfigManager';

export interface PlayerPhysicsConfig {
    walkSpeed: number;
    runSpeed: number;
    jumpForce: number;
    stopDampingMultiplier: number;
}

export interface PhysicsConfig {
    baseGravity: number;
    globalDamping: number;
    player: PlayerPhysicsConfig;
}

// Default values in case loading fails
const DEFAULT_CONFIG: PhysicsConfig = {
    baseGravity: 19.62,
    globalDamping: 0.1,
    player: {
        walkSpeed: 5,
        runSpeed: 9,
        jumpForce: 8,
        stopDampingMultiplier: 5,
    },
};

export class PhysicsConfigManager {
    public config: PhysicsConfig = DEFAULT_CONFIG;
    private isLoaded = false;

    // Method called by UberConfigManager when a value changes
    updateValueFromUber(subKey: string, value: any): void {
        // Find the correct property and call the specific setter
        // This is tedious, highlights need for better registration (e.g., map of setters)
        if (subKey === 'baseGravity') this.setBaseGravity(value);
        else if (subKey === 'globalDamping') this.setGlobalDamping(value);
        else if (subKey === 'player.walkSpeed') this.setPlayerWalkSpeed(value);
        // ... etc. for all properties ...
        else {
            console.warn(
                `PhysicsConfigManager: Unknown subKey "${subKey}" from UberConfigManager`,
            );
        }
    }

    // Method to provide metadata (example)
    getMetadata(): Record<string, ConfigMetadata> {
        return {
            baseGravity: {
                type: 'number',
                min: 0,
                step: 0.1,
                description: 'Base gravitational acceleration',
            },
            globalDamping: {
                type: 'number',
                min: 0,
                max: 1,
                step: 0.01,
                description: 'General velocity damping',
            },
            'player.walkSpeed': {
                type: 'number',
                min: 0,
                description: 'Player walk speed',
            },
            'player.runSpeed': {
                type: 'number',
                min: 0,
                description: 'Player run speed',
            },
            'player.jumpForce': {
                type: 'number',
                min: 0,
                description: 'Player jump force',
            },
            'player.stopDampingMultiplier': {
                type: 'number',
                min: 1,
                description: 'Multiplier for damping when stopping',
            },
        };
    }

    async loadConfig(configPath: string): Promise<void> {
        try {
            const response = await fetch(configPath);
            if (!response.ok) {
                throw new Error(
                    `Failed to load physics config: ${response.statusText}`,
                );
            }
            // TODO: Add validation here (e.g., using a library like Zod)
            // to ensure the loaded JSON matches the PhysicsConfig structure.
            const loadedConfig: PhysicsConfig = await response.json();
            this.config = { ...DEFAULT_CONFIG, ...loadedConfig }; // Merge loaded over defaults
            this.isLoaded = true;
            console.log('Physics configuration loaded:', this.config);
        } catch (error) {
            console.error(
                'Error loading or parsing physics config, using defaults:',
                error,
            );
            this.config = DEFAULT_CONFIG;
            this.isLoaded = false; // Indicate loading failed, using defaults
        }
    }

    // --- Getters ---
    public getBaseGravity(): number {
        return this.config.baseGravity;
    }
    public getGlobalDamping(): number {
        return this.config.globalDamping;
    }
    public getPlayerConfig(): PlayerPhysicsConfig {
        return this.config.player;
    }

    // --- Setters (for real-time modification) ---
    public setBaseGravity(value: number): void {
        if (typeof value === 'number') this.config.baseGravity = value;
    }
    public setGlobalDamping(value: number): void {
        if (typeof value === 'number') this.config.globalDamping = value;
    }
    public setPlayerWalkSpeed(value: number): void {
        if (typeof value === 'number') this.config.player.walkSpeed = value;
    }
    public setPlayerRunSpeed(value: number): void {
        if (typeof value === 'number') this.config.player.runSpeed = value;
    }
    public setPlayerJumpForce(value: number): void {
        if (typeof value === 'number') this.config.player.jumpForce = value;
    }
    public setPlayerStopDampingMultiplier(value: number): void {
        if (typeof value === 'number')
            this.config.player.stopDampingMultiplier = value;
    }

    // Optional: Get the whole config object (e.g., for debug display)
    public getConfig(): Readonly<PhysicsConfig> {
        return this.config;
    }
}

export const physicsConfigManager = new PhysicsConfigManager();
