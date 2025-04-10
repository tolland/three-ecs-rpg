// src/renderer/utils/geometry.ts
import { Capsule } from 'three/examples/jsm/math/Capsule.js';
import { MeshBVH } from 'three-mesh-bvh'; // Import Octree
import * as THREE from 'three';

interface CapsuleCollisionResult {
    normal: THREE.Vector3;
    depth: number;
    point: THREE.Vector3;
}

export class Utils {
    /**
     * Performs capsule intersection check with a MeshBVH.
     * Returns collision normal, depth, and point of contact.
     */
    static capsuleIntersect(
        bvh: MeshBVH,
        capsule: Capsule,
    ): CapsuleCollisionResult | false {
        // line from start to end of the capsule cylinder centres
        const capsuleLine = new THREE.Line3(capsule.start, capsule.end);
        // the point on the line segment being tested
        const closestPoint = new THREE.Vector3();
        const hitPoint = new THREE.Vector3();
        let closestDepth = Infinity;
        let hitNormal = new THREE.Vector3();
        let hit = false;

        const segments = 10; // More segments = More accurate but slower

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            capsuleLine.at(t, closestPoint);

            // Create a sphere at this point on the capsule
            const sphere = new THREE.Sphere(closestPoint, capsule.radius);

            // Check if this sphere intersects with the BVH
            const hitResult = bvh.intersectsSphere(sphere);

            if (hitResult) {
                // Find the closest point on the mesh using multiple rays for better accuracy
                const rayDirections = [
                    new THREE.Vector3(0, -1, 0),
                    new THREE.Vector3(0, 1, 0),
                    new THREE.Vector3(1, 0, 0),
                    new THREE.Vector3(-1, 0, 0),
                    new THREE.Vector3(0, 0, 1),
                    new THREE.Vector3(0, 0, -1),
                ];

                for (const direction of rayDirections) {
                    const ray = new THREE.Ray(closestPoint, direction);
                    const intersection = bvh.raycastFirst(ray);

                    if (intersection) {
                        // scalar distance from test point to hit
                        const distance = closestPoint.distanceTo(
                            intersection.point,
                        );
                        const depth = capsule.radius - distance;

                        // console.log(
                        //     `intersection ${Formatting.fVec3(direction)} distance: ${Formatting.dp3(distance)} depth: ${Formatting.dp3(depth)}`,
                        // );
                        if (depth < closestDepth && depth > 0) {
                            closestDepth = depth;
                            hitPoint.copy(intersection.point);
                            hitNormal.copy(intersection.face!.normal);
                            hit = true;
                        }
                    }
                }
            }
        }

        if (hit) {
            // Calculate final normal and depth
            const penetrationVector = new THREE.Vector3().subVectors(
                closestPoint,
                hitPoint,
            );
            const normal = penetrationVector.normalize();

            return {
                normal,
                depth: closestDepth,
                point: hitPoint,
            };
        }

        return false;
    }
}
