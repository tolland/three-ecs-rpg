// src/renderer/ecs/systems/CameraSystem.ts
import { ActiveView } from '@core/ActiveView';
import { audioManager } from '@core/AudioManager';
import {
    createDefaultViewConfig,
    ViewConfiguration,
} from '@core/ViewConfiguration';
import {
    CameraID,
    generateId,
    ViewConfigID,
    ViewportID,
} from '@core/ViewportLayout';
import { System } from '@ecs/System';
import { World } from '@ecs/World';
import {
    CameraMode,
    PositionComponent,
    RotationComponent,
} from '@ecs/components';
import { CollisionWorld } from '@renderer/logic/CollisionWorld';
import { RenderLayers } from '@setup/sceneSetup';
import { ViewportLayoutSystem } from '@systems/ViewportLayoutSystem';
import * as THREE from 'three';
import { Serializer } from '@shared/serialization/Serializer';
import { serializeForConsole } from '@renderer/utils/formatting';
import { appEventManager, AppEventManager } from '@renderer/core';
import { AppAction } from '@shared/core';
import { LayoutEvent } from '@shared/ipc/ips.types';
import { RegisterManager } from '@core/ManagerRegistry';

/**
 *
 * manage pools of cameras and view configurations, driven by ActiveView links.
 *
 * Remove direct viewport/camera management from CameraSystem.
 */
@RegisterManager()
export class CameraSystem extends System {
    // Pools
    @Serializer.Serialize()
    private cameraInstances: Map<CameraID, THREE.PerspectiveCamera> = new Map();

    @Serializer.Serialize()
    private viewConfigurations: Map<ViewConfigID, ViewConfiguration> =
        new Map();

    @Serializer.Serialize({outputKey: "activeViews"})
    private _activeViews: Map<string, ActiveView> = new Map(); // Key: ActiveView ID

    // Dependencies
    private layoutSystem: ViewportLayoutSystem | undefined; // Must be set after systems created
    // Need access to world geometry for raycasting
    private collisionWorld: CollisionWorld | null = null;

    // Focused View Tracking
    @Serializer.Serialize({outputKey: "focusedActiveViewId"})
    private _focusedActiveViewId: string | null = null;

    // @TODO implement world chunks
    private chunks: Map<string, CollisionWorld> = new Map(); // Key: chunk key "x_z"

    // Reusable objects for calculations
    private spherical = new THREE.Spherical();
    private idealCameraOffset = new THREE.Vector3();
    private idealCameraPosition = new THREE.Vector3();
    private targetLookAt = new THREE.Vector3();
    private raycaster = new THREE.Raycaster();
    private listener: THREE.AudioListener;

    // Inject Octree (or CollisionSystem)
    constructor(
        world: World,
        private scene: THREE.Scene,
        private events: AppEventManager = appEventManager,
    ) {
        super(world);
        // Find collision system to get Octree? Or require Octree in constructor?
        // Let's assume we set it via a method for now.
        this.listener = new THREE.AudioListener();
        audioManager.listener = this.listener; // Provide listener to the manager
        console.log('AudioListener created and assigned to AudioManager.');
        this.registerListeners();
    }

    registerListeners() {
        this.events.on(
            AppAction.LAYOUT_UPDATED,
            this.handleLayoutUpdated.bind(this),
        );
    }

    private handleLayoutUpdated(event: LayoutEvent): void {
        console.log(
            `saw event with payload ${serializeForConsole(Serializer.serialize(event))}`,
        );
        switch (event.type) {
            case 'leaf-split':
                // Handle leaf split events
                if (event.sourceNodeId && event.newNodeIds) {
                    event.newNodeIds.forEach((newNodeId: string) => {
                        const existingView =
                            this.getActiveViewForViewport(newNodeId);
                        console.log('handling leaf split');
                    });
                }
                break;
            case 'view-assigned':
                if (event.sourceNodeId && event.viewId) {
                    const activeView = this.getActiveView(event.viewId);
                    const leaf = this.layoutSystem?.findLeaf(
                        event.sourceNodeId,
                    );
                    if (activeView && leaf) {
                        // Update the existing view's viewport
                        activeView.viewportId = event.sourceNodeId;
                    } else {
                        console.warn(
                            `CameraSystem: ActiveView ${event.viewId} not found.`,
                        );
                    }
                }
                break;
        }
    }

