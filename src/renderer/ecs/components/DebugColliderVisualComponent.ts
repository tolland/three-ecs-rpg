// src/renderer/ecs/components/DebugColliderVisualComponent.ts
import { Component } from '@ecs/Component';
import * as THREE from 'three';

export class DebugColliderVisualComponent extends Component {
    public visual: THREE.Object3D | null = null; // The helper mesh created by the system
    public color: THREE.ColorRepresentation = 0x00ff00; // Default: Green
    constructor(color?: THREE.ColorRepresentation) {
        super();
        if (color) this.color = color;
    }
}
