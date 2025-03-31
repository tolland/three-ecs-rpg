// src/renderer/ecs/components/MovementStateComponent.ts
import { Component } from '@ecs/Component';

export type MovementStateType = 'grounded' | 'falling' | 'jumping' | 'flying';

export class MovementStateComponent extends Component {
    constructor(public state: MovementStateType = 'falling') { super(); } // Start falling
}
