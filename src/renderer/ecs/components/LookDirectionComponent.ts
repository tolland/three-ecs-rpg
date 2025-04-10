import { Component } from '@ecs/Component';
import * as THREE from 'three';

/**
 * LookDirectionComponent
 * 
 * Stores the entity's look direction as a quaternion, independent of the camera system.
 * This allows for decoupling player controls from camera behavior.
 */
export class LookDirectionComponent extends Component {
    constructor(public value = new THREE.Quaternion()) {
        super();
    }
} 