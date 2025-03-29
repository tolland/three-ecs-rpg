// src/renderer/ecs/components/PositionComponent.ts
import { Component } from '@ecs/Component';
import * as THREE from 'three';
export class PositionComponent extends Component {
    constructor(public value = new THREE.Vector3()) { super(); }
}












