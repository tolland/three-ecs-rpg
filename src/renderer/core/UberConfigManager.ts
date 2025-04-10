// src/renderer/core/UberConfigManager.ts
import { AppEventManager, appEventManager } from './AppEventManager';
import { IConfigManager } from '@core/ConfigManager'; // Import sub-managers

export interface ConfigSetter {
    (value: any): void;
}


/**
 *  Define structure for config metadata (optional but useful for GUIs/validation)
 */
export interface ConfigMetadata {
    type: 'number' | 'string' | 'boolean' | 'enum';
    min?: number;
    max?: number;
    step?: number;
    enumOptions?: string[];
    description?: string;
}

/**
 * The aim here was to create a single UberConfigManager that can manage multiple sub-managers. This would be the API for dbus and IPC access to configuration
 */
export class UberConfigManager {
    // private input: InputConfigManager; // Add later
    // private ui: UIConfigManager; // Add later
    private configManagers: Record<string, IConfigManager> = {};
    private setters: Map<string, ConfigSetter> = new Map();

    private configTree: any = {}; // Represents the structure for GUIs
    private metadataMap: Map<string, ConfigMetadata> = new Map(); // Metadata for keys

    constructor(
        private eventManager: AppEventManager = appEventManager, // Use singleton by default
    ) {
        // this.registerConfigManager('physics', physicsManager);
        // this.registerConfigManager('simulation', simulationManager); // Register new manager

    }

    registerConfigManager(prefix: string, manager: IConfigManager) {
        this.configManagers[prefix] = manager;
        const config = manager.getConfig();
        const setters = manager.getSetters();
        const metadata = manager.getMetadata();

        this.configTree[prefix] = config;
        for (const key in setters) {
            this.setters.set(`${prefix}.${key}`, setters[key]);
        }
        for (const key in metadata) {
            this.metadataMap.set(`${prefix}.${key}`, metadata[key]);
        }
    }

    // Method for sub-managers to register their config and metadata
    protected registerManager(prefix: string, /*...*/ setterMap: Record<string, ConfigSetter>) {
        // ... store configTree/metadata ...
        for(const key in setterMap) {
            this.setters.set(`${prefix}.${key}`, setterMap[key]);
        }
    }

    // --- Public API ---

    /**
     * Get a configuration value using dot notation.
     * Example: get('physics.player.walkSpeed')
     */
    get(key: string): any {
        const keys = key.split('.');
        let current: any = this.configTree;
        try {
            for (const k of keys) {
                current = current[k];
                if (current === undefined) return undefined;
            }
            return current;
        } catch (e) {
            console.warn(`UberConfigManager: Error getting key "${key}"`, e);
            return undefined;
        }
    }

    /**
     * Set a configuration value using dot notation.
     * Example: set('physics.player.walkSpeed', 6.0)
     */
    set(key: string, value: any): boolean {
        const setter = this.setters.get(key);
        if(setter) {
            try {
                // TODO: Validate value against metadata before calling setter
                setter(value);
                this.eventManager.emit('configChanged' as any, { key, value });
                return true;
            } catch(e) { /* error */ return false; }
        }
        return false; // Setter not found
    }

    /**
     * Get the entire configuration tree (e.g., for GUIs).
     */
    getConfigTree(): Readonly<any> {
        return this.configTree;
    }

    /**
     * Get metadata for a specific key (e.g., for GUIs).
     */
    getMetadata(key: string): Readonly<ConfigMetadata> | undefined {
        return this.metadataMap.get(key);
    }
}
