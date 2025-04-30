// src/renderer/ecs/systems/CollisionSystem.ts
import { System } from '@ecs/System';
import { World } from '@ecs/World';
import {
    ColliderComponent,
    MovementStateComponent,
    PositionComponent,
    VelocityComponent,
} from '@ecs/components';
import * as THREE from 'three';
import { appEventManager, AppEventManager } from '@core/AppEventManager';
import { CollisionWorld } from '@renderer/logic/CollisionWorld';
import { Capsule } from '@renderer/threejs/jsm/math/Capsule';
import { scene } from '@core/sceneManager';
import { createTemporaryVisual } from '@renderer/utils/main';
import { Serializer } from '@shared/serialization/Serializer';

export class CollisionSystem extends System {
    @Serializer.Serialize()
    private collisionWorld: CollisionWorld | null = null;
    // Reusable capsule for checks
    @Serializer.Serialize()
    private tempCapsule = new Capsule();
    // hold reference to loaded world chunks
    private chunks: Map<string, CollisionWorld> = new Map(); // Key: chunk key "x_z"

    constructor(
        world: World,
        private events: AppEventManager = appEventManager,
    ) {
        super(world);
    }

    // Methods called by WorldStreamingSystem @TODO
    addChunk(key: string, octree: CollisionWorld) {
        console.log(`CollisionSystem: Adding CollisionWorld for chunk ${key}`);
        this.chunks.set(key, octree);
    }

    removeChunk(key: string) {
        console.log(
            `CollisionSystem: Removing CollisionWorld for chunk ${key}`,
        );
        this.chunks.delete(key);
    }

    // Method to receive the collision world
    setCollisionWorld(collisionWorld: CollisionWorld) {
        this.collisionWorld = collisionWorld;
        //console.log('CollisionSystem: Collision World set.');
    }

    /**
     * Handles state transitions based on the player's movement state and collider status.
     *
     * @param {MovementStateComponent} stateComp - The movement state component.
     * @param {ColliderComponent | undefined} collider - The collider component.
     */
    private handleStateTransition(
        stateComp: MovementStateComponent,
        collider: ColliderComponent | undefined,
    ) {
        const isOnGround = collider?.onGround ?? false; // Read current ground status

        if (isOnGround && stateComp.state !== 'grounded') {
            stateComp.state = 'grounded';
            console.log('%cState -> grounded', 'color: green');
        } else if (!isOnGround && stateComp.state === 'grounded') {
            stateComp.state = 'falling';
            console.log('%cState -> falling', 'color: blue');
        }
    }

