// src/renderer/ecs/systems/CameraSystem.ts
import { audioManager } from '@core/AudioManager';
import {
    createDefaultViewConfig,
    ViewConfiguration,
} from '@core/ViewConfiguration';
import { generateId } from '@core/ViewportLayout';
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
import { appEventManager, AppEventManager } from '@renderer/core';
import { AppAction } from '@shared/core';
import { LayoutEvent } from '@shared/ipc/ips.types';
import * as F from '@renderer/utils/chalkColors';
import {
    ActiveView,
    ActiveViewId,
    CameraID,
    ViewConfigID,
    ViewportID,
} from '@renderer/core/types/viewport';
import { serializeForConsole } from '@shared/core/utils';
import {
    LogManager,
    ManagerLoggingConfig,
} from '@renderer/utils/ManagerLogger';

export const CameraSystemLoggingConfig = {
    /** Main toggle for enabling/disable all CameraSystem logging */
    enabled: false,
    /** Toggle for constructor logging */
    logConstructors: true,
    /** Toggle for constructor logging */
    logFocusedChanged: false,
    /** Toggle for method invocation logging */
    logMethods: false,
    /** Style for manager names in logs */
    styleFocusChange: (name: string) => `\x1b[36m${name}\x1b[0m`, // Cyan color
    /** Style for lifecycle events */
    styleLifecycle: (event: string) => `\x1b[33m${event}\x1b[0m`, // Yellow color
};

/**
 *
 * manage pools of cameras and view configurations, driven by ActiveView links.
 *
 * Remove direct viewport/camera management from CameraSystem.
 */
@LogManager()
export class CameraSystem extends System {
    // Pools
    @Serializer.Serialize()
    private cameraInstances: Map<CameraID, THREE.PerspectiveCamera> = new Map();

    @Serializer.Serialize()
    private viewConfigurations: Map<ViewConfigID, ViewConfiguration> =
        new Map();

    @Serializer.Serialize({ outputKey: 'activeViews' })
    private _activeViews: Map<ActiveViewId, ActiveView> = new Map();

    // Dependencies
    // Must be set after systems created
    private layoutSystem: ViewportLayoutSystem | undefined;

    // Need access to world geometry for raycasting
    private collisionWorld: CollisionWorld | null = null;

    // // Focused View Tracking
    @Serializer.Serialize({ outputKey: 'focusedActiveViewId' })
    private _focusedActiveViewId: ActiveViewId | null = null;

    // @TODO implement world chunks
    // Key: chunk key "x_z"
    private chunks: Map<string, CollisionWorld> = new Map();

    // Reusable objects for calculations
    private spherical = new THREE.Spherical();
    private idealCameraOffset = new THREE.Vector3();
    private idealCameraPosition = new THREE.Vector3();
    private targetLookAt = new THREE.Vector3();
    private raycaster = new THREE.Raycaster();
    private listener: THREE.AudioListener | null = null;

    // Inject Octree (or CollisionSystem)
    constructor(
        world: World,
        private scene: THREE.Scene,
        private events: AppEventManager = appEventManager,
    ) {
        super(world);
        // Find collision system to get Octree? Or require Octree in constructor?
        // Let's assume we set it via a method for now.
        if (
            CameraSystemLoggingConfig.enabled &&
            CameraSystemLoggingConfig.logConstructors
        ) {
            console.log(
                `${F.fcYellow('CameraSystem')}: Initialized - will attach AudioListener when ready`,
            );
        }

        this.registerListeners();
    }

    registerListeners() {
        this.events.on(
            AppAction.VIEWPORT_LAYOUT_UPDATED,
            this.handleLayoutUpdated.bind(this),
        );
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
        if (
            CameraSystemLoggingConfig.enabled &&
            CameraSystemLoggingConfig.logFocusedChanged
        ) {
            console.log(
                `${F.fcYellow('CameraSystem')}: FOCUS_CHANGED event changed to ActiveView ${payload.activeViewId}  viewportId: ${payload.viewportId}  oldActiveViewId: ${payload.oldActiveViewId}`,
            );
        }

        if (payload.activeViewId) {
            this._focusedActiveViewId = payload.activeViewId;
            const activeView = this._activeViews.get(payload.activeViewId);
            if (activeView) {
                const viewConfig = this.viewConfigurations.get(
                    activeView.viewConfigId,
                );
                if (viewConfig) {
                    const camera = this.cameraInstances.get(
                        viewConfig.cameraId,
                    );
                    if (camera) {
                        // Make sure camera has valid state before updating audio listener
                        if (
                            camera.position &&
                            camera.position.x !== null &&
                            camera.position.y !== null &&
                            camera.position.z !== null
                        ) {
                            this.updateAudioListener(camera);
                        } else {
                            console.warn(
                                `Cannot update audio listener: Camera ${viewConfig.cameraId} has invalid position`,
                            );
                        }
                    }
                }
            }
        }
    }

