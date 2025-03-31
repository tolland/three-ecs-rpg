// src/renderer/ecs/components/AreaTriggerComponent.ts
import { Component } from '@ecs/Component';
import * as THREE from 'three';

export enum TriggerShape {
    BOX,
    SPHERE,
}

export class AreaTriggerComponent extends Component {
    public shape: TriggerShape = TriggerShape.BOX;
    public size: THREE.Vector3 | number = new THREE.Vector3(1, 1, 1); // Vector3 for Box, number (radius) for Sphere
    public triggerEventName: string | null = null; // Event name to fire on enter (e.g., "ENTER_CAVE")
    public exitEventName: string | null = null; // Event name to fire on exit
    public soundOnEnter: string | null = null; // Optional: Directly play a sound asset key on enter
    public soundOnExit: string | null = null; // Optional: Directly play a sound asset key on exit
    public onlyTriggerOnce: boolean = false;

    // Internal state managed by AreaTriggerSystem
    public triggeredEntities: Set<number> = new Set(); // Entities currently inside
    public wasTriggered: boolean = false; // For onlyTriggerOnce

    constructor(options: {
        shape?: TriggerShape;
        size?: THREE.Vector3 | number;
        triggerEventName?: string;
        exitEventName?: string;
        soundOnEnter?: string;
        soundOnExit?: string;
        onlyTriggerOnce?: boolean;
    }) {
        super();
        Object.assign(this, options); // Assign provided options
        if (this.shape === TriggerShape.SPHERE && typeof this.size !== 'number')
            this.size = 1; // Default radius
        if (this.shape === TriggerShape.BOX && typeof this.size === 'number')
            this.size = new THREE.Vector3(this.size, this.size, this.size); // Default box size
    }
}
