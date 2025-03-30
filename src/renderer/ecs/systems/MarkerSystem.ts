import { System } from '@ecs/System';
import { World } from '@ecs/World';
import * as THREE from 'three';

export class MarkerSystem extends System {
    private scene: THREE.Scene;
    private isEnabled: boolean = false; // Default to off
    private debugVisualsGroup: THREE.Group; // Group to hold all debug visuals

    constructor(world: World, scene: THREE.Scene) {
        super(world);
        this.scene = scene;
        this.debugVisualsGroup = new THREE.Group();
        this.debugVisualsGroup.name = 'DebugVisualsGroup';
        this.scene.add(this.debugVisualsGroup);
        this.debugVisualsGroup.visible = this.isEnabled; // Set initial visibility
    }

    update(deltaTime: number): void {
    }

}
