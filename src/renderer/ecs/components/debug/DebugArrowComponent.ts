// src/renderer/ecs/components/debug/DebugArrowComponent.ts
import { Component } from '@ecs/Component';
import * as THREE from 'three';

export class DebugArrowComponent extends Component {
    public arrowHelper: THREE.ArrowHelper;

    // Constructor now just creates the arrow, positioning happens via AttachToComponent
    constructor(
        direction: THREE.Vector3 = new THREE.Vector3(0, 0, -1),
        length: number = 0.5,
        color: number = 0xffff00,
        headLength: number = 0.2 * length,
        headWidth: number = 0.2 * headLength,
    ) {
        super();
        // Origin is implicitly (0,0,0) relative to parent now
        this.arrowHelper = new THREE.ArrowHelper(
            direction.normalize(),
            new THREE.Vector3(),
            length,
            color,
            headLength,
            headWidth,
        );
        this.arrowHelper.name = 'DebugArrowHelper';
    }
}
