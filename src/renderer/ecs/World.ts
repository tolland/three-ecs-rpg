// src/renderer/ecs/World.ts
import { Entity } from './Entity';
import { Component } from './Component';
import { System } from './System';
import { NameComponent } from '@ecs/components';
import { Serializer } from '@shared/serialization/Serializer';
import { three_replacer } from '@shared/serialization/three_replacer';
import {
    ComponentConstructor,
    ComponentInstance,
    EntityInfo,
} from './types/World';
import * as F from '@renderer/utils/chalkColors';

export const WorldLoggingConfig = {
    /** Main toggle for enabling/disable all AudioManager logging */
    enabled: false,
    logConstructors: false,
    logEntityCreate: false,
    logEnableDisable: false,
    /** Toggle for method invocation logging */
    logMethods: false,
    /** Style for manager names in logs */
    styleFocusChange: (name: string) => `\x1b[36m${name}\x1b[0m`, // Cyan color
    /** Style for lifecycle events */
    styleLifecycle: (event: string) => `\x1b[33m${event}\x1b[0m`, // Yellow color
};

export class World {
    private entities: Map<
        Entity,
        Map<ComponentConstructor<Component>, ComponentInstance>
    > = new Map();
    private _systems: System[] = [];
    private nextEntityId: number = 0;
    // Optional: Keep track of entities recently added/removed for system optimization
    // private entitiesToRemove: Set<Entity> = new Set();

