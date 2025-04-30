// src/renderer/ecs/systems/RenderSystem.ts
import { System } from '@ecs/System';
import { World } from '@ecs/World';
import {
    NeedsUpdateComponent,
    PositionComponent,
    RenderableComponent,
    RotationComponent,
} from '@ecs/components';
import { CameraSystem } from '@systems/CameraSystem';
import * as THREE from 'three';
import { ViewportLayoutSystem } from '@systems/ViewportLayoutSystem';
import { AppAction } from '@shared/core';
import { ActiveView, ActiveViewId, ViewportID } from '@core/types/viewport';
import { appEventManager, AppEventManager } from '@core/index';
import { LogManager } from '@renderer/utils/ManagerLogger';
import { DebugHudSprite } from '@renderer/prefabs/DebugHudSprite';
import { Formatting as F } from '@renderer/utils/formatting';
import { ViewConfiguration } from '@core/ViewConfiguration';

/**
 * 1. This is looping the entities with RenderableComponent and
 * PositionComponent and needsUpdateComponent
 * and updates the position of the THREE.Object3D
 *
 * 2. it is looping the active leafs of the ViewportLayoutSystem
 * and rendering the scene
 *
 */
@LogManager()
export class RenderSystem extends System {
    private layoutSystem: ViewportLayoutSystem | undefined;
    private cameraSystem: CameraSystem | undefined;
    private borderMaterial: THREE.Material;
    private borderGeometry: THREE.BufferGeometry;
    private borderMesh: THREE.Object3D;
    private borderScene: THREE.Scene;
    private borderCamera: THREE.OrthographicCamera;
    private focusedActiveView: ActiveView | undefined;
    private focusedViewPort: ViewportID | undefined;
    public debugHud: DebugHudSprite;

    constructor(
        world: World,
        private scene: THREE.Scene,
        private renderer: THREE.WebGLRenderer,
        private events: AppEventManager = appEventManager,
    ) {
        super(world);
        this.registerListeners();

        // Create materials for a visible border
        this.borderMaterial = new THREE.LineBasicMaterial({
            color: 0xff0000, // Bright red
            linewidth: 3, // Note: WebGL has a maximum line width (usually 1)
            depthTest: false, // Draw on top of everything
        });

        // Create an orthographic camera for rendering the border
        this.borderCamera = new THREE.OrthographicCamera(
            -0.5,
            0.5,
            0.5,
            -0.5,
            0.1,
            10,
        );
        this.borderCamera.position.z = 1;

        // Create a separate scene for the border
        this.borderScene = new THREE.Scene();

        // Create geometry for a border (square outline)
        this.borderGeometry = new THREE.BufferGeometry();

        // Define vertices for a square (last point connects back to first)
        const borderVertices = new Float32Array([
            -0.48,
            -0.48,
            0, // Bottom left, slightly inset for visibility
            0.48,
            -0.48,
            0, // Bottom right
            0.48,
            0.48,
            0, // Top right
            -0.48,
            0.48,
            0, // Top left
            -0.48,
            -0.48,
            0, // Back to bottom left to close the loop
        ]);

        this.borderGeometry.setAttribute(
            'position',
            new THREE.BufferAttribute(borderVertices, 3),
        );

        // Create line segments for the border
        this.borderMesh = new THREE.Line(
            this.borderGeometry,
            this.borderMaterial,
        );
        this.borderScene.add(this.borderMesh);

        // box in the bottom left of viewport
        this.debugHud = new DebugHudSprite({});
        this.borderScene.add(this.debugHud.sprite);
    }

    // Call this after all systems are created
    registerDependencies() {
        this.layoutSystem = this.world.getSystem(ViewportLayoutSystem);
        this.cameraSystem = this.world.getSystem(CameraSystem);
        if (!this.layoutSystem || !this.cameraSystem) {
            console.error(
                'RenderSystem: Failed to get ViewportLayoutSystem or CameraSystem!',
            );
        }
    }

