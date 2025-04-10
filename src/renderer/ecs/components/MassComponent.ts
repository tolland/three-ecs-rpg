// src/renderer/ecs/components/MassComponent.ts
import { Component } from '@ecs/Component';

export class MassComponent extends Component {
    constructor(public mass: number = 1.0) {
        super();
    }
}

