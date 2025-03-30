// src/renderer/ecs/systems/CameraSystem.ts
import { System } from '@ecs/System';
import { World } from '@ecs/World';
import {
    CameraMode,
    CameraTargetComponent,
    NeedsUpdateComponent,
    PositionComponent,
    RotationComponent,
} from '@ecs/components';
import * as THREE from 'three';
import { Octree } from 'three/examples/jsm/math/Octree.js';
import { Entity } from '@ecs/Entity';
import { RenderLayers } from '@setup/sceneSetup';

interface ManagedCamera {
    camera: THREE.PerspectiveCamera;
    viewport: THREE.Vector4; // x, y, width, height (in screen percentages 0-1)
    targetEntity: number | null; // Entity this camera is currently tracking
}

export class CameraSystem extends System {
    private cameras: Map<string, ManagedCamera> = new Map();
    private rendererSize = new THREE.Vector2();
    // Need access to world geometry for raycasting
    private worldOctree: Octree | null = null; // Get this from CollisionSystem or pass directly

    // Reusable objects for calculations
    private spherical = new THREE.Spherical();
    private idealCameraOffset = new THREE.Vector3();
    private idealCameraPosition = new THREE.Vector3();
    private targetLookAt = new THREE.Vector3();
    private raycaster = new THREE.Raycaster();
    private cameraTargetPosition = new THREE.Vector3(); // Position of the target entity

    // Inject Octree (or CollisionSystem)
    constructor(
        world: World,
        private scene: THREE.Scene,
    ) {
        super(world);
        // Find collision system to get Octree? Or require Octree in constructor?
        // Let's assume we set it via a method for now.
    }

    setWorldOctree(octree: Octree) {
        this.worldOctree = octree;
        console.log('CameraSystem: World Octree set.');
    }

    // Register a camera to be managed by the system
    addCamera(
        id: string,
        camera: THREE.PerspectiveCamera,
        viewport: THREE.Vector4 = new THREE.Vector4(0, 0, 1, 1),
    ): void {
        // Assign viewport to userData *before* calling updateCameraProjection
        camera.userData.viewport = viewport.clone(); // Clone to avoid unexpected shared references
        this.cameras.set(id, { camera, viewport, targetEntity: null }); // Store the original viewport object here
        camera.layers.enable(RenderLayers.RENDER_LAYER);
        camera.layers.disable(RenderLayers.PLAYER_LAYER); // <<<<< Disable player layer for game cameras
        this.scene.add(camera); // Add camera to the scene
        this.updateCameraProjection(camera); // Now userData.viewport exists
    }

    getCamera(id: string): THREE.PerspectiveCamera | undefined {
        return this.cameras.get(id)?.camera;
    }

    // Call this when the renderer size changes
    setRendererSize(width: number, height: number): void {
        this.rendererSize.set(width, height);
        // Use a temporary array to store camera values to avoid iteration error
        const camerasArray = Array.from(this.cameras.values());
        for (const managedCam of camerasArray) {
            this.updateCameraProjection(managedCam.camera);
        }
    }

    private updateCameraProjection(camera: THREE.PerspectiveCamera): void {
        const aspect =
            (this.rendererSize.x * camera.userData.viewport.z) /
            (this.rendererSize.y * camera.userData.viewport.w); // Adjust aspect based on viewport dimensions
        if (!isNaN(aspect) && aspect > 0) {
            camera.aspect = aspect;
            camera.updateProjectionMatrix();
        }
    }

    // Get viewport settings for rendering
    getViewports(): ManagedCamera[] {
        return Array.from(this.cameras.values());
    }

