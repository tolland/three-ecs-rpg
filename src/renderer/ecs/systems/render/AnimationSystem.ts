// src/renderer/ecs/systems/AnimationSystem.ts
import { System } from '@ecs/System';
import { World } from '@ecs/World';
import {
    AnimatedModelComponent,
    ColliderComponent,
    InputControllableComponent,
    MovementStateComponent,
    VelocityComponent,
} from '@ecs/components';
import * as THREE from 'three';

export class AnimationSystem extends System {
    constructor(world: World) {
        super(world);
    }

    update(deltaTime: number): void {
        const entities = this.world.queryEntities([
            AnimatedModelComponent,
            VelocityComponent,
        ]);

        for (const entity of entities) {
            const animComp = this.world.getComponent(
                entity,
                AnimatedModelComponent,
            )!;
            const velComp = this.world.getComponent(entity, VelocityComponent)!;
            const colliderComp = this.world.getComponent(
                entity,
                ColliderComponent,
            );
            const stateComp: MovementStateComponent = this.world.getComponent(
                entity,
                MovementStateComponent,
            )!;
            // Get input state IF the entity has it (NPCs might not)
            const inputComp = this.world.getComponent(
                entity,
                InputControllableComponent,
            );
            if (!colliderComp || !stateComp) {
                console.error(
                    `missing collider ${colliderComp} or stateComp ${stateComp} or inputComp ${inputComp} for entity `,
                );
                continue;
            }

            // --- Determine Target Animation State ---
            let targetActionName: string | null = null;

            const horizontalSpeedSq =
                velComp.value.x * velComp.value.x +
                velComp.value.z * velComp.value.z;
            const verticalSpeed = velComp.value.y;

            // Check for active movement input first
            const isMovingByInput =
                inputComp &&
                (inputComp.actions.forward ||
                    inputComp.actions.backward ||
                    inputComp.actions.left ||
                    inputComp.actions.right);

            switch (stateComp.state) {
                case 'grounded':
                    if (isMovingByInput) {
                        // Use input check from before
                        if (inputComp?.actions.run && horizontalSpeedSq > 0.1)
                            targetActionName = this.findBestMatch(
                                animComp.actions,
                                ['Run', 'Walk'],
                            );
                        else
                            targetActionName = this.findBestMatch(
                                animComp.actions,
                                ['Walk', 'Run'],
                            );
                    } else {
                        targetActionName = this.findBestMatch(
                            animComp.actions,
                            ['Idle'],
                        );
                    }
                    break;
                case 'jumping':
                    targetActionName = this.findBestMatch(animComp.actions, [
                        'Jump',
                        'Fall',
                        'Run',
                    ]); // Or specific jump anim
                    break;
                case 'falling':
                    targetActionName = this.findBestMatch(animComp.actions, [
                        'Fall',
                        'Jump',
                        'Run',
                    ]); // Or specific fall anim
                    break;
                case 'flying':
                    if (horizontalSpeedSq > 0.1)
                        targetActionName = this.findBestMatch(
                            animComp.actions,
                            ['FlyForward', 'Run'],
                        );
                    // Need Fly anims
                    else
                        targetActionName = this.findBestMatch(
                            animComp.actions,
                            ['FlyIdle', 'Idle'],
                        ); // Need Fly anims
                    break;
            }

            // --- Transition to Target Action ---
            if (targetActionName) {
                const targetAction = animComp.actions.get(targetActionName);
                const currentActionName = animComp.currentAction
                    ? animComp.findActionName(animComp.currentAction)
                    : null;

                // Only transition if the target is different from the current
                if (targetAction && targetActionName !== currentActionName) {
                    //console.log(`${DEBUG_OBJ2.updateId}" "${entity}" onGround: ${colliderComp?.onGround}  Switching animation from ${currentActionName ?? 'None'} to: ${targetActionName}`); // Debug
                    this.fadeToAction(
                        animComp,
                        targetAction,
                        animComp.fadeDuration,
                    );
                } else if (!animComp.currentAction && targetAction) {
                    // If nothing is playing, play the target immediately
                    this.fadeToAction(animComp, targetAction, 0);
                }
            }
            // --- Update Mixer ---
            animComp.mixer.update(deltaTime);
        }
    }

    // Helper to find the first available action from a list of preferred names
    private findBestMatch(
        actions: Map<string, THREE.AnimationAction>,
        preferredNames: string[],
    ): string | null {
        for (const name of preferredNames) {
            // if (actions.has(name)) console.log(`Found action: ${name} from ${preferredNames}`); // Debug
            if (actions.has(name)) return name;
            // Try lowercase variant as well?
            const lowerCaseName = name.toLowerCase();
            // if (actions.has(lowerCaseName)) console.log(`Found lowercase action: ${name} from ${preferredNames}`); // Debug
            if (actions.has(lowerCaseName)) return lowerCaseName;
        }
        // Fallback if none of the preferred names are found (e.g., just return 'Idle' if available)
        if (preferredNames.indexOf('Idle') === -1 && actions.has('Idle'))
            return 'Idle';
        if (preferredNames.indexOf('idle') === -1 && actions.has('idle'))
            return 'idle';

        return null; // No suitable action found
    }

    // Helper function for smooth animation transitions
    private fadeToAction(
        animComp: AnimatedModelComponent,
        newAction: THREE.AnimationAction,
        duration: number,
    ): void {
        const previousAction = animComp.currentAction;
        animComp.currentAction = newAction;

        if (previousAction && previousAction !== newAction) {
            previousAction.fadeOut(duration);
        }

        newAction
            .reset()
            .setEffectiveTimeScale(1)
            .setEffectiveWeight(1)
            .fadeIn(duration)
            .play();
    }
}
