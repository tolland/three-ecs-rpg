import { System } from '@ecs/System';
import { World } from '@ecs/World';
import {
    CameraMode,
    CameraTargetComponent,
    ColliderComponent, ForceAccumulatorComponent,
    InputControllableComponent,
    NeedsUpdateComponent,
    PlayerControlledComponent,
    RotationComponent,
    VelocityComponent,
} from '@ecs/components'; // Import CameraMode
import * as THREE from 'three';
import { PhysicsConfigManager } from '@core/PhysicsConfigManager';
import { appEventManager, AppEventManager, InputManager } from '@renderer/core';
import { InputAction } from '@core/InputActions';
import { MovementStateComponent } from '@components/MovementStateComponent';
import { CameraSystem } from '@systems/CameraSystem';

export class PlayerControlSystem extends System {
    private playerRotation = new THREE.Quaternion();
    private cameraRotationVertical = 0; // Store vertical rotation separately to clamp it
    private flyToggleDebounce = false; // Simple debounce for state toggle

    // Store reference to manager
    constructor(
        world: World,
        private physicsConfig: PhysicsConfigManager,
        private events: AppEventManager = appEventManager,
        private inputManager: InputManager,
    ) {
        super(world);
    }

    update(deltaTime: number): void {
        const entities = this.world.queryEntities([
            PlayerControlledComponent, VelocityComponent, RotationComponent,
            InputControllableComponent, MovementStateComponent,
            ForceAccumulatorComponent
        ]);

//        console.log("teset");

        if (entities.length === 0) return;

        const entity = entities[0]; // Assume one player

        const vel = this.world.getComponent(entity, VelocityComponent)!;
        const rot = this.world.getComponent(entity, RotationComponent)!;
        const input = this.world.getComponent(
            entity,
            InputControllableComponent,
        )!;
        const stateComp = this.world.getComponent(entity, MovementStateComponent)!;
        const forceComp = this.world.getComponent(entity, ForceAccumulatorComponent)!;
        const collider = this.world.getComponent(entity, ColliderComponent); // Need for jump check
        const cameraTarget = this.world.getComponent(
            entity,
            CameraTargetComponent,
        ); // Get camera target info

        // Determine current camera mode for the controlled entity
        const currentCameraMode = cameraTarget?.mode ?? CameraMode.FIRST_PERSON;

        // Get player specific config
        const playerCfg = this.physicsConfig.getPlayerConfig();
        const globalDamping = this.physicsConfig.getGlobalDamping();

        // --- State Transition Logic ---
        const isOnGround = collider?.onGround ?? false; // Read current ground status

        // Grounded state
        if (isOnGround && stateComp.state !== 'grounded') {
            stateComp.state = 'grounded';
            console.log("State -> grounded");
        }
        // Falling state (simplistic: not grounded, not jumping/flying)
        else if (!isOnGround && stateComp.state === 'grounded') {
            stateComp.state = 'falling';
            console.log("State -> falling");
        }

        // --- Flying Toggle (Example: Double-tap Jump?) ---
        // Needs better input handling (action mapping, debounce)
        // This is just placeholder logic
        const jumpPressed = input.actions.jump; // Assume 'jump' is configured
        // if (jumpPressed && !this.flyToggleDebounce) {
        //     this.flyToggleDebounce = true;
        //     if (stateComp.state === 'flying') {
        //         stateComp.state = 'falling'; // Stop flying
        //         console.log("State -> falling (stopped flying)");
        //     } else if (stateComp.state === 'falling' || stateComp.state === 'jumping') {
        //         stateComp.state = 'flying'; // Start flying
        //         vel.value.y = Math.max(0, vel.value.y); // Stop falling immediately
        //         console.log("State -> flying");
        //     }
        // } else if (!jumpPressed) {
        //     this.flyToggleDebounce = false;
        // }

        // --- Apply Forces / Control based on State ---
        let thrustForce = new THREE.Vector3();
        let movementInputActive = input.actions.forward || input.actions.backward || input.actions.left || input.actions.right;


        let worldMoveDirection = new THREE.Vector3(); // Direction relative to world/camera

        if (stateComp.state === 'flying') {
            // Flying Controls
            const flySpeed = playerCfg.runSpeed; // Use run speed for flying?
            const flyVerticalSpeed = playerCfg.walkSpeed;
            const flyDamping = 2.0; // Specific damping for flying

            // Calculate direction based on camera/entity orientation
            // Use camera forward for movement direction in flight
            const cameraQuat = new THREE.Quaternion(); // Get active camera quaternion
            const cam: THREE.PerspectiveCamera | undefined = this.world
                .getSystem<CameraSystem>(CameraSystem)
                ?.getCamera('main');
            if(cam) cam.getWorldQuaternion(cameraQuat);
            const flyForward = new THREE.Vector3(0,0,-1).applyQuaternion(cameraQuat);
            const flyRight = new THREE.Vector3(1,0,0).applyQuaternion(cameraQuat);
            const flyUp = new THREE.Vector3(0,1,0); // World up

            let flyDirection = new THREE.Vector3();
            if (input.actions.forward) flyDirection.add(flyForward);
            if (input.actions.backward) flyDirection.sub(flyForward);
            if (input.actions.left) flyDirection.sub(flyRight);
            if (input.actions.right) flyDirection.add(flyRight);
            if (input.actions.jump) flyDirection.add(flyUp); // Jump = Fly Up
            if (input.actions.run) flyDirection.sub(flyUp); // Run/Ctrl = Fly Down

            flyDirection.normalize();
            thrustForce.copy(flyDirection).multiplyScalar(flySpeed); // Apply fly speed

            // Apply flying damping force (opposite to current velocity)
            const dampingForce = vel.value.clone().multiplyScalar(-flyDamping);
            forceComp.force.add(dampingForce);

        } else {
            // Grounded/Falling/Jumping Controls (Thrust for movement)
            const targetSpeed = input.actions.run ? playerCfg.runSpeed : playerCfg.walkSpeed;
            // Calculate worldMoveDirection based on camera/player rotation (as before)
            // ... (calculate worldMoveDirection based on cameraMode) ...
            // --- Player Rotation based on Movement (Third Person) ---
            const forwardVector = new THREE.Vector3(0, 0, -1);
            const rightVector = new THREE.Vector3(1, 0, 0);

            if (currentCameraMode === CameraMode.FIRST_PERSON) {
                forwardVector.applyQuaternion(rot.value); // Use player's facing direction
                rightVector.applyQuaternion(rot.value);
            } else {
                // In third person, movement is relative to camera's horizontal rotation (azimuth)
                // Get camera's horizontal rotation quaternion
                const cameraHorizontalQuat =
                    new THREE.Quaternion().setFromAxisAngle(
                        new THREE.Vector3(0, 1, 0),
                        cameraTarget?.orbitAngles.x ?? 0,
                    );
                forwardVector.applyQuaternion(cameraHorizontalQuat);
                rightVector.applyQuaternion(cameraHorizontalQuat);
            }

            if (input.actions.forward) worldMoveDirection.add(forwardVector);
            if (input.actions.backward) worldMoveDirection.sub(forwardVector);
            if (input.actions.left) worldMoveDirection.sub(rightVector);
            if (input.actions.right) worldMoveDirection.add(rightVector);

            worldMoveDirection.y = 0; // Ignore vertical component for movement direction
            worldMoveDirection.normalize();

            if (movementInputActive) {
                // Calculate desired velocity change or force
                const currentHorizontalVel = new THREE.Vector3(vel.value.x, 0, vel.value.z);
                const desiredVel = worldMoveDirection.clone().multiplyScalar(targetSpeed);
                const requiredAccel = desiredVel.sub(currentHorizontalVel).divideScalar(deltaTime); // Simplified needed accel
                const maxAccel = 20.0; // Limit acceleration force
                requiredAccel.clampLength(0, maxAccel);
                thrustForce.copy(requiredAccel); //.multiplyScalar(massComp.mass); // F=ma
            }
            // else: No input, ground friction + air damping will slow down

            // Jumping (Apply impulse as velocity change directly, or large upward force for one frame?)
            // Let's keep jump as direct velocity change for simplicity for now
            if (input.actions.jump && isOnGround) { // Use isOnGround from this frame
                vel.value.y = playerCfg.jumpForce;
                stateComp.state = 'jumping'; // Set state
                this.events.emit('PLAYER_ACTION' as any, { entityId: entity, action: 'JUMP' });
                console.log("State -> jumping");
            }
        }

        // Add calculated thrust force to accumulator
        forceComp.force.add(thrustForce);

        // Rotate player model (only if grounded/falling?)
        if (stateComp.state !== 'flying' && currentCameraMode !== CameraMode.FIRST_PERSON && movementInputActive) {
            // Smoothly rotate player model to face movement direction
            const targetRotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), worldMoveDirection);
            rot.value.slerp(targetRotation, 0.15); // Slightly slower slerp maybe
            this.world.addComponent(entity, new NeedsUpdateComponent());
        } else if (stateComp.state === 'flying' && currentCameraMode !== CameraMode.FIRST_PERSON) {
            // Optionally align player model with camera direction or velocity in flight?
            // Or keep facing forward relative to camera?
        }


        // --- Example: Say Hello Action ---
        // First, add INTERACT to InputActions enum and inputConfig.json (e.g., map to 'F')
        if (this.inputManager.getActionState(InputAction.INTERACT)) {
            // Assuming InputManager accessible or checked inputComp
            // Debounce this - only fire once per press
            // Add a simple state tracking within this system or InputControllableComponent
            // For simplicity here, we just emit:
            this.events.emit('PLAYER_ACTION' as any, {
                entityId: entity,
                action: 'SAY_HELLO',
            });
            // Need debouncing logic here to prevent spamming!
        }
    }
}