    // --- Method to change camera mode ---
    setCameraMode(cameraId: string, mode: CameraMode, targetEntityId?: Entity) {
        const managedCam = this.cameras.get(cameraId);
        if (!managedCam) {
            console.warn(
                `CameraSystem: Cannot set mode for unknown camera ID: ${cameraId}`,
            );
            return;
        }

        let entityToModify = targetEntityId ?? managedCam.targetEntity;
        if (entityToModify === null) {
            console.warn(
                `CameraSystem: Cannot set mode for camera ${cameraId} without a target entity.`,
            );
            return;
        }

        const targetComp = this.world.getComponent(
            entityToModify,
            CameraTargetComponent,
        );
        if (targetComp) {
            console.log(
                `Setting camera mode for entity ${entityToModify} on camera ${cameraId} to ${mode}`,
            );
            targetComp.mode = mode;
            // Reset/initialize things if needed when switching modes
            if (mode !== CameraMode.FIRST_PERSON) {
                targetComp.currentDistance = targetComp.desiredDistance; // Start at desired distance
            }
            // Mark entity for potential update if mode change affects rendering immediately
            this.world.addComponent(entityToModify, new NeedsUpdateComponent());
        } else {
            console.warn(
                `CameraSystem: Target entity ${entityToModify} does not have CameraTargetComponent.`,
            );
        }
    }

    update(deltaTime: number): void {
        const targetEntities = this.world.queryEntities([
            PositionComponent,
            CameraTargetComponent,
        ]);

        // --- Assign Targets ---
        // Reset targets first
        const camerasArray = Array.from(this.cameras.values());
        for (const managedCam of camerasArray) {
            managedCam.targetEntity = null;
        }
        // Find entities that want a camera
        for (const entity of targetEntities) {
            const targetComp = this.world.getComponent(
                entity,
                CameraTargetComponent,
            )!;
            const managedCam = this.cameras.get(targetComp.cameraId);
            if (managedCam) {
                managedCam.targetEntity = entity; // Assign this entity as the target
            }
        }

        // --- Update Camera Positions ---
        this.cameras.forEach((managedCam) => {
            if (managedCam.targetEntity !== null) {
                const targetPosComp = this.world.getComponent(
                    managedCam.targetEntity,
                    PositionComponent,
                );
                const targetRotComp = this.world.getComponent(
                    managedCam.targetEntity,
                    RotationComponent,
                );
                const targetCamComp = this.world.getComponent(
                    managedCam.targetEntity,
                    CameraTargetComponent,
                );

                if (targetPosComp && targetRotComp && targetCamComp) {
                    this.cameraTargetPosition.copy(targetPosComp.value); // Base position of the target
                    this.targetLookAt
                        .copy(this.cameraTargetPosition)
                        .add(targetCamComp.lookAtOffset); // Point camera looks at

                    const camera = managedCam.camera;

                    // --- Handle Different Camera Modes ---
                    switch (targetCamComp.mode) {
                        case CameraMode.FIRST_PERSON:
                            // Apply offset in local space of the target entity
                            const worldOffset = targetCamComp.firstPersonOffset
                                .clone()
                                .applyQuaternion(targetRotComp.value);
                            camera.position
                                .copy(this.cameraTargetPosition)
                                .add(worldOffset);
                            camera.quaternion.copy(targetRotComp.value); // Look where entity looks
                            break;

                        case CameraMode.THIRD_PERSON_GLOBAL:
                        case CameraMode.THIRD_PERSON_ENTITY:
                            // Smooth current distance towards desired distance
                            const lerpFactor = 1.0 - Math.exp(-deltaTime * 10); // Exponential smoothing factor (adjust 10 for speed)
                            targetCamComp.currentDistance =
                                THREE.MathUtils.lerp(
                                    targetCamComp.currentDistance,
                                    targetCamComp.desiredDistance,
                                    lerpFactor,
                                );
                            targetCamComp.currentDistance = Math.max(
                                targetCamComp.minDistance,
                                targetCamComp.currentDistance,
                            ); // Clamp min distance

                            // Calculate ideal camera position based on orbit angles and smoothed distance
                            this.spherical.set(
                                targetCamComp.currentDistance, // radius
                                Math.PI / 2 - targetCamComp.orbitAngles.y, // phi (polar angle from Y+ axis)
                                targetCamComp.orbitAngles.x, // theta (azimuthal angle around Y axis)
                            );
                            this.idealCameraOffset.setFromSpherical(
                                this.spherical,
                            );

                            if (
                                targetCamComp.mode ===
                                CameraMode.THIRD_PERSON_ENTITY
                            ) {
                                // Rotate offset by entity's rotation *before* adding to position
                                this.idealCameraOffset.applyQuaternion(
                                    targetRotComp.value,
                                );
                            }

                            this.idealCameraPosition
                                .copy(this.cameraTargetPosition)
                                .add(this.idealCameraOffset);

                            // --- Camera Collision ---
                            let finalCameraPosition = this.idealCameraPosition;
                            if (this.worldOctree) {
                                const rayDirection = new THREE.Vector3()
                                    .subVectors(
                                        this.idealCameraPosition,
                                        this.targetLookAt,
                                    )
                                    .normalize();
                                // Set up the raycaster originating from the lookAt point towards the ideal camera position
                                this.raycaster.set(
                                    this.targetLookAt,
                                    rayDirection,
                                );
                                this.raycaster.far =
                                    targetCamComp.currentDistance +
                                    targetCamComp.collisionBuffer; // Check up to desired dist + buffer
                                this.raycaster.near = 0.1;

                                // CORRECT: Call the intersection method ON the Octree instance
                                const intersects =
                                    this.worldOctree.rayIntersect(
                                        this.raycaster.ray,
                                    );

                                if (intersects) {
                                    // Octree.rayIntersect returns a single intersection object or null
                                    // Find closest intersection (it returns only the first/closest hit)
                                    const closestHit = intersects;
                                    // Move camera slightly in front of the collision point
                                    const collisionDistance =
                                        closestHit.distance -
                                        targetCamComp.collisionBuffer;
                                    finalCameraPosition = this.targetLookAt
                                        .clone()
                                        .addScaledVector(
                                            rayDirection,
                                            Math.max(
                                                targetCamComp.minDistance,
                                                Math.min(
                                                    targetCamComp.currentDistance,
                                                    collisionDistance,
                                                ),
                                            ),
                                        );
                                    // Update current distance based on collision, but allow lerping
                                    targetCamComp.currentDistance = Math.min(
                                        targetCamComp.currentDistance,
                                        collisionDistance,
                                    );
                                } else {
                                    // No collision, use ideal position
                                    finalCameraPosition =
                                        this.idealCameraPosition;
                                    // Let currentDistance lerp towards desiredDistance naturally (already handled before this block)
                                }
                            }

                            // Apply final position (smoothed optional)
                            camera.position.lerp(
                                finalCameraPosition,
                                lerpFactor,
                            ); // Smooth position changes
                            // Always look at the target offset point
                            camera.lookAt(this.targetLookAt);
                            break;
                    }
                    // Store viewport (unchanged)
                    camera.userData.viewport = managedCam.viewport;
                }
            }
        });
    }