    update(deltaTime: number): void {
        if (!this.collisionWorld) return;

        const entities = this.world.queryEntities([
            PositionComponent,
            VelocityComponent,
            ColliderComponent,
        ]);

        for (const entity of entities) {
            const position = this.world.getComponent(
                entity,
                PositionComponent,
            )!;
            const velocity = this.world.getComponent(
                entity,
                VelocityComponent,
            )!;
            const collider: ColliderComponent = this.world.getComponent(
                entity,
                ColliderComponent,
            )!;
            const stateComp: MovementStateComponent | undefined =
                this.world.getComponent(entity, MovementStateComponent);

            const previousYVelocity = velocity.value.y;
            const wasOnGround = collider.onGround;

            let isCollided: boolean = false;
            collider.collisions = [];
            collider.groundNormal = null;

            // --- Reset state BEFORE checks ---
            if (collider.onGround && collider.collisionTimeCheck()) {
                if (entity == 0) console.log(`setting false due to time check`);
                collider.onGround = false;
            }
            collider.timeCollisionDelta += deltaTime;

            // --- End Reset ---

            // @TODO implement chunked collision checks
            // this is world specific though. so should be put in the world class
            // // --- Iterate through ALL loaded chunk Octrees for capsule collision ---
            // for (const octree of this.chunkOctrees.values()) {
            //     const result = octree.capsuleIntersect(this.tempCapsule);
            //     if (result) {
            //         if (!closestCapsuleHit || result.distance < closestCapsuleHit.distance) {
            //             closestCapsuleHit = result; // Keep track of the NEAREST hit
            //         }
            //     }
            // }

            // make the capsule match the collider
            updateCapsule(
                this.tempCapsule,
                position.value,
                collider.radius,
                collider.height,
            );

            let hitCount = 0;
            const directionAccumulator = new THREE.Vector3();

            const capsuleResult2 = this.collisionWorld.capsuleIntersect(
                this.tempCapsule,
                (capsule, direction, depth, isGroundCollision, triPoint) => {
                    isCollided = true;
                    hitCount += 1;
                    directionAccumulator.add(direction);
                    scene.add(
                        createTemporaryVisual(triPoint, scene, 15, 'yellow'),
                    );
                    if (isGroundCollision) {
                        collider.onGround = true;
                        collider.groundNormal = direction.clone();
                        if (velocity.value.y < 0) velocity.value.y = 0;
                        // velocity.addScaledVector(
                        //     collider.groundNormal,
                        //     -velocity.dot(collider.groundNormal),
                        // );
                    } else {
                    }
                    // position.value.add(
                    //     collider.groundNormal.clone().multiplyScalar(capsuleResult.depth),
                    // );
                    position.value.addScaledVector(direction, depth);
                    collider.timeCollisionDelta = 0;
                },
            );

            // Calculate the average direction
            if (hitCount > 0) {
                directionAccumulator.divideScalar(hitCount).normalize();
            }

            if (stateComp) {
                this.handleStateTransition(stateComp, collider);
            }

            // --- Emit Events Based on Final Ground State ---
            // hard landing
            if (collider.onGround && !wasOnGround && previousYVelocity < -2.0) {
                console.log(`entity: ${entity} just landed`);
                // Just Landed
                this.events.emit('ENTITY_COLLISION_IMPACT' as any, {
                    entityId: entity,
                    impactVelocity: Math.abs(previousYVelocity),
                    surfaceType: 'ground',
                });
            } else if (collider.onGround && !wasOnGround) {
                console.log(`entity: ${entity} just landed lightly`);
            } else if (!collider.onGround && wasOnGround) {
                console.log(`entity: ${entity} just left ground`);
                // Just Left Ground (e.g., walked off ledge) - maybe trigger fall sound?
            } else if (!collider.onGround && isCollided) {
                // Hit something that wasn't ground
                // Wall Impact
                console.log(
                    `hit not on ground entity: ${entity} hit estimate ${Math.abs(
                        velocity.value.dot(directionAccumulator),
                    )}`,
                );
                if (Math.abs(velocity.value.dot(directionAccumulator)) > 1.0) {
                    this.events.emit('ENTITY_COLLISION_IMPACT' as any, {
                        entityId: entity,
                        impactVelocity: Math.abs(
                            velocity.value.dot(directionAccumulator),
                        ),
                        surfaceType: 'wall',
                    });
                }
            } else if (collider.onGround && wasOnGround) {
                //console.log(`entity: ${entity} still on ground and was on ground`);
            } else if (!collider.onGround && !wasOnGround) {
                // console.log(
                //     `entity: ${entity} no collision detected collider.onGround ${collider.onGround} wasOnGround ${wasOnGround} isCollided ${isCollided} previousYVelocity ${previousYVelocity}`,
                // );
            } else {
                console.log(
                    `ELSE entity: ${entity} collider.onGround ${collider.onGround} wasOnGround ${wasOnGround} isCollided ${isCollided} previousYVelocity ${previousYVelocity}`,
                );
            }
            // if (entity == 0 && Math.random() < 0.05)
            //     console.log(
            //         `vel at end of collision update entity: ${entity} velocity ${vel.value.y.toFixed(3)}`,
            //     );
            // TODO: Implement Player-NPC / NPC-NPC collisions
            // This would involve iterating through pairs of entities with Colliders
            // and performing shape intersection tests (e.g., capsule-capsule).
        }
    }
}

/**
 *
 * update a capsule to match the collider provided
 *
 * @param tempCapsule
 * @param pos
 * @param radius
 * @param height
 */
export function updateCapsule(
    tempCapsule: Capsule,
    pos: THREE.Vector3,
    radius: number,
    height: number,
) {
    // this.tempCapsule.start.copy(pos.value).add(collider.offset);
    // The full height of the capsule is the collider height + 2 * radius
    // @TODO start appears to be at the bottom of the cylinder section?
    tempCapsule.start.copy(pos).add(new THREE.Vector3(0, radius, 0));
    tempCapsule.end
        .copy(tempCapsule.start)
        .add(new THREE.Vector3(0, height, 0)); // Assumes offset is at the top
    tempCapsule.radius = radius;
    // Adjust capsule position slightly based on velocity for better checks
    // const capsuleVelocityOffset = vel.value.clone().multiplyScalar(deltaTime);
    // this.tempCapsule.start.add(capsuleVelocityOffset);
    // this.tempCapsule.end.add(capsuleVelocityOffset);
    // CollisionLogicCapsule.debugCapsule(tempCapsule);
}
