import { World } from './World';

export abstract class System {
    // Systems contain logic that operates on entities with specific components.
    protected constructor(protected world: World) {
    }

    // Called every frame/tick. Delta time in seconds.
    update(deltaTime: number): void {}

    // Optional methods for setup or teardown
    init(): void {
        // Initialization logic, if needed
        console.warn(`"${this.constructor.name}" system initialized`);
    }

    /**
     * Clears the system's state for recreation of a new world. Most systems
     * don't have any state, so this is optional.
     */
    clear(): void {}

    /**
     * Cleans up resources, listeners, etc. Called when the world is destroyed.
     * Usually when the app is quitting, it won't likely be possibly to reuse it
     */
    destroy(): void {
        this.clear();
        console.warn(`"${this.constructor.name}" system handled by World`);
    }
}