    // --- Functions to manage split screen ---
    setSingleScreen(cameraId: string = 'main'): void {
        const mainCam = this.cameras.get(cameraId);
        if (mainCam) {
            mainCam.viewport.set(0, 0, 1, 1);
            // Disable other cameras' viewports (set width/height to 0)
            this.cameras.forEach((cam, id) => {
                if (id !== cameraId) {
                    cam.viewport.set(0, 0, 0, 0); // Effectively hide it
                }
                this.updateCameraProjection(cam.camera);
            });
        }
    }

    setTwoPlayerSplitScreen(
        camId1: string = 'main',
        camId2: string = 'npc1',
    ): void {
        const cam1 = this.cameras.get(camId1);
        const cam2 = this.cameras.get(camId2);

        if (cam1) {
            cam1.viewport.set(0, 0, 0.5, 1);
            this.updateCameraProjection(cam1.camera);
        } // Left half
        if (cam2) {
            cam2.viewport.set(0.5, 0, 0.5, 1);
            this.updateCameraProjection(cam2.camera);
        } // Right half

        // Disable others
        this.cameras.forEach((cam, id) => {
            if (id !== camId1 && id !== camId2) {
                cam.viewport.set(0, 0, 0, 0);
                this.updateCameraProjection(cam.camera);
            }
        });
    }
}
