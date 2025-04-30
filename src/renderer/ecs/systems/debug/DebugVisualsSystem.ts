// src/renderer/ecs/systems/DebugVisualsSystem.ts
import { System } from '@ecs/System';
import { World } from '@ecs/World';
import {
    ColliderComponent,
    DebugBoundingBoxVisualComponent,
    DebugColliderVisualComponent,
    DebugPositionIndicatorComponent,
    LookDirectionComponent,
    PositionComponent,
    RenderableComponent,
} from '@ecs/components';
import * as THREE from 'three';
import { DebugLookAtComponent } from '@components/debug/DebugLookAtComponent';
import { Formatting } from '@renderer/utils/formatting';

export class DebugVisualsSystem extends System {
    private scene: THREE.Scene;
    private isEnabled: boolean = false;
    private debugVisualsGroup: THREE.Group;

    // Cache materials to avoid recreating them
    private wireframeMaterialCache: Map<
        THREE.ColorRepresentation,
        THREE.MeshBasicMaterial
    > = new Map();
    private solidMaterialCache: Map<
        THREE.ColorRepresentation,
        THREE.MeshBasicMaterial
    > = new Map();

    private tempBox = new THREE.Box3(); // Reusable Box3

    constructor(world: World, scene: THREE.Scene) {
        super(world);
        this.scene = scene;
        this.debugVisualsGroup = new THREE.Group();
        this.debugVisualsGroup.name = 'DebugVisualsGroup';
        this.scene.add(this.debugVisualsGroup);
        this.debugVisualsGroup.visible = this.isEnabled;
    }

    setEnabled(enabled: boolean): void {
        if (this.isEnabled !== enabled) {
            this.isEnabled = enabled;
            this.debugVisualsGroup.visible = enabled;
            console.log(`Debug Visuals ${enabled ? 'Enabled' : 'Disabled'}`);
            // Force create/update visuals when enabled
            if (enabled) this.forceUpdateAllVisuals();
        }
    }

    toggle(): void {
        this.setEnabled(!this.isEnabled);
    }

    // Helper to get or create debug materials
    private getWireframeMaterial(
        color: THREE.ColorRepresentation,
    ): THREE.MeshBasicMaterial {
        if (!this.wireframeMaterialCache.has(color)) {
            this.wireframeMaterialCache.set(
                color,
                new THREE.MeshBasicMaterial({
                    color: color,
                    wireframe: true,
                    depthTest: false, // Render through other objects
                    depthWrite: false,
                    transparent: true, // Needed for depthWrite=false
                    opacity: 0.7, // Slightly transparent
                }),
            );
        }
        return this.wireframeMaterialCache.get(color)!;
    }

    private getSolidMaterial(
        color: THREE.ColorRepresentation,
    ): THREE.MeshBasicMaterial {
        if (!this.solidMaterialCache.has(color)) {
            this.solidMaterialCache.set(
                color,
                new THREE.MeshBasicMaterial({
                    color: color,
                    depthTest: false,
                    depthWrite: false,
                    transparent: true,
                    opacity: 0.5,
                }),
            );
        }
        return this.solidMaterialCache.get(color)!;
    }

    // Method to force update/creation if needed when toggling on
    private forceUpdateAllVisuals(): void {
        this.updateColliderVisuals();
        this.updateBoundingBoxVisuals();
        this.updatePositionVisuals();
        this.updateLookAtVisuals();
    }

    update(deltaTime: number): void {
        // Only update visuals if enabled
        if (!this.isEnabled) {
            return;
        }
        this.updateColliderVisuals();
        this.updateBoundingBoxVisuals();
        this.updatePositionVisuals();
        this.updateLookAtVisuals();
    }

    private updateColliderVisuals(): void {
        const entities = this.world.queryEntities([
            DebugColliderVisualComponent,
            ColliderComponent,
            PositionComponent,
        ]);

        for (const entity of entities) {
            const debugComp = this.world.getComponent(
                entity,
                DebugColliderVisualComponent,
            )!;
            const colliderComp = this.world.getComponent(
                entity,
                ColliderComponent,
            )!;
            const posComp = this.world.getComponent(entity, PositionComponent)!;

            // --- Create Visual if it doesn't exist ---
            if (!debugComp.visual) {
                // --- Create a PARENT group for the visual ---
                const visualGroup = new THREE.Group();
                visualGroup.name = `DebugColliderGroup_${entity}`;
                this.debugVisualsGroup.add(visualGroup); // Add group to main debug group

                let visualMesh: THREE.Mesh | null = null;

                if (colliderComp.shape === 'capsule') {
                    const geometry = new THREE.CapsuleGeometry(
                        colliderComp.radius,
                        colliderComp.height,
                        4,
                        8,
                    );
                    const material = this.getWireframeMaterial(debugComp.color);
                    visualMesh = new THREE.Mesh(geometry, material);
                    // Apply local offset WITHIN the group
                    visualMesh.position.copy(colliderComp.offset);
                } else {
                    // Placeholder sphere if capsule fails
                    const geometry = new THREE.SphereGeometry(0.1);
                    const material = this.getWireframeMaterial(0xff00ff);
                    visualMesh = new THREE.Mesh(geometry, material);
                    console.warn(
                        `Debug visual for collider shape '${colliderComp.shape}' not implemented. Using placeholder.`,
                    );
                }
                if (visualMesh) {
                    visualGroup.add(visualMesh); // Add the actual shape mesh to the group
                    debugComp.visual = visualGroup; // Store reference to the GROUP
                }
            }

            // --- Update Transform ---
            // The visual's *world* position should match the entity's logical position
            // The local offset is handled inside the visual's mesh creation/positioning
            if (debugComp.visual) {
                debugComp.visual.position.copy(posComp.value);
                // Rotation is usually identity for capsules relative to parent, unless colliderComp has rotation
            }
        }
        // TODO: Handle removal if DebugColliderVisualComponent or ColliderComponent is removed
    }

