// src/renderer/ecs/systems/AreaTriggerSystem.ts
import { System } from '@ecs/System';
import { World } from '@ecs/World';
import {
    AreaTriggerComponent,
    NameComponent,
    PlayerControlGroundedComponent,
    PositionComponent,
} from '@ecs/components';
import { TriggerShape } from '@ecs/components/AreaTriggerComponent';
import { appEventManager, AppEventManager } from '@core/AppEventManager';
import * as THREE from 'three';

export class AreaTriggerSystem extends System {
    private tempBox = new THREE.Box3();
    private tempSphere = new THREE.Sphere();
    private tempVector = new THREE.Vector3();

    constructor(
        world: World,
        private events: AppEventManager = appEventManager,
    ) {
        super(world);
    }

    update(deltaTime: number): void {
        // Find entities that can activate triggers (e.g., the player)
        const activators = this.world.queryEntities([
            PlayerControlGroundedComponent,
            PositionComponent,
        ]);
        if (activators.length === 0) return; // No one to trigger anything

        const activatorEntityId = activators[0]; // Assume single player for now
        const activatorPos = this.world.getComponent(
            activatorEntityId,
            PositionComponent,
        )!.value;

        // Find all trigger areas
        const triggers = this.world.queryEntities([
            AreaTriggerComponent,
            PositionComponent,
        ]);

        for (const triggerEntityId of triggers) {
            const triggerComp = this.world.getComponent(
                triggerEntityId,
                AreaTriggerComponent,
            )!;
            const triggerPos = this.world.getComponent(
                triggerEntityId,
                PositionComponent,
            )!.value;
            const triggerName =
                this.world.getComponent(triggerEntityId, NameComponent)?.name ??
                `Area_${triggerEntityId}`;

            // Skip if already triggered and onlyTriggersOnce is true
            if (triggerComp.onlyTriggerOnce && triggerComp.wasTriggered)
                continue;

            let isInside = false;

            // Check collision based on shape
            if (triggerComp.shape === TriggerShape.BOX) {
                const halfSize = (triggerComp.size as THREE.Vector3)
                    .clone()
                    .multiplyScalar(0.5);
                this.tempBox.setFromCenterAndSize(
                    triggerPos,
                    triggerComp.size as THREE.Vector3,
                );
                isInside = this.tempBox.containsPoint(activatorPos);
            } else if (triggerComp.shape === TriggerShape.SPHERE) {
                this.tempSphere.set(triggerPos, triggerComp.size as number);
                isInside = this.tempSphere.containsPoint(activatorPos);
            }

            const wasInside =
                triggerComp.triggeredEntities.has(activatorEntityId);

            // --- Handle State Changes ---
            if (isInside && !wasInside) {
                // --- ENTER ---
                triggerComp.triggeredEntities.add(activatorEntityId);
                triggerComp.wasTriggered = true; // Mark as triggered even if not onlyOnce
                console.log(
                    `AreaTriggerSystem: Entity ${activatorEntityId} ENTERED area ${triggerName} (${triggerEntityId})`,
                );
                // Emit specific event or generic event
                if (triggerComp.triggerEventName) {
                    this.events.emit(triggerComp.triggerEventName as any, {
                        triggerEntityId,
                        activatorEntityId,
                        areaName: triggerName,
                    });
                }
                // Emit generic enter event
                this.events.emit('AREA_TRIGGER_ENTER' as any, {
                    triggerEntityId,
                    activatorEntityId,
                    areaName: triggerName,
                    soundKey: triggerComp.soundOnEnter,
                });
            } else if (!isInside && wasInside) {
                // --- EXIT ---
                triggerComp.triggeredEntities.delete(activatorEntityId);
                console.log(
                    `AreaTriggerSystem: Entity ${activatorEntityId} EXITED area ${triggerName} (${triggerEntityId})`,
                );
                // Emit specific event or generic event
                if (triggerComp.exitEventName) {
                    this.events.emit(triggerComp.exitEventName as any, {
                        triggerEntityId,
                        activatorEntityId,
                        areaName: triggerName,
                    });
                }
                this.events.emit('AREA_TRIGGER_EXIT' as any, {
                    triggerEntityId,
                    activatorEntityId,
                    areaName: triggerName,
                    soundKey: triggerComp.soundOnExit,
                });
            }
        }
    }
}
