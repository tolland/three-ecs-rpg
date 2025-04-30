// src/renderer/ecs/components/position/MovementStateComponent.ts
import { Component } from '@ecs/Component';


export type MovementStateType =
    | 'grounded'
    | 'falling'
    | 'jumping'
    | 'flying'
    | 'levitating';

/**
 * track state for use in systems that depend on movement
 */
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
        console.log(`%cMovementStateType: ${this._state} ==> ${value}`, 'color: pink');
        this._state = value;
    }
}
