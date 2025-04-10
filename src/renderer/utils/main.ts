import * as THREE from 'three';
import {
    CapsuleGeometry,
    Mesh,
    MeshBasicMaterial,
    Object3DEventMap,
    Scene,
} from 'three';
import { ColorRepresentation } from 'three/src/math/Color';
import { Capsule } from '@renderer/threejs/jsm/math/Capsule';
import { scene } from '@core/sceneManager';

export function addDebugArrow(body: THREE.Object3D) {
    // Check if the body is defined
    if (!body) {
        console.error('Body is not defined');
        return;
    }
    // Add direction arrow helper
    const dir = new THREE.Vector3(0, 0, -1); // Forward direction (negative Z)
    const origin = new THREE.Vector3(0, 1.5, 0); // Position at eye level
    const length = 2; // Length of arrow
    const color = 0xff0000; // Red color
    const arrowHelper = new THREE.ArrowHelper(
        dir,
        origin,
        length,
        color,
        0.5,
        0.3,
    ); // Last two params are headLength and headWidth

    body.add(arrowHelper);
}

export function createTemporaryVisual(
    position: THREE.Vector3,
    scene: Scene,
    duration = 5,
    color: ColorRepresentation = '0xff0000',
) {
    // Create a mesh that will show through other objects
    const geometry = new THREE.SphereGeometry(0.05, 8, 8); // Or any geometry you want
    const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.8,
        depthTest: false, // This makes it show through other objects
        depthWrite: false, // Prevents it from affecting the depth buffer
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    scene.add(mesh);

    // Track creation time
    const startTime = performance.now();

    // Create a function to update and eventually remove the object
    function update() {
        const elapsed = (performance.now() - startTime) / 1000; // Convert to seconds

        if (elapsed < duration) {
            // Optional: Fade out or animate during lifetime
            if (elapsed > duration - 1) {
                // Fade out in the last second
                material.opacity = 0.8 * (1 - (elapsed - (duration - 1)));
            }
            requestAnimationFrame(update);
        } else {
            // Clean up when duration is reached
            scene.remove(mesh);
            geometry.dispose();
            material.dispose();
        }
    }

    // Start the update loop
    update();

    return mesh; // Return in case you need to reference it
}

/**
 * Utility function to create a temporary mesh in the scene
 *
 * @param mesh
 * @param position
 * @param material
 * @param geometry
 * @param scene
 * @param duration
 * @param color
 */
export function meshDisposer(
    mesh: THREE.Mesh,
    position: THREE.Vector3,
    material: THREE.Material,
    geometry: THREE.BufferGeometry,
    scene: Scene,
    duration = 5,
    color: ColorRepresentation = '0xff0000',
) {
    mesh.position.copy(position);
    scene.add(mesh);

    // Track creation time
    const startTime = performance.now();

    // Create a function to update and eventually remove the object
    function update() {
        const elapsed = (performance.now() - startTime) / 1000; // Convert to seconds

        if (elapsed < duration) {
            // Optional: Fade out or animate during lifetime
            if (elapsed > duration - 1) {
                // Fade out in the last second
                material.opacity = 0.8 * (1 - (elapsed - (duration - 1)));
            }
            requestAnimationFrame(update);
        } else {
            // Clean up when duration is reached
            scene.remove(mesh);
            geometry.dispose();
            material.dispose();
        }
    }

    // Start the update loop
    update();

    return mesh; // Return in case you need to reference it
}

export class CapsuleUtils {
    static debugCapsule(capsule: Capsule) {
        const geometry = new THREE.CapsuleGeometry(
            capsule.radius,
            capsule.start.distanceTo(capsule.end),
            4,
            8,
        );
        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            wireframe: true,
            depthTest: false,
            opacity: 0.3,
            transparent: true,
        });
        const visualMesh: Mesh<
            CapsuleGeometry,
            MeshBasicMaterial,
            Object3DEventMap
        > = new THREE.Mesh(geometry, material);
        meshDisposer(
            visualMesh,
            capsule.start.clone().lerp(capsule.end, 0.5),
            material,
            geometry,
            scene,
        );
    }
}
