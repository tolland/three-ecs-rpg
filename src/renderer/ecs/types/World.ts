import { Component } from '@renderer/ecs';
import { Entity } from '../Entity';

export type ComponentConstructor<T extends Component> = new (
    ...args: any[]
) => T;
// Type for Component Instance
export type ComponentInstance = Component;

// Type for named entity reference
export interface EntityInfo {
    id: Entity;
    name: string;
}
