import { Component } from '@ecs/Component';
import * as THREE from 'three';

export class RotationComponent extends Component {
    constructor(public value = new THREE.Quaternion()) {
        super();
    }
}
