// src/renderer/ecs/systems/CollisionSystem.ts
import { System } from '@ecs/System';
import { World } from '@ecs/World';
import {
    ColliderComponent,
    PositionComponent,
    VelocityComponent,
} from '@ecs/components';
import * as THREE from 'three';
import { Raycaster } from 'three'; // Import event manager
import { Octree } from 'three/examples/jsm/math/Octree.js'; // Import Octree
import { Capsule } from 'three/examples/jsm/math/Capsule.js';
import { DEBUG_OBJ } from '@renderer/main';
import { createTemporaryVisual } from '@renderer/utils/main';
import { appEventManager, AppEventManager } from '@core/AppEventManager';

export class CollisionSystem extends System {
    private worldOctree: Octree | null = null;
    private tempCapsule = new Capsule(); // Reusable capsule for checks
    private tempVector = new THREE.Vector3();
    private downRaycaster = new Raycaster(); // Add a specific raycaster for ground checks
    private tempNormal = new THREE.Vector3();

    constructor(
        world: World,
        private events: AppEventManager = appEventManager,
    ) {
        super(world);
    }

    // Call this after the world GLB/Octree is loaded
    setWorldOctree(octree: Octree) {
        this.worldOctree = octree;
        console.log('CollisionSystem: World Octree set.');
    }

    getWorldOctree(): Octree | null {
        return this.worldOctree;
    } // Add this getter

    update(deltaTime: number): void {
        if (!this.worldOctree) return; // Don't run without the world geometry

        const entities = this.world.queryEntities([
            PositionComponent,
            VelocityComponent,
            ColliderComponent,
        ]);

        for (const entity of entities) {
            const pos = this.world.getComponent(entity, PositionComponent)!;
            const vel = this.world.getComponent(entity, VelocityComponent)!;
            const collider = this.world.getComponent(
                entity,
                ColliderComponent,
            )!;
            if (!collider || !vel || !pos) continue;

            const previousYVelocity = vel.value.y; // Store velocity before collision check
            //console.log(`${DEBUG_OBJ2.updateId}" "${entity}" onGround: ${oldOnGround} ->> ${collider.onGround}`);
            const wasOnGround = collider.onGround;

            // --- Reset state BEFORE checks ---
            collider.onGround = false;
            collider.collisions = [];
            collider.groundNormal = null; // Reset ground normal
            // --- End Reset ---

            // --- Capsule Collision Check ---
            // Adapt capsule parameters from component
            // this.tempCapsule.start.copy(pos.value).add(collider.offset);
            // The full height of the capsule is the collider height + 2 * radius
            // @TODO start appears to be at the bottom of the cylinder section?
            this.tempCapsule.start
                .copy(pos.value)
                .add(new THREE.Vector3(0, collider.radius, 0));
            this.tempCapsule.end
                .copy(this.tempCapsule.start)
                .add(new THREE.Vector3(0, collider.height, 0)); // Assumes offset is at the top
            this.tempCapsule.radius = collider.radius;

            // Adjust capsule position slightly based on velocity for better checks
            // const capsuleVelocityOffset = vel.value.clone().multiplyScalar(deltaTime);
            // this.tempCapsule.start.add(capsuleVelocityOffset);
            // this.tempCapsule.end.add(capsuleVelocityOffset);

            const capsuleResult = this.worldOctree.capsuleIntersect(
                this.tempCapsule,
            );

            let groundDetectedByCapsule = false;
            if (capsuleResult && capsuleResult.normal.y > 0.7) {
                groundDetectedByCapsule = true;
                collider.onGround = true; // Tentative
                collider.groundNormal = capsuleResult.normal.clone(); // Store normal
                // Apply collision response for capsule
                pos.value.add(
                    capsuleResult.normal
                        .clone()
                        .multiplyScalar(capsuleResult.depth),
                );
                // Adjust velocity based ONLY on capsule result for now
                if (vel.value.y < 0) vel.value.y = 0; // Stop downward velocity from capsule hit
                vel.value.addScaledVector(
                    capsuleResult.normal,
                    -vel.value.dot(capsuleResult.normal),
                ); // Sliding
            }

            // --- Optional: Downward Raycast Check (for stability) ---
            const rayOrigin = this.tempVector
                .copy(pos.value)
                .add(collider.offset)
                .add(
                    new THREE.Vector3(
                        0,
                        -collider.height + collider.radius * 0.9,
                        0,
                    ),
                ); // Origin slightly inside capsule bottom center
            const rayLength = collider.radius * 0.2 + 0.1; // Short ray downward
            this.downRaycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
            this.downRaycaster.far = rayLength;
            const rayHit = this.worldOctree.rayIntersect(this.downRaycaster.ray);

            // console.log(
            //     `Raycast hit: ${rayHit}, distance: ${rayHit?.distance}, normal: ${rayHit?.normal}`,
            // );
            //console.dir(rayHit);

            if (rayHit) { // Check if rayHit is not null
                // --- Calculate normal from the triangle ---
                // Provide tempNormal as the target for the result
                rayHit.triangle.getNormal(this.tempNormal);
                // --- End Normal Calculation ---
                if (this.tempNormal.y > 0.7) {
                    // If ray hits ground nearby, forcefully consider it grounded
                    collider.onGround = true;
                    if (!groundDetectedByCapsule) {
                        // Only store normal if capsule didn't provide one
                        collider.groundNormal = this.tempNormal.clone();
                        // Optional: Apply slight position correction if ray hit but capsule didn't?
                        // pos.value.y += (rayLength - rayHit.distance);
                        if (vel.value.y < 0) vel.value.y = 0; // Ensure downward velocity stops
                    }
                }
            }
            // --- End Raycast Check ---

            // --- Emit Events Based on Final Ground State ---
            if (collider.onGround && !wasOnGround && previousYVelocity < -2.0) {
                // Just Landed
                this.events.emit('ENTITY_COLLISION_IMPACT' as any, {
                    entityId: entity,
                    impactVelocity: Math.abs(previousYVelocity),
                    surfaceType: 'ground',
                });
            } else if (!collider.onGround && wasOnGround) {
                // Just Left Ground (e.g., walked off ledge) - maybe trigger fall sound?
            } else if (capsuleResult && !collider.onGround) {
                // Hit something that wasn't ground
                // Wall Impact
                if (Math.abs(vel.value.dot(capsuleResult.normal)) > 1.0) {
                    this.events.emit('ENTITY_COLLISION_IMPACT' as any, {
                        entityId: entity,
                        impactVelocity: Math.abs(
                            vel.value.dot(capsuleResult.normal),
                        ),
                        surfaceType: 'wall',
                    });
                }
            }

            // TODO: Implement Player-NPC / NPC-NPC collisions
            // This would involve iterating through pairs of entities with Colliders
            // and performing shape intersection tests (e.g., capsule-capsule).
        }
    }
}
