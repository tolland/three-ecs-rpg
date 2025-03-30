// src/renderer/ecs/components/InputControllableComponent.ts
import { Component } from '@ecs/Component';

export class InputControllableComponent extends Component {
    // Stores the current state of actions
    public actions = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        jump: false,
        run: false, // (Ctrl)
    };
    public mouseDelta = { x: 0, y: 0 }; // Store mouse movement for camera
    public pointerLocked: boolean = false;
}
