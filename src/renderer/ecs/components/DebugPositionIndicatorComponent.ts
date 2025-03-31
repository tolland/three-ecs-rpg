// src/renderer/ecs/components/DebugPositionIndicatorComponent.ts
import { Component } from '@ecs/Component';
import * as THREE from 'three';

export class DebugPositionIndicatorComponent extends Component {
    public visual: THREE.Mesh | null = null; // The helper mesh created by the system
    public color: THREE.ColorRepresentation = 0xff0000; // Default: Red
    public size: number = 0.1; // Size of the indicator
    constructor(color?: THREE.ColorRepresentation, size?: number) {
        super();
        if (color) this.color = color;
        if (size) this.size = size;
    }
}
