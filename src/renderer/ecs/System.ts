import { World } from './World';
import { Entity } from './Entity';

export abstract class System {
    // Systems contain logic that operates on entities with specific components.
    constructor(protected world: World) {}

    // Called every frame/tick. Delta time in seconds.
    abstract update(deltaTime: number): void;

    // Optional methods for setup or teardown
    // init?(): void;
    // destroy?(): void;
}