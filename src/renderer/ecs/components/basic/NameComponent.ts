// src/renderer/ecs/components/basic/NameComponent.ts
import { Component } from '@ecs/Component';

/**
 * name the entity for easy lookup
 */
export class NameComponent extends Component {
    constructor(public name: string) {
        super();
    }
}
