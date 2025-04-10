// src/renderer/ecs/components/GodModeComponent.ts
import { Component } from '@ecs/Component';

export class GodModeComponent extends Component {
    constructor(
        public collideWorld: boolean = false,
        public collideEntities: boolean = false,
        public gravity: boolean = false,
    ) {
        super();
    }
}
