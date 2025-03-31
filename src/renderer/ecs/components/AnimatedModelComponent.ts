// src/renderer/ecs/components/AnimatedModelComponent.ts
import { Component } from '@ecs/Component';
import * as THREE from 'three';

export class AnimatedModelComponent extends Component {
    public mixer: THREE.AnimationMixer;
    public actions: Map<string, THREE.AnimationAction> = new Map(); // Map action names (e.g., "Idle", "Walk") to actions
    public currentAction: THREE.AnimationAction | null = null;
    public fadeDuration: number = 0.2; // Default fade time between animations

    constructor(modelRoot: THREE.Object3D, animations: THREE.AnimationClip[]) {
        super();
        this.mixer = new THREE.AnimationMixer(modelRoot);

        // Process animations provided by GLTF loader
        animations.forEach((clip) => {
            if (clip.name) {
                // Only add clips with names
                const action = this.mixer.clipAction(clip);
                this.actions.set(clip.name, action);
                // console.log(`Animation action created: ${clip.name}`);
            } else {
                console.warn(
                    'Animation clip missing name, cannot add as action.',
                );
            }
        });

        // Automatically try to set and play 'Idle' or the first animation found
        this.currentAction =
            this.actions.get('Idle') ??
            this.actions.get('idle') ??
            this.actions.values().next().value ??
            null;
        if (this.currentAction) {
            // console.log(`Setting initial animation action: ${this.findActionName(this.currentAction)}`);
            this.currentAction.play();
        } else {
            console.warn('No initial animation action found or set for model.');
        }
    }

    // Helper to find the name of an action (for debugging)
    findActionName(actionToFind: THREE.AnimationAction): string | null {
        for (const [name, action] of this.actions) {
            if (action === actionToFind) {
                return name;
            }
        }
        return null;
    }
}
