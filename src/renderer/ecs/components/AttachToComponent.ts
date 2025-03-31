// src/renderer/ecs/components/AttachToComponent.ts
import { Component } from '@ecs/Component';
import { Entity } from '@ecs/Entity';
import * as THREE from 'three';

export class AttachToComponent extends Component {
    public parentEntity: Entity; // The ID of the entity to attach to
    public boneName?: string; // Optional: Name of a bone to attach to (for skinned meshes)
    public offsetPosition: THREE.Vector3; // Local position relative to parent/bone
    public offsetRotation: THREE.Quaternion; // Local rotation relative to parent/bone
    public isAttached: boolean = false; // System sets this true once attached

    constructor(
        parentEntity: Entity,
        offsetPosition = new THREE.Vector3(),
        offsetRotation = new THREE.Quaternion(),
        boneName?: string,
    ) {
        super();
        this.parentEntity = parentEntity;
        this.offsetPosition = offsetPosition;
        this.offsetRotation = offsetRotation;
        this.boneName = boneName;
    }
}