    // Call this after all systems are created in ecsSetup
    registerDependencies() {
        this.layoutSystem = this.world.getSystem(ViewportLayoutSystem);
        if (!this.layoutSystem)
            console.error('CameraSystem: ViewportLayoutSystem not found!');
        // CollisionWorld is set via setCollisionWorld
    }

    getCameraInstance(cameraId: string): THREE.PerspectiveCamera | undefined {
        return this.cameraInstances.get(cameraId);
    }

    setCollisionWorld(collisionWorld: CollisionWorld | null) {
        this.collisionWorld = collisionWorld;
        console.log('CameraSystem: Collision World set.');
    }

    // Call this when the renderer size changes
    setRendererSize(width: number, height: number): void {
        // this.rendererSize.set(width, height);
        // Use a temporary array to store camera values to avoid iteration error
        // const camerasArray = Array.from(this.cameras.values());
        // for (const managedCam of camerasArray) {
        //     this.updateCameraProjection(managedCam.camera);
        // }
    }

    // Methods called by WorldStreamingSystem @TODO
    addChunk(key: string, octree: CollisionWorld) {
        console.log(`CollisionSystem: Adding CollisionWorld for chunk ${key}`);
        this.chunks.set(key, octree);
    }

    removeChunk(key: string) {
        console.log(
            `CollisionSystem: Removing CollisionWorld for chunk ${key}`,
        );
        this.chunks.delete(key);
    }

    // --- Pool Management API ---
    createCameraInstance(
        id: CameraID,
        fov = 75,
        near = 0.1,
        far = 1000,
    ): THREE.PerspectiveCamera | null {
        if (this.cameraInstances.has(id)) {
            console.warn(
                `CameraSystem: Camera instance with ID ${id} already exists.`,
            );
            return this.cameraInstances.get(id)!;
        }
        const camera = new THREE.PerspectiveCamera(fov, 1, near, far); // Aspect ratio set per-frame by RenderSystem
        camera.name = `ManagedCamera_${id}`;
        camera.layers.enable(RenderLayers.RENDER_LAYER); // Set default layers
        camera.layers.enable(RenderLayers.PLAYER_LAYER);
        this.cameraInstances.set(id, camera);
        this.scene.add(camera); // Add to scene immediately
        console.log(`CameraSystem: Created camera instance ${id}`);
        return camera;
    }

    destroyCameraInstance(id: CameraID): void {
        const camera = this.cameraInstances.get(id);
        if (camera) {
            this.scene.remove(camera);
            this.cameraInstances.delete(id);
            // TODO: Ensure no ActiveView is using this camera ID
            console.log(`CameraSystem: Destroyed camera instance ${id}`);
        }
    }

    createViewConfiguration(
        id: ViewConfigID,
        name: string,
        initialState?: Partial<ViewConfiguration>,
    ): ViewConfiguration {
        if (this.viewConfigurations.has(id)) {
            console.warn(
                `CameraSystem: View configuration with ID ${id} already exists.`,
            );
            return this.viewConfigurations.get(id)!;
        }
        const newConfig = {
            ...createDefaultViewConfig(id, name),
            ...initialState,
        };
        this.viewConfigurations.set(id, newConfig);
        console.log(`CameraSystem: Created view configuration ${id} (${name})`);
        return newConfig;
    }

    getViewConfiguration(id: ViewConfigID): ViewConfiguration | undefined {
        return this.viewConfigurations.get(id);
    }

    updateViewConfiguration(
        id: ViewConfigID,
        updates: Partial<ViewConfiguration>,
    ): boolean {
        const config = this.viewConfigurations.get(id);
        if (config) {
            Object.assign(config, updates);
            // Maybe clamp values here?
            return true;
        }
        return false;
    }

    destroyViewConfiguration(id: ViewConfigID): void {
        // TODO: Ensure no ActiveView is using this config ID
        this.viewConfigurations.delete(id);
    }

    // --- ActiveView Management ----

    get activeViews(): Map<string, ActiveView> {
        return this._activeViews;
    }

    getActiveView(id: string): ActiveView | undefined {
        return this._activeViews.get(id);
    }

