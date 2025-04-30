// src/renderer/ecs/systems/AttachmentSystem.ts
import { System } from '@ecs/System';
import { World } from '@ecs/World';
import {
    AttachmentTargetComponent,
    AttachToComponent,
    RenderableComponent,
} from '@ecs/components';
import * as THREE from 'three';

export class AttachmentSystem extends System {
    // Optional: Cache found parent objects if lookups are expensive
    // private parentObjectCache: Map<Entity, THREE.Object3D> = new Map();

    constructor(world: World) {
        super(world);
    }

    // Run this system perhaps less frequently, or only when attachments change?
    // For simplicity, we run it every frame but only attach once.
    update(deltaTime: number): void {
        const entitiesToAttach = this.world.queryEntities([
            AttachToComponent,
            RenderableComponent,
        ]);

        for (const entity of entitiesToAttach) {
            const attachComp = this.world.getComponent(
                entity,
                AttachToComponent,
            )!;
            const renderableComp: RenderableComponent = this.world.getComponent(
                entity,
                RenderableComponent,
            )!;

            // The object we want to attach
            const childObject = renderableComp.object3D;

            // Only process if not already attached
            if (attachComp.isAttached) continue;

            // --- Find the Parent Object ---
            const parentEntity = attachComp.parentEntity;
            const parentRenderable = this.world.getComponent(
                parentEntity,
                RenderableComponent,
            );
            const parentIsTarget = this.world.hasComponent(
                parentEntity,
                AttachmentTargetComponent,
            );

            if (!parentIsTarget || !parentRenderable) {
                // Parent doesn't exist, isn't marked as target, or isn't renderable yet. Skip for now.
                // console.warn(`AttachmentSystem: Parent entity ${parentEntity} not found or not a valid target.`);
                continue;
            }

            const parentObject = parentRenderable.object3D;

            // --- Perform Attachment ---
            let targetParentNode: THREE.Object3D = parentObject;

            // Handle bone attachment
            if (attachComp.boneName) {
                // Important: SkeletonUtils.findBoneByName is recursive if needed.
                // If your model structure is complex, traverse might be better.
                const bone = parentObject.getObjectByName(attachComp.boneName); // Simpler non-recursive find
                // const bone = SkeletonUtils.findBoneByName(attachComp.boneName, parentObject); // Recursive

                if (bone instanceof THREE.Bone) {
                    targetParentNode = bone;
                    console.log(
                        `AttachmentSystem: Attaching entity ${entity} to bone '${attachComp.boneName}' on entity ${parentEntity}`,
                    );
                } else {
                    console.warn(
                        `AttachmentSystem: Bone '${attachComp.boneName}' not found on entity ${parentEntity}. Attaching to root.`,
                    );
                    // Fallback to attaching to the parent object root
                }
            } else {
                console.log(
                    `AttachmentSystem: Attaching entity ${entity} to root of entity ${parentEntity}`,
                );
            }

            // Detach from previous parent ONLY if necessary (e.g., moving attachments)
            // For initial attach, this isn't strictly needed if added directly to world first.
            childObject.removeFromParent();

            // Add child to the target node (parent root or bone)
            targetParentNode.add(childObject);

            // Apply local offset AFTER attaching
            childObject.position.copy(attachComp.offsetPosition);
            childObject.quaternion.copy(attachComp.offsetRotation);
            childObject.scale.set(1, 1, 1); // Ensure scale isn't weirdly inherited (unless intended)

            // Mark as attached so we don't do this again
            attachComp.isAttached = true;

            // Optional: Remove Position/Rotation components from the child entity
            // if its world transform is now fully determined by the parent.
            // Be careful if other systems rely on these components.
            // this.world.removeComponent(entity, PositionComponent);
            // this.world.removeComponent(entity, RotationComponent);
        }
    }

    // TODO: Add logic for detaching if AttachToComponent is removed or parent is destroyed.
    // This might involve another query or listening to entity destruction events.
}
