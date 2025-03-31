// src/renderer/core/UberConfigManager.ts
import { AppEventManager, appEventManager } from './AppEventManager'; // For emitting change events
import { PhysicsConfigManager } from './PhysicsConfigManager'; // Import sub-managers
// Import other config managers (Input, UI, etc.) as they are created

// Define structure for config metadata (optional but useful for GUIs/validation)
export interface ConfigMetadata {
    type: 'number' | 'string' | 'boolean' | 'enum';
    min?: number;
    max?: number;
    step?: number;
    enumOptions?: string[];
    description?: string;
}

export class UberConfigManager {
    // Store references to sub-managers
    private physics: PhysicsConfigManager;
    // private input: InputConfigManager; // Add later
    // private ui: UIConfigManager; // Add later

    private configTree: any = {}; // Represents the structure for GUIs
    private metadataMap: Map<string, ConfigMetadata> = new Map(); // Metadata for keys

    constructor(
        physicsManager: PhysicsConfigManager,
        // Inject other managers
        private eventManager: AppEventManager = appEventManager, // Use singleton by default
    ) {
        this.physics = physicsManager;
        // Register managers
        this.registerManager(
            'physics',
            this.physics.getConfig(),
            this.physics.getMetadata(),
        ); // Assume managers provide these
    }

    // Method for sub-managers to register their config and metadata
    // (Could be more sophisticated, e.g., manager provides setter functions too)
    private registerManager(
        prefix: string,
        configObject: any,
        metadata: Record<string, ConfigMetadata>,
    ) {
        this.configTree[prefix] = configObject;
        for (const key in metadata) {
            this.metadataMap.set(`${prefix}.${key}`, metadata[key]);
        }
        // TODO: Recursively handle nested objects in configObject/metadata if needed
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
        const keys = key.split('.');
        const prefix = keys[0];
        const subKey = keys.slice(1).join('.'); // Key within the sub-manager

        try {
            // TODO: Improve this routing - ideally call specific setters on sub-managers
            // This basic version modifies the mirrored configTree directly,
            // relying on sub-managers referencing the same object or needing notification.
            // A better way: UberConfig stores setters provided by sub-managers.
            let current: any = this.configTree;
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
                if (current === undefined) return false; // Path doesn't exist
            }
            const finalKey = keys[keys.length - 1];
            if (current[finalKey] === undefined) return false; // Key doesn't exist

            // TODO: Add type validation based on metadataMap before setting
            console.log(`UberConfigManager: Setting ${key} to ${value}`);
            current[finalKey] = value;

            // --- !!! Crucially, notify the actual sub-manager !!! ---
            // This needs a better mechanism, e.g., calling a 'set' method on the sub-manager
            if (prefix === 'physics') {
                // this.physics.updateValueFromUber(subKey, value); // Need this method on PhysicsConfigManager
            }
            // else if (prefix === 'input') { ... }

            // Emit a global change event
            this.eventManager.emit('configChanged' as any, { key, value }); // Use a specific event type?

            return true;
        } catch (e) {
            console.error(`UberConfigManager: Error setting key "${key}"`, e);
            return false;
        }
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
