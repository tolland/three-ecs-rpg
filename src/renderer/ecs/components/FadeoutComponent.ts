// src/renderer/ecs/components/FadeoutComponent.ts
import { Component } from '@ecs/Component';

export class FadeoutComponent extends Component {
    constructor(public fadeOutTime = 1) {
        super();
    }
}
