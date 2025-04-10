// src/renderer/ecs/systems/RenderSystem.ts
import { System } from '@ecs/System';
import { World } from '@ecs/World';
import { NeedsUpdateComponent, PositionComponent, RenderableComponent, RotationComponent } from '@ecs/components';
import { CameraSystem } from './CameraSystem';
import * as THREE from 'three';
import { ViewportLayoutSystem } from '@systems/ViewportLayoutSystem';

/**
 * 1. This is looping the entities with RenderableComponent and
 * PositionComponent and needsUpdateComponent
 * and updates the position of the THREE.Object3D
 *
 * 2. it is looping the active leafs of the ViewportLayoutSystem
 * and rendering the scene
 *
 */
export class RenderSystem extends System {
    private layoutSystem: ViewportLayoutSystem | undefined;
    private cameraSystem: CameraSystem | undefined;
    private borderMaterial: THREE.Material;
    private borderGeometry: THREE.BufferGeometry;
    private borderMesh: THREE.Object3D;
    private borderScene: THREE.Scene;
    private borderCamera: THREE.OrthographicCamera;


    constructor(
        world: World,
        private scene: THREE.Scene,
        private renderer: THREE.WebGLRenderer,
    ) {
        super(world);

        // Create materials for a visible border
        this.borderMaterial = new THREE.LineBasicMaterial({
            color: 0xff0000,  // Bright red
            linewidth: 3,     // Note: WebGL has a maximum line width (usually 1)
            depthTest: false  // Draw on top of everything
        });

        // Create an orthographic camera for rendering the border
        this.borderCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
        this.borderCamera.position.z = 1;

        // Create a separate scene for the border
        this.borderScene = new THREE.Scene();

        // Create geometry for a border (square outline)
        this.borderGeometry = new THREE.BufferGeometry();

        // Define vertices for a square (last point connects back to first)
        const borderVertices = new Float32Array([
            -0.48, -0.48, 0,  // Bottom left, slightly inset for visibility
            0.48, -0.48, 0,   // Bottom right
            0.48, 0.48, 0,    // Top right
            -0.48, 0.48, 0,   // Top left
            -0.48, -0.48, 0   // Back to bottom left to close the loop
        ]);

        this.borderGeometry.setAttribute('position', new THREE.BufferAttribute(borderVertices, 3));

        // Create line segments for the border
        this.borderMesh = new THREE.Line(this.borderGeometry, this.borderMaterial);
        this.borderScene.add(this.borderMesh);
    }

    // Call this after all systems are created
    registerDependencies() {
        this.layoutSystem = this.world.getSystem(ViewportLayoutSystem);
        this.cameraSystem = this.world.getSystem(CameraSystem);
        if (!this.layoutSystem || !this.cameraSystem) {
            console.error("RenderSystem: Failed to get ViewportLayoutSystem or CameraSystem!");
        }
    }


    update(deltaTime: number): void {
        if (!this.layoutSystem || !this.cameraSystem) return; // Dependencies not ready

        // Update positions/rotations of THREE.Object3D based on ECS components
        const entitiesToUpdate = this.world.queryEntities([
            RenderableComponent,
            NeedsUpdateComponent,
            PositionComponent,
        ]);

        for (const entity of entitiesToUpdate) {
            const renderable = this.world.getComponent(
                entity,
                RenderableComponent,
            )!;
            const position = this.world.getComponent(entity, PositionComponent);
            const rotation = this.world.getComponent(entity, RotationComponent);

            if (position) {
                renderable.object3D.position.copy(position.value);
            }
            if (rotation) {
                renderable.object3D.quaternion.copy(rotation.value);
            } // @TODO what to do about component removal?

            // Optional: Update scale, visibility etc. if you add those components

            // Remove the NeedsUpdateComponent after processing
            this.world.removeComponent(entity, NeedsUpdateComponent);
        }

        // --- Rendering with Dynamic Viewports ---
        const size = this.renderer.getSize(new THREE.Vector2());
        this.renderer.setScissorTest(true);
        this.renderer.autoClear = true; // Clear once for the first viewport drawn

        const leafNodes = this.layoutSystem.getActiveLeafs();

        const activeViews = this.cameraSystem.activeViews;
        const focusedActiveView = this.cameraSystem.getFocusedActiveView();

        // looping the activeviews returns only leafs with possible cameras, but it
        // means I can't display things in empty leaf nodes. maybe rethink this
        for (const [activeViewId, activeView] of activeViews) {

            const camera = this.cameraSystem.getCameraInstance(activeView.cameraId);
            if (!camera) continue; // Skip if camera instance not found
            const leaf = this.layoutSystem.findLeaf(activeView.viewportId);
            if(!leaf) continue;

            const viewportRect = leaf.calculatedViewport; // Get calculated rectangle

            if (viewportRect.z <= 0 || viewportRect.w <= 0) continue; // Skip zero-size viewports

            const x = Math.floor(viewportRect.x * size.width);
            const y = Math.floor(viewportRect.y * size.height);
            const width = Math.floor(viewportRect.z * size.width);
            const height = Math.floor(viewportRect.w * size.height);

            // Update aspect ratio just before rendering (important!)
            if (height > 0) {
                // Avoid division by zero
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
            }

            this.renderer.setViewport(x, y, width, height);
            this.renderer.setScissor(x, y, width, height);

            this.renderer.render(this.scene, camera);

            // If this is the focused leaf, render a border/highlight
            if (focusedActiveView && leaf.id === focusedActiveView.viewportId) {
                // Render border on top of the scene content
                if (Math.random() < 0.05)
                  console.log(`rendering border x ${x}, y ${y}, width ${width}, height ${height}`);
                this.renderBorder(x, y, width, height);
            }

            // Don't auto-clear for subsequent viewports in the same frame
            this.renderer.autoClear = false;
        }

        this.renderer.setScissorTest(false); // Disable scissor test
        this.renderer.autoClear = true; // Reset for next frame
    }

    /**
     * Renders a border around the specified viewport
     */
    private renderBorder(x: number, y: number, width: number, height: number): void {
        // Set renderer viewport to match our target area
        this.renderer.setViewport(x, y, width, height);
        this.renderer.setScissor(x, y, width, height);

        // Make sure we preserve the WebGL rendering state
        this.renderer.autoClear = false;

        // Render the border on top
        this.renderer.render(this.borderScene, this.borderCamera);
    }
}
