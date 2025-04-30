// src/renderer/ecs/systems/controls/InputSystem.ts
import { System, World } from '@ecs/index';
import {
    InputControllableComponent,
    PlayerControlComponent,
} from '@ecs/components';
import { InputManager } from '@core/InputManager';
import { InputAction } from '@shared/core/InputActions';
import { LogManager } from '@renderer/utils/ManagerLogger';

@LogManager()
export class InputSystem extends System {
    constructor(
        world: World,
        private inputManager: InputManager,
    ) {
        super(world);
    }

    update(deltaTime: number): void {
        const controlledEntities = this.world.queryEntities([
            InputControllableComponent, // entity can receive inputs
            PlayerControlComponent, // entity is actively being controlled
        ]);

        // Get latest mouse delta for this frame
        const currentMouseDelta = this.inputManager.consumeMouseDelta();

        if (controlledEntities.length > 1) {
            console.warn(
                `InputSystem: More than one player controlled entity found or entity mismatch! ${controlledEntities.length}`,
            );
        }

        // Assume only one player-controlled entity at a time
        for (const entity of controlledEntities) {
            // if (Math.random() < 0.05)
            //     console.log(serializeForConsole(Serializer.serialize(controlledEntities.length)));
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
}
