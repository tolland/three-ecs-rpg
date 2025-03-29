
import { System } from '@ecs/System';
import { World } from '@ecs/World';
import { PositionComponent, RotationComponent, RenderableComponent, NeedsUpdateComponent } from '@ecs/components';
import { CameraSystem } from './CameraSystem'; // Needs access to camera info
import * as THREE from 'three';

export class RenderSystem extends System {
    constructor(
        world: World,
        private scene: THREE.Scene,
        private renderer: THREE.WebGLRenderer,
        private cameraSystem: CameraSystem // Inject CameraSystem
    ) {
        super(world);
    }

    update(deltaTime: number): void {
        // Update positions/rotations of THREE.Object3D based on ECS components
        const entitiesToUpdate = this.world.queryEntities([RenderableComponent, NeedsUpdateComponent]);

        for (const entity of entitiesToUpdate) {
            const renderable = this.world.getComponent(entity, RenderableComponent)!;
            const position = this.world.getComponent(entity, PositionComponent);
            const rotation = this.world.getComponent(entity, RotationComponent);

            if (position) {
                renderable.object3D.position.copy(position.value);
            }
            if (rotation) {
                renderable.object3D.quaternion.copy(rotation.value);
            }

            // Optional: Update scale, visibility etc. if you add those components

            // Remove the NeedsUpdateComponent after processing
            this.world.removeComponent(entity, NeedsUpdateComponent);
        }

        // --- Rendering with potentially multiple viewports ---
        const viewports = this.cameraSystem.getViewports();
        const size = this.renderer.getSize(new THREE.Vector2());
        this.renderer.setScissorTest(true); // Enable scissor testing

        // Important: Clear depth buffer once at the start if viewports overlap or if needed
        this.renderer.autoClear = true; // Let Three.js handle clearing for the first viewport
        // this.renderer.clear(); // Or manually clear if autoClear is false

        for (const { camera, viewport } of viewports) {
            if (viewport.z <= 0 || viewport.w <= 0) continue; // Skip disabled viewports

            const x = Math.floor(viewport.x * size.width);
            const y = Math.floor(viewport.y * size.height);
            const width = Math.floor(viewport.z * size.width);
            const height = Math.floor(viewport.w * size.height);

            // Update aspect ratio just before rendering (important!)
            if (height > 0) { // Avoid division by zero
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
            }

            this.renderer.setViewport(x, y, width, height);
            this.renderer.setScissor(x, y, width, height);

            this.renderer.render(this.scene, camera);
            this.renderer.autoClear = false; // Don't auto-clear for subsequent viewports in the same frame
        }

        this.renderer.setScissorTest(false); // Disable scissor test
        this.renderer.autoClear = true; // Reset for next frame
    }
}