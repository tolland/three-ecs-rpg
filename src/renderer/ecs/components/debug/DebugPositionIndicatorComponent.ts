// src/renderer/ecs/components/debug/DebugPositionIndicatorComponent.ts
import { Component } from '@ecs/Component';
import * as THREE from 'three';

export class DebugPositionIndicatorComponent extends Component {
    // The helper mesh created by the system
    public visual: THREE.Mesh | null = null;
    public color: THREE.ColorRepresentation = 0xff0000;
    public size: number = 0.1;
    constructor(color?: THREE.ColorRepresentation, size?: number) {
        super();
        if (color) this.color = color;
        if (size) this.size = size;
    }
}
