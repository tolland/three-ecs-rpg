// src/renderer/ecs/Component.ts
// Base class (optional, can also use interfaces/types)
// Using classes allows for `instanceof` checks if needed.
export abstract class Component {
    // Components primarily hold data.
    // Use specific properties in inheriting classes.
    attach(): void {

    }
    detach(): void {

    }
}
