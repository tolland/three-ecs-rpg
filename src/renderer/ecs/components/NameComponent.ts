// src/renderer/ecs/components/NameComponent.ts
import { Component } from '@ecs/Component';

export class NameComponent extends Component {
    constructor(public name: string) {
        super();
    }
}
