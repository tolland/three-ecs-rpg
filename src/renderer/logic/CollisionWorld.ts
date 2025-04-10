import * as THREE from 'three';
import { Capsule } from '@renderer/threejs/jsm/math/Capsule';
import { IntersectionCallback } from '@renderer/logic/CollisionWorldBVH';

/**
 * This represents a simplified version of the THREE.intersect with the one used by the octree.js implementation in the examples. probably need to
 * rethink this
 */
export type RayIntersection = {
    distance: number;
    normal: THREE.Vector3;
    position: THREE.Vector3;
};

export type RayIntersectionResult = RayIntersection | false;

export type CapsuleIntersection = {
    normal: THREE.Vector3;
    depth: number;
};

export type CapsuleIntersectionResult = CapsuleIntersection | false;

export abstract class CollisionWorld {
    abstract rayIntersectFirst(ray: THREE.Ray): RayIntersectionResult;

    abstract rayIntersect(ray: THREE.Ray): RayIntersection[];

    abstract capsuleIntersect(
        capsule: Capsule,
        triCallback?: IntersectionCallback,
    ): CapsuleIntersectionResult | CapsuleIntersection[];

    static getIntersectionNormal(
        intersection: THREE.Intersection,
    ): THREE.Vector3 {
        const { face, object, point } = intersection;

        if (intersection.normal) {
            return intersection.normal.clone();
        }

        if (face && face.normal) {
            // If the face normal is provided, use it
            const worldNormal = new THREE.Vector3();
            object.localToWorld(worldNormal.copy(face.normal));
            return worldNormal;
        }

        // @TODO possibly more work to find an intersection normal?
        // if (object.isMesh && object.geometry) {
        //     // Now it's safe to access geometry
        // }

        // If everything fails, return a default normal
        return new THREE.Vector3(0, 1, 0);
    }
}
