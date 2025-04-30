// src/renderer/ecs/components/position/EyesComponent.ts
import { Component } from '@ecs/Component';
import * as THREE from 'three';

/**
 * location of eyes for the purposes of LookAt and First person camera
 * relative to the position component
 */
export class EyesComponent extends Component {
    constructor(public value = new THREE.Vector3()) {
        super();
    }
}
