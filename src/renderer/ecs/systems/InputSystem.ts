// src/renderer/ecs/systems/InputSystem.ts
import { System, World } from '@renderer/ecs';
import {
    InputControllableComponent,
    PlayerControlledComponent,
} from '@ecs/components';
import { InputManager } from '@core/InputManager';
import { InputAction } from '@shared/core/InputActions';
import { serializeForConsole } from '@shared/core/utils';
import { Serializer } from '@shared/serialization/Serializer';

export class InputSystem extends System {
    // Remove internal key/mouse state, keep only manager reference
    // private keys: { [key: string]: boolean } = {};
    // private mouseDelta = { x: 0, y: 0 };
    // private pointerLocked = false;
    // private targetElement: HTMLElement;

    constructor(
        world: World,
        private inputManager: InputManager,
    ) {
        super(world);
        // No need to init listeners here, InputManager does it
    }

    public getInputManager(): InputManager {
        return this.inputManager;
    }

    // No need for initEventListeners or updatePointerLockState here

    update(deltaTime: number): void {
        const controlledEntities = this.world.queryEntities([
            PlayerControlledComponent,
            InputControllableComponent,
        ]);

        // Get latest mouse delta for this frame
        const currentMouseDelta = controlledEntities.length
            ? this.inputManager.consumeMouseDelta()
            : { x: 0, y: 0 };

        // Assume only one player-controlled entity at a time
        if (controlledEntities.length > 0) {


            if (Math.random() < 0.05)
                console.log(serializeForConsole(Serializer.serialize(controlledEntities.length)));

            const entity = controlledEntities[0];
            const input = this.world.getComponent(
                entity,
                InputControllableComponent,
            )!;

            // Update action states based on InputManager state
            input.actions.forward = this.inputManager.getActionState(
                InputAction.MOVE_FORWARD,
            );
            input.actions.backward = this.inputManager.getActionState(
                InputAction.MOVE_BACKWARD,
            );
            input.actions.left = this.inputManager.getActionState(
                InputAction.MOVE_LEFT,
            );
            input.actions.right = this.inputManager.getActionState(
                InputAction.MOVE_RIGHT,
            );
            input.actions.jump = this.inputManager.getActionState(
                InputAction.JUMP,
            );
            input.actions.run = this.inputManager.getActionState(
                InputAction.RUN,
            );
            input.actions.crouch = this.inputManager.getActionState(
                InputAction.CROUCH,
            );
            input.actions.orbitLeft = this.inputManager.getActionState(
                InputAction.ORBIT_LEFT,
            );
            input.actions.orbitRight = this.inputManager.getActionState(
                InputAction.ORBIT_RIGHT,
            );
            input.actions.rotateLeft = this.inputManager.getActionState(
                InputAction.ROTATE_LEFT,
            );
            input.actions.rotateRight = this.inputManager.getActionState(
                InputAction.ROTATE_RIGHT,
            );
            // Add other actions like INTERACT if needed

            // Apply mouse delta and pointer lock status from InputManager
            input.mouseDelta.x = currentMouseDelta.x;
            input.mouseDelta.y = currentMouseDelta.y;
            input.pointerLocked = this.inputManager.pointerLocked;
        }
    }

    // No need for destroy method here unless InputSystem itself allocates resources
}
