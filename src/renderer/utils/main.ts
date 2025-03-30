import * as THREE from 'three';
import { Scene } from 'three';
import { ColorRepresentation } from 'three/src/math/Color';

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

export function createTemporaryVisual(position: THREE.Vector3, scene: Scene, duration = 5, color: ColorRepresentation = '0xff0000') {
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

            // Continue animation
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
