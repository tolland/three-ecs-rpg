import { World } from './World';

export abstract class Prefab {
    // Systems contain logic that operates on entities with specific components.
    protected constructor(protected world: World) {}

    public static create(world: World): Prefab {
        // This method should be overridden by subclasses to create the prefab.
        // It can be used to instantiate entities, add components, etc.
        throw new Error('create() method must be implemented in subclass');
    }

    // Optional methods for setup or teardown
    // init?(): void;
    // destroy?(): void;
}
