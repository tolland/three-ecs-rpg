import { Octree } from 'three/examples/jsm/math/Octree';
import { Capsule } from '@renderer/threejs/jsm/math/Capsule';
import { Ray } from 'three';
import {
    CapsuleIntersectionResult,
    CollisionWorld,
    RayIntersection,
    RayIntersectionResult,
} from '@renderer/logic/CollisionWorld';

export class OctreeCollisionWorld implements CollisionWorld {
    constructor(private worldOctree: Octree) {}

    capsuleIntersect(capsule: Capsule): CapsuleIntersectionResult {
        return this.worldOctree.capsuleIntersect(capsule);
    }

    rayIntersect(ray: Ray): RayIntersection[] {
        return this.worldOctree.rayIntersect(ray);
    }

    rayIntersectFirst(ray: Ray): RayIntersectionResult | false {
        return this.worldOctree.rayIntersect(ray);
    }
}
