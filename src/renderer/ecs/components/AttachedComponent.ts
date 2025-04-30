import * as THREE from 'three';
import { RenderableComponent } from '@components/render/RenderableComponent';

export class AttachedComponent extends RenderableComponent {
    // Store the Three.js object associated with the entity
    constructor(public object3D: THREE.Object3D) {
        super(object3D);
    }
}
