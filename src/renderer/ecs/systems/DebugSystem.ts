// src/renderer/ecs/systems/DebugSystem.ts
import { System } from '@ecs/System';
import { World } from '@ecs/World';
import * as THREE from 'three';

export class MarkerSystem extends System {
    private scene: THREE.Scene;
    private isEnabled: boolean = false; // Default to off

    constructor(world: World, scene: THREE.Scene) {
        super(world);
        this.scene = scene;
    }

    update(deltaTime: number): void {
    }

}