    // Get ActiveView associated with a Viewport Leaf
    getActiveViewForViewport(viewportId: ViewportID): ActiveView | undefined {
        const leaf = this.layoutSystem?.findLeaf(viewportId);
        return leaf?.activeViewId
            ? this._activeViews.get(leaf.activeViewId)
            : undefined;
    }

    createActiveView(
        viewportId: ViewportID,
        cameraId: CameraID,
        viewConfigId: ViewConfigID,
    ): ActiveView | null {
        if (!this.layoutSystem?.findLeaf(viewportId)) {
            console.error(
                `Cannot create ActiveView: Viewport ${viewportId} not found.`,
            );
            return null;
        }
        if (!this.cameraInstances.has(cameraId)) {
            console.error(
                `Cannot create ActiveView: Camera ${cameraId} not found.`,
            );
            return null;
        }
        if (!this.viewConfigurations.has(viewConfigId)) {
            console.error(
                `Cannot create ActiveView: ViewConfig ${viewConfigId} not found.`,
            );
            return null;
        }

        const id = generateId({ prefix: 'av-' }); // Unique ID for the ActiveView link itself
        const activeView: ActiveView = {
            id,
            viewportId,
            cameraId,
            viewConfigId,
        };
        this._activeViews.set(id, activeView);

        // Assign this view to the layout leaf
        this.layoutSystem.assignViewToLeaf(viewportId, id);

        // Set initial focus if nothing else is focused
        if (this._focusedActiveViewId === null) {
            this.setFocus(id);
        }

        console.log(
            `CameraSystem: Created ActiveView ${id} linking Viewport:${viewportId}, Camera:${cameraId}, Config:${viewConfigId}`,
        );
        return activeView;
    }

    destroyActiveView(id: string): void {
        const activeView = this._activeViews.get(id);
        if (activeView) {
            console.dir(activeView);
            //  console.log(`${Serializer.serializeToJSON(activeView)}`);
            // Unassign from viewport leaf
            this.layoutSystem?.assignViewToLeaf(activeView.viewportId, null);
            this._activeViews.delete(id);
            if (this._focusedActiveViewId === id) {
                this._focusedActiveViewId = null; // Or set focus to another view
            }
        }
    }

    get focusedActiveViewId(): string | null {
        return this._focusedActiveViewId;
    }

    // --- Focus Management ---
    setFocus(activeViewId: string | null): void {
        if (activeViewId && !this._activeViews.has(activeViewId)) {
            console.warn(
                `CameraSystem: Cannot set focus to non-existent ActiveView ${activeViewId}`,
            );
            return;
        }
        this._focusedActiveViewId = activeViewId;
        console.log(`CameraSystem: Focus set to ActiveView ${activeViewId}`);
        // TODO: Emit focus change event? Trigger pointer lock request/release?
    }

    getFocusedActiveView(): ActiveView | undefined {
        return this._focusedActiveViewId
            ? this._activeViews.get(this._focusedActiveViewId)
            : undefined;
    }

    // Register a camera to be managed by the system
    // addCamera(
    //     id: string,
    //     camera: THREE.PerspectiveCamera,
    //     viewport: THREE.Vector4 = new THREE.Vector4(0, 0, 1, 1),
    // ): void {
    //     // Assign viewport to userData *before* calling updateCameraProjection
    //     camera.userData.viewport = viewport.clone(); // Clone to avoid unexpected shared references
    //     this.cameras.set(id, { camera, viewport, targetEntity: null }); // Store the original viewport object here
    //     camera.layers.enable(RenderLayers.RENDER_LAYER);
    //     camera.layers.disable(RenderLayers.PLAYER_LAYER); // <<<<< Disable player layer for game cameras
    //     this.scene.add(camera); // Add camera to the scene
    //     this.updateCameraProjection(camera); // Now userData.viewport exists
    // }

    // getCamera(id: string): THREE.PerspectiveCamera | undefined {
    //     return this.cameras.get(id)?.camera;
    // }

    // private updateCameraProjection(camera: THREE.PerspectiveCamera): void {
    //     const aspect =
    //         (this.rendererSize.x * camera.userData.viewport.z) /
    //         (this.rendererSize.y * camera.userData.viewport.w); // Adjust aspect based on viewport dimensions
    //     if (!isNaN(aspect) && aspect > 0) {
    //         camera.aspect = aspect;
    //         camera.updateProjectionMatrix();
    //     }
    // }