    private updateBoundingBoxVisuals(): void {
        const entities = this.world.queryEntities([
            DebugBoundingBoxVisualComponent,
            RenderableComponent,
        ]);

        for (const entity of entities) {
            const debugComp = this.world.getComponent(
                entity,
                DebugBoundingBoxVisualComponent,
            )!;
            const renderableComp = this.world.getComponent(
                entity,
                RenderableComponent,
            )!;
            const targetObject = renderableComp.object3D; // The object whose bounds we want

            // --- Create Helper if it doesn't exist ---
            if (!debugComp.visual) {
                // Box3Helper needs a Box3 and a color
                const box = new THREE.Box3(); // We'll update this box
                debugComp.visual = new THREE.Box3Helper(
                    box,
                    debugComp.color as THREE.Color,
                );

                if (Array.isArray(debugComp.visual.material)) {
                    debugComp.visual.material.forEach((material) => {
                        material.depthTest = false; // Render through
                        material.depthWrite = false;
                        material.transparent = true;
                    });
                } else {
                    debugComp.visual.material.depthTest = false; // Render through
                    debugComp.visual.material.depthWrite = false;
                    debugComp.visual.material.transparent = true;
                }
                debugComp.visual.name = `DebugBBox_${entity}`;
                this.debugVisualsGroup.add(debugComp.visual);
            }

            // --- Update Bounding Box and Helper ---
            // Important: Calculate box in WORLD space, then apply to helper
            this.tempBox.setFromObject(targetObject, true); // true = precise calculation using geometry

            if (!this.tempBox.isEmpty()) {
                debugComp.visual.box.copy(this.tempBox);
                debugComp.visual.visible = true;
            } else {
                debugComp.visual.visible = false; // Hide if box is empty (e.g., object not ready)
            }
            // Box3Helper automatically uses the world matrix of the object it's visualizing,
            // so we don't need to set its position/rotation separately. It aligns itself.
        }
        // TODO: Handle removal
    }

    private updatePositionVisuals(): void {
        const entities = this.world.queryEntities([
            DebugPositionIndicatorComponent,
            PositionComponent,
        ]);

        for (const entity of entities) {
            const debugComp = this.world.getComponent(
                entity,
                DebugPositionIndicatorComponent,
            )!;
            const posComp = this.world.getComponent(entity, PositionComponent)!;

            // --- Create Visual if it doesn't exist ---
            if (!debugComp.visual) {
                const geometry = new THREE.SphereGeometry(debugComp.size, 8, 8);
                // const geometry = new THREE.BoxGeometry(debugComp.size, debugComp.size, debugComp.size);
                const material = this.getSolidMaterial(debugComp.color);
                debugComp.visual = new THREE.Mesh(geometry, material);
                debugComp.visual.name = `DebugPosition_${entity}`;
                this.debugVisualsGroup.add(debugComp.visual);
            }

            // --- Update Position ---
            debugComp.visual.position.copy(posComp.value); // Place directly at the entity's logical position
        }
        // TODO: Handle removal
    }

    private updateLookAtVisuals(): void {
        const entities = this.world.queryEntities([
            DebugLookAtComponent,
            PositionComponent,
            LookDirectionComponent,
        ]);

        for (const entity of entities) {
            const debugComp = this.world.getComponent(
                entity,
                DebugLookAtComponent,
            )!;
            const posComp = this.world.getComponent(entity, PositionComponent)!;
            const lookDirComp = this.world.getComponent(
                entity,
                LookDirectionComponent,
            )!;
            //console.dir(lookDirComp);

            if (!this.debugVisualsGroup.getObjectById(debugComp.visual.id)) {
                this.debugVisualsGroup.add(debugComp.visual);
            }

            // --- Update Position ---
            debugComp.visual.position
                .copy(posComp.value)
                .add(new THREE.Vector3(0, 1.75, 0));
            const direction = new THREE.Vector3(0, 0, 1);
            // debugComp.visual.setDirection(
            //     direction.applyQuaternion(lookDirComp.value),
            // );
            // console.log(
            //     `debugComp setting position to ${Formatting.fVec3(posComp.value)} and direction to ${Formatting.fVec3(direction.applyQuaternion(lookDirComp.value))}`,
            // );
        }
        // TODO: Handle removal
    }
}
