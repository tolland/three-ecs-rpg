// src/renderer/ecs/components/controls/InputControllableComponent.ts
import { Component } from '@ecs/Component';
import { MouseDelta } from '@systems/controls/InputHandlers';
import * as THREE from 'three';

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
    public mouseDelta: MouseDelta = new THREE.Vector2()
    public pointerLocked: boolean = false;
}