    // --- Method to change camera mode ---
    // setCameraMode(cameraId: string, mode: CameraMode, targetEntityId?: Entity) {
    //     const managedCam = this.cameras.get(cameraId);
    //     if (!managedCam) {
    //         console.warn(
    //             `CameraSystem: Cannot set mode for unknown camera ID: ${cameraId}`,
    //         );
    //         return;
    //     }
    //
    //     let entityToModify = targetEntityId ?? managedCam.targetEntity;
    //     if (entityToModify === null) {
    //         console.warn(
    //             `CameraSystem: Cannot set mode for camera ${cameraId} without a target entity.`,
    //         );
    //         return;
    //     }
    //
    //     const targetComp = this.world.getComponent(
    //         entityToModify,
    //         CameraTargetComponent,
    //     );
    //     if (targetComp) {
    //         console.log(
    //             `Setting camera mode for entity ${entityToModify} on camera ${cameraId} to ${mode}`,
    //         );
    //         targetComp.mode = mode;
    //         // Reset/initialize things if needed when switching modes
    //         if (mode !== CameraMode.FIRST_PERSON) {
    //             targetComp.currentDistance = targetComp.desiredDistance; // Start at desired distance
    //         }
    //         // Mark entity for potential update if mode change affects rendering immediately
    //         this.world.addComponent(entityToModify, new NeedsUpdateComponent());
    //     } else {
    //         console.warn(
    //             `CameraSystem: Target entity ${entityToModify} does not have CameraTargetComponent.`,
    //         );
    //     }
    // }

    // --- Update Loop (Refactored) ---
    update(deltaTime: number): void {
        // Iterate through the ACTIVE VIEWS, not cameras or targets directly
        this._activeViews.forEach((activeView) => {
            const viewConfig: ViewConfiguration | undefined =
                this.viewConfigurations.get(activeView.viewConfigId);
            const camera = this.cameraInstances.get(activeView.cameraId);

            if (!viewConfig || !camera) {
                console.warn(
                    `CameraSystem: Missing config or camera for ActiveView ${activeView.id}`,
                );
                return; // Skip this view if data is missing
            }

            let targetPos: THREE.Vector3 | null = null;
            let targetRot: THREE.Quaternion | null = null;

            if (viewConfig.targetEntity !== null) {
                const posComp = this.world.getComponent(
                    viewConfig.targetEntity,
                    PositionComponent,
                );
                const rotComp = this.world.getComponent(
                    viewConfig.targetEntity,
                    RotationComponent,
                );
                if (posComp) targetPos = posComp.value;
                if (rotComp) targetRot = rotComp.value;
            }

            // Calculate target look-at point (relative to targetPos or world origin for freecam)
            if (viewConfig.mode === 'FREECAM') {
                this.targetLookAt
                    .copy(viewConfig.freecamPosition)
                    .add(
                        new THREE.Vector3(0, 0, -1).applyQuaternion(
                            viewConfig.freecamRotation,
                        ),
                    );
            } else if (targetPos) {
                this.targetLookAt
                    .copy(targetPos)
                    .add(viewConfig.thirdPersonLookAtOffset);
            } else {
                this.targetLookAt.set(0, 0, 0); // Fallback
            }

            // --- Handle Different Camera Modes ---
            switch (viewConfig.mode) {
                case 'FREECAM':
                    // Position/Rotation directly from config state
                    camera.position.copy(viewConfig.freecamPosition);
                    camera.quaternion.copy(viewConfig.freecamRotation);
                    break;

                case CameraMode.FIRST_PERSON:
                    if (targetPos && targetRot) {
                        const worldOffset = viewConfig.firstPersonOffset
                            .clone()
                            .applyQuaternion(targetRot);
                        camera.position.copy(targetPos).add(worldOffset);
                        camera.quaternion.copy(targetRot); // Look where entity looks
                    } else {
                        /* Handle missing target? */
                    }
                    break;

                case CameraMode.THIRD_PERSON_GLOBAL:
                case CameraMode.THIRD_PERSON_ENTITY:
                    if (targetPos && targetRot) {
                        // Need target for 3rd person
                        // Smooth distance
                        const lerpFactor = 1.0 - Math.exp(-deltaTime * 10);
                        viewConfig.currentDistance = THREE.MathUtils.lerp(
                            viewConfig.currentDistance,
                            viewConfig.thirdPersonDistance,
                            lerpFactor,
                        );
                        viewConfig.currentDistance = Math.max(
                            viewConfig.thirdPersonMinDistance,
                            viewConfig.currentDistance,
                        );

                        // Calculate ideal position based on orbit angles (now stored in config)
                        this.spherical.set(
                            viewConfig.currentDistance,
                            Math.PI / 2 - viewConfig.thirdPersonOrbitAngles.y,
                            viewConfig.thirdPersonOrbitAngles.x,
                        );
                        this.idealCameraOffset.setFromSpherical(this.spherical);

                        if (
                            viewConfig.mode === CameraMode.THIRD_PERSON_ENTITY
                        ) {
                            this.idealCameraOffset.applyQuaternion(targetRot); // Apply entity rotation
                        }

                        this.idealCameraPosition
                            .copy(targetPos)
                            .add(this.idealCameraOffset);

                        // Camera Collision (uses this.targetLookAt)
                        let finalCameraPosition = this.performCameraCollision(
                            viewConfig,
                            this.idealCameraPosition,
                            this.targetLookAt,
                        );

                        // Apply final position & lookAt
                        camera.position.lerp(finalCameraPosition, lerpFactor);
                        camera.lookAt(this.targetLookAt);
                    } else {
                        /* Handle missing target? */
                    }
                    break;
            }

            // Update listener position if this is the focused/active camera
            if (activeView.id === this._focusedActiveViewId) {
                this.updateAudioListener(camera);
            }
        });
    } // End update