    private handleLayoutUpdated(event: LayoutEvent): void {
        if (CameraSystemLoggingConfig.enabled) {
            console.log(
                `${F.fcYellow('CameraSystem')}: saw VIEWPORT_LAYOUT_UPDATED event with payload ${serializeForConsole(Serializer.serialize(event))}`,
            );
        }
        switch (event.type) {
            case 'leaf-split':
                // Handle leaf split events
                if (event.sourceNodeId && event.newNodeIds) {
                    event.newNodeIds.forEach((newNodeId: string) => {
                        const existingView =
                            this.getActiveViewForViewport(newNodeId);
                        if (CameraSystemLoggingConfig.enabled) {
                            console.log(
                                `${F.fcYellow('CameraSystem')}: handling leaf split`,
                            );
                        }
                    });
                }
                break;
            case 'view-assigned':
                if (event.sourceNodeId && event.activeViewId) {
                    const activeView = this.getActiveView(event.activeViewId);
                    const leaf = this.layoutSystem?.findLeaf(
                        event.sourceNodeId,
                    );
                    if (activeView && leaf) {
                        // Update the existing view's viewport
                        activeView.viewportId = event.sourceNodeId;
                    } else {
                        console.warn(
                            `${F.fcYellow('CameraSystem')}: ActiveView ${event.activeViewId} not found.`,
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
            console.error(
                `\`${F.fcYellow('CameraSystem')}: ViewportLayoutSystem not found!`,
            );
        // CollisionWorld is set via setCollisionWorld
    }

    getCameraInstance(cameraId: string): THREE.PerspectiveCamera | undefined {
        return this.cameraInstances.get(cameraId);
    }

    setCollisionWorld(collisionWorld: CollisionWorld | null) {
        this.collisionWorld = collisionWorld;
        console.log(`${F.fcYellow('CameraSystem')}: Collision World set.`);
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
        console.log(
            `${F.fcYellow('CameraSystem')}: Adding CollisionWorld for chunk ${key}`,
        );
        this.chunks.set(key, octree);
    }

    removeChunk(key: string) {
        console.log(
            `${F.fcYellow('CameraSystem')}: Removing CollisionWorld for chunk ${key}`,
        );
        this.chunks.delete(key);
    }

    // --- Pool Management API ---
    createCameraInstance(
        id: CameraID,
        fov = 75,
        near = 0.1,
        far = 1000,
    ): THREE.PerspectiveCamera {
        if (this.cameraInstances.has(id)) {
            console.warn(
                `${F.fcYellow('CameraSystem')}: Camera instance with ID ${id} already exists.`,
            );
            return this.cameraInstances.get(id)!;
        }

        const camera = new THREE.PerspectiveCamera(fov, 1, near, far);
        camera.name = `ManagedCamera_${id}`;

        // Ensure valid initial transform
        camera.position.set(0, 0, 0);
        camera.quaternion.set(0, 0, 0, 1);
        camera.updateMatrix();
        camera.updateMatrixWorld(true);

        camera.layers.enable(RenderLayers.RENDER_LAYER);
        camera.layers.enable(RenderLayers.PLAYER_LAYER);
        this.cameraInstances.set(id, camera);
        this.scene.add(camera);
        console.log(
            `${F.fcYellow('CameraSystem')}: Created camera instance "${id}"`,
        );
        return camera;
    }

    destroyCameraInstance(id: CameraID): void {
        const camera = this.cameraInstances.get(id);
        if (camera) {
            this.scene.remove(camera);
            this.cameraInstances.delete(id);
            // TODO: Ensure no ActiveView is using this camera ID
            console.log(
                `${F.fcYellow('CameraSystem')}: Destroyed camera instance ${id}`,
            );
        }
    }

    createViewConfiguration(
        id: ViewConfigID,
        name: string,
        cameraId: CameraID,
        initialState?: Partial<ViewConfiguration>,
    ): ViewConfiguration {
        if (this.viewConfigurations.has(id)) {
            console.warn(
                `${F.fcYellow('CameraSystem')}: View configuration with ID ${id} already exists.`,
            );
            return this.viewConfigurations.get(id)!;
        }
        const newConfig = {
            ...createDefaultViewConfig(id, name, cameraId),
            ...initialState,
        };
        this.viewConfigurations.set(id, newConfig);
        console.log(
            `${F.fcYellow('CameraSystem')}: Created view configuration ${id} (${name}) targetEntity ${newConfig.targetEntity}`,
        );
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

    get activeViews(): Map<ActiveViewId, ActiveView> {
        return this._activeViews;
    }

    getActiveView(id: ActiveViewId): ActiveView | undefined {
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
        viewConfigId: ViewConfigID,
    ): ActiveView | null {
        console.log(
            `${F.fcYellow('CameraSystem')}: Begin Creating ActiveView linking Viewport:${viewportId}, Config:${viewConfigId}`,
        );
        if (!this.layoutSystem?.findLeaf(viewportId)) {
            console.error(
                `${F.fcYellow('CameraSystem')}: Cannot create ActiveView: Viewport ${viewportId} not found.`,
            );
            return null;
        }
        if (!this.viewConfigurations.has(viewConfigId)) {
            console.error(
                `${F.fcYellow('CameraSystem')}: Cannot create ActiveView: ViewConfig ${viewConfigId} not found.`,
            );
            return null;
        }

        const id = generateId({ prefix: 'av-' }); // Unique ID for the ActiveView link itself
        const activeView: ActiveView = {
            id,
            viewportId,
            viewConfigId,
        };
        this._activeViews.set(id, activeView);

        // Assign this view to the layout leaf
        this.layoutSystem.assignActiveViewToLeaf(viewportId, id);

        // Set initial focus if nothing else is focused
        // if (this._focusedActiveViewId === null) {
        //     // this.setFocus(id);
        //     this.events.emit(AppAction.FOCUS_SET_FOCUS, { viewportId });
        // }

        console.log(
            `${F.fcYellow('CameraSystem')}: Created ActiveView ${id} linking Viewport:${viewportId}, Config:${viewConfigId}`,
        );
        return activeView;
    }

    destroyActiveView(id: ActiveViewId): void {
        const activeView = this._activeViews.get(id);
        if (activeView) {
            console.dir(activeView);
            //  console.log(`${Serializer.serializeToJSON(activeView)}`);
            // Unassign from viewport leaf
            this.layoutSystem?.assignActiveViewToLeaf(
                activeView.viewportId,
                null,
            );
            this._activeViews.delete(id);
            // if (this._focusedActiveViewId === id) {
            //     this._focusedActiveViewId = null; // Or set focus to another view
            // }
        }
    }

    // getFocusedActiveView(): ActiveView | undefined {
    //     return this._focusedActiveViewId
    //         ? this._activeViews.get(this._focusedActiveViewId)
    //         : undefined;
    // }

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

            if (!viewConfig) {
                console.warn(
                    `${F.fcYellow('CameraSystem')}: Missing config for ActiveView ${activeView.id}`,
                );
                return; // Skip this view if data is missing
            }

            const camera = this.cameraInstances.get(viewConfig.cameraId);

            if (!camera) {
                console.warn(
                    `${F.fcYellow('CameraSystem')}: Missing camera for ActiveView ${activeView.id}`,
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
        // Safely get the listener from the audio manager
        if (!audioManager.isEnabled() || !audioManager.listener) {
            return;
        }

        // Ensure we're using the same listener instance
        this.listener = audioManager.listener;

        // Skip attaching if camera is invalid
        if (
            !activeCamera ||
            !activeCamera.isCamera ||
            !activeCamera.matrixWorld ||
            !activeCamera.position ||
            activeCamera.position.x === null
        ) {
            console.warn(
                'CameraSystem: Cannot attach listener to invalid camera',
            );
            return;
        }

        try {
            // Only attach if not already attached to this camera
            if (
                !this.listener.parent ||
                this.listener.parent !== activeCamera
            ) {
                if (this.listener.parent) {
                    this.listener.removeFromParent();
                }

                // Force update camera matrix before attaching
                activeCamera.updateMatrix();
                activeCamera.updateMatrixWorld(true);

                // Now attach the listener
                activeCamera.add(this.listener);
                console.log(
                    `AudioListener attached to camera: ${activeCamera.name}`,
                );
            }
        } catch (error) {
            console.error('Error attaching audio listener to camera:', error);
            console.error('Camera details:', {
                name: activeCamera.name,
                position: activeCamera.position?.toArray() || 'invalid',
            });
        }
    }

    destroy() {
        // Clean up event listener
        // @TODO destroy handlers
        // appEventManager.off(AppAction.LAYOUT_UPDATED, this.handleLayoutUpdated);
        this.clear();
    }

    /**
     * clear down views, cameras, and active views.
     */
    clear(): void {
        console.log(`${F.fcYellow('CameraSystem')}: Removing stuff.`);
        [...this._activeViews.keys()].reverse().forEach((avId) => {
            console.log(
                `${F.fcYellow('CameraSystem')}: destroying active view ${avId}`,
            );
            this.destroyActiveView(avId);
        });

        [...this.viewConfigurations.keys()]
            .reverse()
            .forEach((viewConfigId) => {
                this.destroyViewConfiguration(viewConfigId);
            });

        [...this.cameraInstances.keys()].reverse().forEach((cameraId) => {
            console.log(
                `${F.fcYellow('CameraSystem')}: destroying camera_id ${cameraId}`,
            );
            this.destroyCameraInstance(cameraId);
        });
        this._focusedActiveViewId = null;
        this.setCollisionWorld(null); // Clear collision world reference
        console.log(
            `${F.fcYellow('CameraSystem')}: Cleared all camera instances and view configurations.`,
        );
    }
}
