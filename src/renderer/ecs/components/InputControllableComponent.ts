// src/renderer/ecs/components/InputControllableComponent.ts
import { Component } from '@ecs/Component';

/**
 * Component to store input state for entities that can be controlled
 *
 * Stores the current state of actions
 */
export class InputControllableComponent extends Component {

    public actions = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        jump: false,
        run: false,
        crouch: false,
        orbitLeft: false,
        orbitRight: false,
        rotateLeft: false,
        rotateRight: false,
    };
    public mouseDelta = { x: 0, y: 0 }; // Store mouse movement for camera
    public pointerLocked: boolean = false;
}
