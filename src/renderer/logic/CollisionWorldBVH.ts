import * as THREE from 'three';
import { Box3, Intersection } from 'three';
import { Capsule } from '@renderer/threejs/jsm/math/Capsule';
import { ExtendedTriangle } from 'three-mesh-bvh';
import {
    CollisionWorld,
    RayIntersection,
    RayIntersectionResult,
} from '@renderer/logic/CollisionWorld';

export type IntersectionCallback = (
    capsule: Capsule,
    direction: THREE.Vector3,
    depth: number,
    isGroundCollision: boolean,
    intersectionPoint: THREE.Vector3,
) => void;

export class BVHCollisionWorld extends CollisionWorld {
    private geometry: THREE.BufferGeometry;

    constructor(geometry: THREE.BufferGeometry) {
        super();
        this.geometry = geometry;
    }

    private mapToRayIntersection(intersection: Intersection): RayIntersection {
        return {
            distance: intersection.distance,
            normal: CollisionWorld.getIntersectionNormal(intersection),
            position: intersection.point,
        };
    }

    rayIntersect(ray: THREE.Ray): RayIntersection[] {
        return this.geometry.boundsTree
            ? this.geometry.boundsTree
                  .raycast(ray)
                  .map<RayIntersection>(this.mapToRayIntersection)
            : [];
    }

    rayIntersectFirst(ray: THREE.Ray): RayIntersectionResult {
        const result = this.geometry.boundsTree?.raycastFirst(ray);
        return result
            ? {
                  distance: result.distance,
                  normal: CollisionWorld.getIntersectionNormal(result),
                  position: result.point,
              }
            : false;
    }

    capsuleIntersect(capsule: Capsule, triCallback: IntersectionCallback): any {
        // Usage example
        return this.geometry.boundsTree?.shapecast(
            this.intersectsCapsule(capsule, triCallback),
        );
    }

    private triPoint = new THREE.Vector3();
    private capsulePoint = new THREE.Vector3();

    intersectsCapsule(capsule: Capsule, triCallback: IntersectionCallback) {
        return {
            intersectsBounds: (box: Box3) =>
                box.intersectsBox(capsule.boundingBox),
            intersectsTriangle: (tri: ExtendedTriangle) => {
                const distance = tri.closestPointToSegment(
                    capsule.segment,
                    this.triPoint,
                    this.capsulePoint,
                );
                if (distance < capsule.radius) {
                    const depth = capsule.radius - distance;
                    const direction = this.capsulePoint
                        .sub(this.triPoint)
                        .normalize();

                    // Check if the collision direction is primarily upwards (positive Y-axis)
                    const isGroundCollision = direction.y > 0.7;

                    // Call the provided callback with the collision details
                    if (triCallback)
                        triCallback(
                            capsule,
                            direction,
                            depth,
                            isGroundCollision,
                            this.triPoint.clone(),
                        );
                }
            },
        };
    }
}
