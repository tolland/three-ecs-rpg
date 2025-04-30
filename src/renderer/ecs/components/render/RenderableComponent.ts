// src/renderer/ecs/components/render/RenderableComponent.ts
import { Component } from '@ecs/Component';
import * as THREE from 'three';

/**
 * Container for THREE.Object3D
 */
export class RenderableComponent extends Component {
    // Store the Three.js object associated with the entity
    constructor(public object3D: THREE.Object3D) {
        super();
    }
}
