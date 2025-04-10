// src/renderer/ecs/components/MovementStateComponent.ts
import { Component } from '@ecs/Component';

export type MovementStateType =
    | 'grounded'
    | 'falling'
    | 'jumping'
    | 'flying'
    | 'levitating';

export class MovementStateComponent extends Component {
    private _state: MovementStateType = 'falling';

    constructor(state: MovementStateType = 'falling') {
        super();
        this._state = state;
    }
    get state(): MovementStateType {
        return this._state;
    }
    set state(value: MovementStateType) {
        this._state = value;
    }
}