    private performCameraCollision(
        config: ViewConfiguration,
        idealPosition: THREE.Vector3,
        lookAtPoint: THREE.Vector3,
    ): THREE.Vector3 {
        let finalPosition = idealPosition.clone();
        if (this.collisionWorld) {
            const rayDirection = new THREE.Vector3()
                .subVectors(idealPosition, lookAtPoint)
                .normalize();
            this.raycaster.set(lookAtPoint, rayDirection);
            this.raycaster.far =
                config.currentDistance + config.thirdPersonCollisionBuffer;
            this.raycaster.near = 0.1;

            const hit = this.collisionWorld.rayIntersectFirst(
                this.raycaster.ray,
            );

            if (hit) {
                const collisionDistance =
                    hit.distance - config.thirdPersonCollisionBuffer;
                finalPosition = lookAtPoint
                    .clone()
                    .addScaledVector(
                        rayDirection,
                        Math.max(
                            config.thirdPersonMinDistance,
                            collisionDistance,
                        ),
                    );
                // Update config's current distance to reflect collision
                config.currentDistance = Math.min(
                    config.currentDistance,
                    collisionDistance,
                );
            }
        }
        return finalPosition;
    }

    private updateAudioListener(activeCamera: THREE.Camera): void {
        if (!this.listener.parent) {
            activeCamera.add(this.listener);
        } else if (this.listener.parent !== activeCamera) {
            this.listener.removeFromParent();
            activeCamera.add(this.listener);
        }
        // Listener position/orientation is now automatically updated by being a child of the active camera
    }

    destroy() {
        // Clean up event listener
        appEventManager.off(AppAction.LAYOUT_UPDATED, this.handleLayoutUpdated);
        this.clear();
    }

    /**
     * clear down views, cameras, and active views.
     */
    clear(): void {
        console.log('CameraSystem: Removing stuff.');
        [...this._activeViews.keys()].reverse().forEach((avId) => {
            console.log(`destroying active view ${avId}`);
            this.destroyActiveView(avId);
        });

        [...this.viewConfigurations.keys()]
            .reverse()
            .forEach((viewConfigId) => {
                this.destroyViewConfiguration(viewConfigId);
            });

        [...this.cameraInstances.keys()].reverse().forEach((cameraId) => {
            console.log(`destroying camera_id ${cameraId}`);
            this.destroyCameraInstance(cameraId);
        });
        this._focusedActiveViewId = null;
        this.setCollisionWorld(null); // Clear collision world reference
        console.log(
            'CameraSystem: Cleared all camera instances and view configurations.',
        );
    }
}
