
import { System } from '@ecs/System';
import { World } from '@ecs/World';
import { PositionComponent, VelocityComponent, ColliderComponent } from '@ecs/components';
import * as THREE from 'three';
import { Octree } from 'three/examples/jsm/math/Octree.js'; // Import Octree
import { Capsule } from 'three/examples/jsm/math/Capsule.js'; // Import Capsule if using

export class CollisionSystem extends System {
    private worldOctree: Octree | null = null;
    private tempCapsule = new Capsule(); // Reusable capsule for checks
    private tempVector = new THREE.Vector3();

    constructor(world: World) { super(world); }

    // Call this after the world GLB/Octree is loaded
    setWorldOctree(octree: Octree) {
        this.worldOctree = octree;
        console.log("CollisionSystem: World Octree set.");
    }

    getWorldOctree(): Octree | null { return this.worldOctree; } // Add this getter

    update(deltaTime: number): void {
        if (!this.worldOctree) return; // Don't run without the world geometry

        const entities = this.world.queryEntities([PositionComponent, VelocityComponent, ColliderComponent]);

        for (const entity of entities) {
            const pos = this.world.getComponent(entity, PositionComponent)!;
            const vel = this.world.getComponent(entity, VelocityComponent)!;
            const collider = this.world.getComponent(entity, ColliderComponent)!;

            collider.collisions = []; // Clear previous results

            // Adapt capsule parameters from component
            this.tempCapsule.start.copy(pos.value).add(collider.offset);
            this.tempCapsule.end.copy(this.tempCapsule.start).add(new THREE.Vector3(0, -collider.height, 0)); // Assumes offset is at the top
            this.tempCapsule.radius = collider.radius;

            // Adjust capsule position slightly based on velocity for better checks
            // const capsuleVelocityOffset = vel.value.clone().multiplyScalar(deltaTime);
            // this.tempCapsule.start.add(capsuleVelocityOffset);
            // this.tempCapsule.end.add(capsuleVelocityOffset);

            // Perform Octree collision check (adapt from Three.js examples)
            const result = this.worldOctree.capsuleIntersect(this.tempCapsule);
            collider.onGround = false; // Assume not on ground unless collision proves otherwise

            if (result) {
                collider.onGround = result.normal.y > 0.7; // Adjust threshold as needed

                // Store collision info
                collider.collisions.push({ entity: null, normal: result.normal.clone() }); // null entity for world collision

                // Simple collision response: push capsule out along the normal
                pos.value.add(result.normal.clone().multiplyScalar(result.depth));

                // Adjust velocity based on collision normal (sliding effect)
                if (!collider.onGround) {
                    vel.value.addScaledVector(result.normal, -vel.value.dot(result.normal));
                } else {
                    // Stop downward velocity if on ground
                    if (vel.value.y < 0) vel.value.y = 0;
                }

                // Mark for render update since position changed due to collision
                //this.world.addComponent(entity, new NeedsUpdateComponent());
            }

            // TODO: Implement Player-NPC / NPC-NPC collisions
            // This would involve iterating through pairs of entities with Colliders
            // and performing shape intersection tests (e.g., capsule-capsule).
        }
    }
}