// src/renderer/ecs/components/GodModeComponent.ts
import { Component } from '@ecs/Component';

/**
 * when attached to an entity, it will be exempt from various physics and damage
 * calculations.
 *
 */
export class GodModeComponent extends Component {
    constructor(
        public collideWorld: boolean = false,
        public collideEntities: boolean = false,
        public gravity: boolean = false,
    ) {
        super();
    }
}
