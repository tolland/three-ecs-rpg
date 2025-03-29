// src/renderer/ecs/components/RenderableComponent.ts
import { Component } from '@ecs/Component';
import * as THREE from 'three';
export class RenderableComponent extends Component {
    // Store the Three.js object associated with the entity
    constructor(public object3D: THREE.Object3D) { super(); }
}
