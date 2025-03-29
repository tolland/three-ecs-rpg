
// src/renderer/ecs/World.ts
import { Entity } from './Entity';
import { Component } from './Component';
import { System } from './System';

// Type for Component Constructor (Class)
type ComponentConstructor<T extends Component> = new (...args: any[]) => T;
// Type for Component Instance
type ComponentInstance = Component;

export class World {
    private entities: Map<Entity, Map<Function, ComponentInstance>> = new Map();
    private systems: System[] = [];
    private nextEntityId: Entity = 0;
    // Optional: Keep track of entities recently added/removed for system optimization
    // private entitiesToRemove: Set<Entity> = new Set();

    // --- Entity Management ---
    createEntity(): Entity {
        const entityId = this.nextEntityId++;
        this.entities.set(entityId, new Map());
        // console.debug(`ECS: Created Entity ${entityId}`);
        return entityId;
    }

    destroyEntity(entity: Entity): void {
        if (this.entities.has(entity)) {
            // console.debug(`ECS: Destroying Entity ${entity}`);
            // TODO: Consider delaying removal until end of frame to avoid iteration issues
            this.entities.delete(entity);
            // this.entitiesToRemove.add(entity); // Alternative: queue removal
        }
    }

    // --- Component Management ---
    addComponent<T extends Component>(entity: Entity, component: T): void {
        const components = this.entities.get(entity);
        if (components) {
            // Use component's constructor as the key for easy lookup by type
            components.set(component.constructor, component);
            // console.debug(`ECS: Added ${component.constructor.name} to Entity ${entity}`);
        } else {
            console.warn(`ECS: Entity ${entity} not found when adding ${component.constructor.name}`);
        }
    }

    removeComponent<T extends Component>(entity: Entity, componentType: ComponentConstructor<T>): void {
        const components = this.entities.get(entity);
        if (components && components.has(componentType)) {
            components.delete(componentType);
            // console.debug(`ECS: Removed ${componentType.name} from Entity ${entity}`);
        }
    }

    getComponent<T extends Component>(entity: Entity, componentType: ComponentConstructor<T>): T | undefined {
        const components = this.entities.get(entity);
        return components?.get(componentType) as T | undefined;
    }

    hasComponent<T extends Component>(entity: Entity, componentType: ComponentConstructor<T>): boolean {
        return !!this.entities.get(entity)?.has(componentType);
    }

    // --- System Management ---
    addSystem(system: System): void {
        this.systems.push(system);
        // if (system.init) system.init(); // Call init if defined
    }

    // --- Querying ---
    // Finds all entities that have *all* the specified component types
    queryEntities<T extends Component[]>(componentTypes: [...{ [K in keyof T]: ComponentConstructor<T[K]> }]): Entity[] {
        const matchingEntities: Entity[] = [];
        const entitiesArray = Array.from(this.entities.entries()); // Convert Map to Array

        for (const [entity, components] of entitiesArray) {
            let match = true;
            for (const type of componentTypes) {
                if (!components.has(type)) {
                    match = false;
                    break;
                }
            }
            if (match) {
                matchingEntities.push(entity);
            }
        }
        return matchingEntities;
    }

    // Get all components for a specific entity (useful within systems)
    getEntityComponents(entity: Entity): ReadonlyMap<Function, ComponentInstance> | undefined {
        return this.entities.get(entity);
    }


    // --- Update Loop ---
    update(deltaTime: number): void {
        // Process entity removals queued in the previous frame (if using queueing)
        // this.processEntityRemovals();

        for (const system of this.systems) {
            system.update(deltaTime);
        }
    }

    // private processEntityRemovals(): void {
    //     if (this.entitiesToRemove.size > 0) {
    //         for (const entity of this.entitiesToRemove) {
    //             this.entities.delete(entity);
    //         }
    //         this.entitiesToRemove.clear();
    //     }
    // }
}