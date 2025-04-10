// src/renderer/ecs/components/ForceAccumulatorComponent.ts
import { Component } from '@ecs/Component';
import * as THREE from 'three';

export class ForceAccumulatorComponent extends Component {
    public force: THREE.Vector3 = new THREE.Vector3(); // Sum of forces for this frame
}
