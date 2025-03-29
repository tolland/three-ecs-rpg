import { Component } from '@ecs/Component';

export class WindAffectedComponent extends Component {
    // Resistance factor (higher value means less affected by wind)
    constructor(public resistance: number = 1.0) { super(); }
}