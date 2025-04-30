// src/renderer/ecs/components/debug/FadeoutComponent.ts
import { Component } from '@ecs/Component';

/**
 * When attached to an entity will cause it to fade out over time and remove
 * itself from the game world. Useful for debug entities.
 */
export class FadeoutComponent extends Component {
    constructor(public fadeOutTime = 1) {
        super();
    }
}