    // --- Entity Management ---
    createEntity(): Entity {
        const entityId = this.nextEntityId++ as Entity;
        this.entities.set(entityId, new Map());
        // console.debug(`ECS: Created Entity ${entityId}`);
        if (
            WorldLoggingConfig.enabled &&
            WorldLoggingConfig.logEntityCreate
        ) {
            console.log(`${F.fcMagenta('World')}: Created entity ${entityId}}`);
        }
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
            const constructor = Object.getPrototypeOf(component)
                .constructor as ComponentConstructor<Component>;
            components.set(constructor, component);
            // console.debug(`ECS: Added ${component.constructor.name} to Entity ${entity}`);
        } else {
            console.warn(
                `ECS: Entity ${entity} not found when adding ${component.constructor.name}`,
            );
        }
    }

    removeComponent<T extends Component>(
        entity: Entity,
        componentType: ComponentConstructor<T>,
    ): void {
        const components = this.entities.get(entity);
        if (components && components.has(componentType)) {
            components.delete(componentType);
            // console.debug(`ECS: Removed ${componentType.name} from Entity ${entity}`);
        }
    }

    getComponent<T extends Component>(
        entity: Entity,
        componentType: ComponentConstructor<T>,
    ): T | undefined {
        const components = this.entities.get(entity);
        return components?.get(componentType) as T | undefined;
    }

    getComponents<
        T extends Record<string, ComponentConstructor<Component>>,
        R extends { [K in keyof T]: InstanceType<T[K]> | undefined },
    >(entity: Entity, componentMap: T): R {
        const result = {} as R;

        for (const [key, componentType] of Object.entries(componentMap)) {
            // Add explicit type casting to help TypeScript understand the relationship
            result[key as keyof R] = this.getComponent(
                entity,
                componentType,
            ) as R[keyof R];
        }

        return result;
    }

    hasComponent<T extends Component>(
        entity: Entity,
        componentType: ComponentConstructor<T>,
    ): boolean {
        return !!this.entities.get(entity)?.has(componentType);
    }

    // --- System Management ---
    addSystem(system: System): void {
        this._systems.push(system);
        // if (system.init) system.init(); // Call init if defined
    }

    getSystem<T extends System>(
        systemType: new (...args: any) => T,
    ): T | undefined {
        return this._systems.find((system) => system instanceof systemType) as
            | T
            | undefined;
    }

    get systems(): System[] {
        return this._systems;
    }

    /**]
     * This was created for the dbus ipc call. it is splitting the results
     * into {name, System} for easier rendering on client.
     */
    // *@TODO this is not returning pure json anymore
    getSystemsDataAsJson(): Array<[string, string]> | null {
        if (!this._systems) return null;
        try {
            return this._systems.map((system) => [
                system.constructor.name,
                Serializer.serializeToJSON(system, {
                    mode: 'full',
                    depth: 0,
                    maxDepth: 1,
                }),
            ]);
        } catch (e) {
            // console.dir(this._systems);
            console.error(`Error stringifying systems`, e);
            // TDOO need strategy for passing error from renderer through
            // to the dbus ipc that doesn't require weird types
            // return JSON.stringify({
            //     __error__: 'Failed to stringify systems',
            // });
            return null;
        }
    }

    // --- Get system by NAME ---
    getSystemByName(systemName: string): System | undefined {
        for (const instance of this._systems) {
            if (instance.constructor.name === systemName) {
                return instance;
            }
        }
        return undefined;
    }

    getSystemData(systemName: string) {
        if (!this._systems) return null;

        try {
            return this._systems.map((system) => [
                system.constructor.name,
                Serializer.serializeToJSON(system),
            ]);
        } catch (e) {
            console.dir(this._systems);
            console.error(`Error stringifying systems`, e);
            return JSON.stringify({
                __error__: 'Failed to stringify systems',
            });
        }
    }

    // --- Querying ---

    getEntities(): Entity[] {
        return Array.from(this.entities.keys());
    }

    // Finds all entities that have *all* the specified component types
    queryEntities<T extends Component[]>(
        componentTypes: [...{ [K in keyof T]: ComponentConstructor<T[K]> }],
    ): Entity[] {
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

    // --- Get component by NAME ---
    getComponentByName(
        entity: Entity,
        componentName: string,
    ): ComponentInstance | undefined {
        const components = this.entities.get(entity);
        if (!components) return undefined;

        for (const [constructor, instance] of components) {
            if (constructor.name === componentName) {
                return instance;
            }
        }
        return undefined;
    }

    getAllEntitiesWithName(): EntityInfo[] {
        const result: EntityInfo[] = [];
        this.entities.forEach(
            (
                components: Map<Function, ComponentInstance>,
                entityId: Entity,
            ) => {
                const nameComp: NameComponent | undefined = this.getComponent(
                    entityId,
                    NameComponent,
                );
                result.push({
                    id: entityId,
                    name: nameComp ? nameComp.name : `Entity_${entityId}`, // Default name if no component
                });
            },
        );
        return result;
    }

    getEntityComponentNames(entityId: Entity): string[] {
        const components = this.entities.get(entityId);
        if (!components) return [];
        return Array.from(components.keys()).map(
            (constructor) => constructor.name,
        );
    }

    getComponentDataAsJson(
        entityId: Entity,
        componentName: string,
    ): string | null {
        const component = this.getComponentByName(entityId, componentName);
        if (!component) return null;

        try {
            return JSON.stringify(component, three_replacer, 2); // Pretty print with 2 spaces
        } catch (e) {
            console.error(
                `Error stringifying component ${componentName} for entity ${entityId}:`,
                e,
            );
            return JSON.stringify({
                __error__: 'Failed to stringify component',
            });
        }
    }

    /**
     * Utility method to update a component's properties from another object.
     * preserving the types of the original component.
     * @param target
     * @param source
     * @private
     */
    updateComponent(
        target: Record<string, any>,
        source: Record<string, unknown>,
    ): void {
        for (const key of Object.keys(source)) {
            if (
                source[key] &&
                typeof source[key] === 'object' &&
                !Array.isArray(source[key])
            ) {
                if (!target[key] || typeof target[key] !== 'object') {
                    target[key] = {};
                }
                this.updateComponent(
                    target[key] as Record<string, unknown>,
                    source[key] as Record<string, unknown>,
                );
            } else {
                target[key] = source[key];
            }
        }
    }

    setComponentDataFromJson(
        entityId: Entity,
        componentName: string,
        jsonData: string,
    ): boolean {
        const component = this.getComponentByName(entityId, componentName);
        if (!component) return false;

        try {
            const parsedData = JSON.parse(jsonData);

            this.updateComponent(component, parsedData);

            return true;
        } catch (e) {
            console.error(
                `Error parsing JSON data for component ${componentName} of entity ${entityId}:`,
                e,
            );
            return false;
        }
    }

    // Get all components for a specific entity (useful within systems)
    getEntityComponents(
        entity: Entity,
    ): ReadonlyMap<Function, ComponentInstance> | undefined {
        return this.entities.get(entity);
    }

    // --- Update Loop ---
    update(deltaTime: number): void {
        // Process entity removals queued in the previous frame (if using queueing)
        // this.processEntityRemovals();

        for (const system of this._systems) {
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
    clear() {
        // Clear systems of state in reverse creation order
        for (let i = this._systems.length - 1; i >= 0; i--) {
            this._systems[i].clear();
        }
        const entityKeys = Array.from(this.entities.keys()).reverse();
        for (const entity of entityKeys) {
            const componentMap = this.entities.get(entity);
            if (componentMap) {
                for (const [key, component] of componentMap) {
                    this.removeComponent(entity, key);
                }
            }
            this.destroyEntity(entity);
        }
    }

    destroy() {
        this.clear();
    }
}
