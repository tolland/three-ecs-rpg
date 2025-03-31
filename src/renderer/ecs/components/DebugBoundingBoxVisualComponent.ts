// src/renderer/ecs/components/DebugBoundingBoxVisualComponent.ts
import { Component } from '@ecs/Component';
import * as THREE from 'three';

export class DebugBoundingBoxVisualComponent extends Component {
    public visual: THREE.Box3Helper | null = null; // The helper mesh created by the system
    public color: THREE.ColorRepresentation = 0x0000ff; // Default: Blue
    constructor(color?: THREE.ColorRepresentation) {
        super();
        if (color) this.color = color;
    }
}
