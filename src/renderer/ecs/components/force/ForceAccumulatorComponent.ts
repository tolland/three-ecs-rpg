// src/renderer/ecs/components/force/ForceAccumulatorComponent.ts
import { Component } from '@ecs/Component';
import * as THREE from 'three';

/**
 * Sum of the forces attached to an entity for physics calculations
 */
export class ForceAccumulatorComponent extends Component {
    // Sum of forces for this frame
    public force: THREE.Vector3 = new THREE.Vector3();
}