    private registerListeners() {
        this.events.on(
            AppAction.FOCUS_CHANGED,
            this.handleFocusChanged.bind(this),
        );
    }

    private handleFocusChanged(payload: {
        viewportId: ViewportID | null;
        activeViewId: ActiveViewId | null;
        oldActiveViewId: ActiveViewId | null;
    }) {
        if (payload.activeViewId) {
            this.focusedActiveView = this.cameraSystem?.getActiveView(
                payload.activeViewId,
            );
        }
        if (payload.viewportId) {
            this.focusedViewPort = payload.viewportId;
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

            // Remove the NeedsUpdateComponent after processing
            this.world.removeComponent(entity, NeedsUpdateComponent);
        }

        // --- Rendering with Dynamic Viewports ---
        const size = this.renderer.getSize(new THREE.Vector2());
        this.renderer.setScissorTest(true);
        this.renderer.autoClear = true; // Clear once for the first viewport drawn

        for (const leaf of this.layoutSystem.getAllLeafs()) {
            const viewportRect = leaf.calculatedViewport;

            if (viewportRect.z <= 0 || viewportRect.w <= 0) continue; // Skip zero-size viewports

            const x = Math.floor(viewportRect.x * size.width);
            const y = Math.floor(viewportRect.y * size.height);
            const width = Math.floor(viewportRect.z * size.width);
            const height = Math.floor(viewportRect.w * size.height);

            this.renderer.setViewport(x, y, width, height);
            this.renderer.setScissor(x, y, width, height);

            // @TODO this is messy...
            if (leaf.activeViewId) {
                const activeView = this.cameraSystem?.getActiveView(
                    leaf.activeViewId,
                );
                if (activeView?.viewConfigId) {
                    const viewConfig: ViewConfiguration | undefined =
                        this.cameraSystem.getViewConfiguration(
                            activeView.viewConfigId,
                        );
                    if (viewConfig) {
                        const camera = this.cameraSystem.getCameraInstance(
                            viewConfig?.cameraId,
                        );
                        if (camera) {
                            // Update aspect ratio just before rendering (important!)
                            if (height > 0) {
                                // Avoid division by zero
                                camera.aspect = width / height;
                                camera.updateProjectionMatrix();
                            }
                            this.renderer.render(this.scene, camera);
                        }
                    }
                }
            }

            // If this is the focused leaf, render a border/highlight
            if (this.focusedViewPort && leaf.id === this.focusedViewPort) {
                // Render border on top of the scene content
                // if (Math.random() < 0.05)
                //   console.log(`rendering border x ${x}, y ${y}, width ${width}, height ${height}`);
                this.renderActiveBorder(x, y, width, height, {
                    focusedViewPort: leaf.id,
                    activeViewId: leaf.activeViewId ?? 'none',
                });
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
    private renderActiveBorder(
        x: number,
        y: number,
        width: number,
        height: number,
        debugData: Record<string, string | number> = {},
    ): void {
        // Set renderer viewport to match our target area
        this.renderer.setViewport(x, y, width, height);
        this.renderer.setScissor(x, y, width, height);

        // Make sure we preserve the WebGL rendering state
        this.renderer.autoClear = false;

        const marginX = 0.03;
        const marginY = 0.03;
        const z = 0; // depth

        // this.textSprite.sprite.position.set(
        //     -0.45,
        //     -0.5,
        //     this.textSprite.sprite.position.z,
        // );

        const halfWidth = this.debugHud.sprite.scale.x / 2;
        const halfHeight = this.debugHud.sprite.scale.y / 2;

        this.debugHud.sprite.scale.set(0.5, 0.25, 1);
        // this.debugHud.sprite.position.set(
        //     this.borderCamera.left + 0.1,
        //     this.borderCamera.bottom + 0.1,
        //     0,
        // );

        this.debugHud.sprite.position.set(
            this.borderCamera.left + marginX,
            this.borderCamera.bottom + marginY,
            0,
        );

        this.debugHud.updateData(debugData);

        // Render the border on top
        this.renderer.render(this.borderScene, this.borderCamera);
    }
}
