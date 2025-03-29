// src/renderer/ecs/components/VelocityComponent.ts
import { Component } from '@ecs/Component';
import * as THREE from 'three';
export class VelocityComponent extends Component {
    constructor(public value = new THREE.Vector3()) { super(); }
}

