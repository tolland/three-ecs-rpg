// src/renderer/core/ManagerRegistry.ts

// Define a type for manager instances
type Manager = object;

// Create a decorator that automatically registers manager classes
export function RegisterManager(name?: string) {
    return function <T extends { new(...args: any): object }>(constructor: T) {
        // Create a new constructor function
        const newConstructor = function(...args: unknown[]) {
            const instance = new constructor(...args);
            // Automatically register this instance
            const managerName = name || constructor.name;
            registry.register(managerName, instance);
            return instance;
        };

        // Copy prototype so instanceof operator still works
        newConstructor.prototype = constructor.prototype;

        // Copy static properties
        Object.setPrototypeOf(newConstructor, constructor);

        // Copy the name property
        Object.defineProperty(newConstructor, 'name', {
            value: constructor.name,
            configurable: true
        });

        // Return the new constructor
        return newConstructor as unknown as T;
    };
}

/**
 * ManagerRegistry to expose managers to dbus and ipc
 */
export class ManagerRegistry {
    private static _instance: ManagerRegistry;
    private _managers: Map<string, Manager> = new Map();

    private constructor() {
    }

    static get instance(): ManagerRegistry {
        if (!ManagerRegistry._instance) {
            ManagerRegistry._instance = new ManagerRegistry();
        }
        return ManagerRegistry._instance;
    }

    /**
     * Register a manager with the registry
     */
    register(name: string, instance: Manager): void {
        this._managers.set(name, instance);
        console.log(`Manager registered: ${name}`);
    }

    get managers(): Map<string, Manager> {
        return this._managers;
    }

    /**
     * Get a manager by name
     */
    get(name: string): Manager | undefined {
        return this._managers.get(name);
    }

    /**
     * Get all manager names
     */
    getNames(): string[] {
        return Array.from(this._managers.keys());
    }

    getAll(): Map<string, Manager> {
        return new Map(this._managers);
    }

    getManager(name: string): Manager | undefined {
        return this._managers.get(name);
    }

    /**
     * Get all managers as entries [name, instance][]
     */
    getAllManagers(): [string, Manager][] {
        return Array.from(this._managers.entries());
    }

    getManagerNames(): string[] {
        return Array.from(this._managers.keys());
    }

    getManagers(): Map<string, Manager> {
        return new Map(this._managers);
    }

    /**
     * Get manager data for serialization/debugging
     */
    getManagerData(managerName: string): unknown {
        const manager = this._managers.get(managerName);
        if (!manager) return null;

        try {
            return JSON.stringify(manager, null, 2);
        } catch (e) {
            console.error(`Error serializing manager ${managerName}:`, e);
            return { __error__: `Failed to stringify manager ${managerName}` };
        }
    }

    /**
     * List all managers with their type names
     */
    listManagers(): [string, string][] {
        return Array.from(this._managers.entries()).map(([name, instance]) =>
            [name, instance.constructor.name]
        );
    }

}

const registry = ManagerRegistry.instance;

// Usage
// registry.register("PlayerManager", new PlayerManager());
