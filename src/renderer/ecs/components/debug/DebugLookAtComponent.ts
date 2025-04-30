// src/renderer/ecs/components/debug/DebugLookAtComponent.ts
import { Component } from '@ecs/Component';
import * as THREE from 'three';

export class DebugLookAtComponent extends Component {
    public visual: THREE.ArrowHelper;
    // Default: Green
    public color: THREE.ColorRepresentation = 0x00ff00;

    constructor(
        direction: THREE.Vector3 = new THREE.Vector3(0, 0, 1),
        length: number = 1,
        color: number = 0xffff00,
        headLength: number = 0.2 * length,
        headWidth: number = 0.2 * headLength,
    ) {
        super();
        // Origin is implicitly (0,0,0) relative to parent now
        this.visual = new THREE.ArrowHelper(
            direction.normalize(),
            new THREE.Vector3(),
            length,
            color,
            headLength,
            headWidth,
        );
        this.visual.name = 'DebugArrowHelper';
    }
}
