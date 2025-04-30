// src/renderer/ecs/components/debug/DebugColliderVisualComponent.ts
import { Component } from '@ecs/Component';
import * as THREE from 'three';

export class DebugColliderVisualComponent extends Component {
    // The helper mesh created by the system
    public visual: THREE.Object3D | null = null;
    // Default: Green
    public color: THREE.ColorRepresentation = 0x00ff00;
    constructor(color?: THREE.ColorRepresentation) {
        super();
        if (color) this.color = color;
    }
}
