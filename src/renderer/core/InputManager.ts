// src/renderer/core/InputManager.ts
import { InputAction } from '@shared/core/InputActions';
import { AppAction } from '@shared/core';
import { AppEventManager } from './AppEventManager';
import { serializeForConsole } from '@renderer/utils/formatting';
import { Serializer } from '@shared/serialization/Serializer';
import { ActionStates, KeyMappingConfig } from '@core/types';



/**
 * This is the InputManager class that handles input events and maps them to actions.
 * It uses a configuration file to load key mappings and manages the state of input actions. It is eetting flags for the various inputs that it is managing.
 * It also handles mouse movement and pointer lock state.
 *
 */
export class InputManager {
    private keyToActionMap: Map<string, InputAction> = new Map();
    private keyToAppActionMap: Map<string, AppAction> = new Map(); // Separate map for app actions
    private actionStates: ActionStates = new Map();
    private targetElement: HTMLElement;
    private appEventManager: AppEventManager; // Reference to the event manager

    // Mouse state (can also be managed here or stay in InputSystem)
    public mouseDelta = { x: 0, y: 0 };
    public pointerLocked = false;
    private unconsumedMouseDelta = { x: 0, y: 0 };

    private isInitialized = false;

    // Inject AppEventManager
    constructor(targetElement: HTMLElement, appEventManager: AppEventManager) {
        this.targetElement = targetElement;
        this.appEventManager = appEventManager;
        // Initialize only InputAction states to false
        Object.values(InputAction).forEach((action) => {
            this.actionStates.set(action, false);
        });
    }

    async loadConfig(configPath: string): Promise<void> {
        try {
            const response = await fetch(configPath);
            if (!response.ok) {
                throw new Error(
                    `Failed to load input config: ${response.statusText}`,
                );
            }
            const config: KeyMappingConfig = await response.json();

            this.keyToActionMap.clear();
            this.keyToAppActionMap.clear(); // Clear app action map too

            for (const [keyCode, actionName] of Object.entries(config)) {
                // Check if it's an InputAction
                if (
                    Object.values(InputAction).includes(
                        actionName as InputAction,
                    )
                ) {
                    this.keyToActionMap.set(keyCode, actionName as InputAction);
                }
                // Check if it's an AppAction
                else if (
                    Object.values(AppAction).includes(actionName as AppAction)
                ) {
                    this.keyToAppActionMap.set(
                        keyCode,
                        actionName as AppAction,
                    );
                } else {
                    console.warn(
                        `Input Config: Unknown action '${actionName}' defined for key '${keyCode}'`,
                    );
                }
            }
            console.log('Input configuration loaded.');
            this.isInitialized = true;
            this.setupEventListeners();
        } catch (error) {
            console.error('Error loading or parsing input config:', error);
            this.isInitialized = false;
        }
    }

    private setupEventListeners(): void {
        if (!this.isInitialized) return;

        // Using arrow functions to preserve 'this' context
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);

        document.addEventListener(
            'pointerlockchange',
            this.handlePointerLockChange,
        );
        document.addEventListener('mousemove', this.handleMouseMove);

        // Consider moving click listener out if only used for initial lock
        this.targetElement.addEventListener('click', this.requestPointerLock);
    }

    destroy(): void {
        // Important: Remove listeners to prevent memory leaks
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        document.removeEventListener(
            'pointerlockchange',
            this.handlePointerLockChange,
        );
        document.removeEventListener('mousemove', this.handleMouseMove);
        this.targetElement.removeEventListener(
            'click',
            this.requestPointerLock,
        );
    }

    // --- Event Handlers ---
    private handleKeyDown: (event: KeyboardEvent) => void = (event: KeyboardEvent): void => {
        if (event.repeat) return; // Ignore key repeats for triggering events

        const inputAction = this.keyToActionMap.get(event.code);
        const appAction = this.keyToAppActionMap.get(event.code);

        console.log(`Key pressed: ${event.code}, Action: ${inputAction || appAction}`); // Debug
        console.log(serializeForConsole(Serializer.serialize(event)));

        if (inputAction) {
            this.actionStates.set(inputAction, true);
        } else if (appAction) {
            // Emit event for AppActions on key down
            this.appEventManager.emit(appAction);
        }
    };

    private handleKeyUp = (event: KeyboardEvent): void => {
        const action = this.keyToActionMap.get(event.code);
        if (action) {
            this.actionStates.set(action, false);
            // console.log(`Action ${action} ended`); // Debug
        }
    };

    private handlePointerLockChange = (): void => {
        this.pointerLocked = document.pointerLockElement === this.targetElement;
        if (!this.pointerLocked) {
            // Optional: Reset movement states when pointer lock is lost?
            this.actionStates.forEach((_, key) => this.actionStates.set(key, false));
            this.unconsumedMouseDelta.x = 0;
            this.unconsumedMouseDelta.y = 0;
        }
    };

    private handleMouseMove = (event: MouseEvent): void => {
        if (this.pointerLocked) {
            // Accumulate mouse movement
            this.unconsumedMouseDelta.x += event.movementX;
            this.unconsumedMouseDelta.y += event.movementY;
        }
    };

    private requestPointerLock = (): void => {
        if (!this.pointerLocked) {
            this.targetElement.requestPointerLock();
        }
    };

    // --- Public Accessors ---
    /**
     * Checks the current state of a specific action (e.g., is JUMP pressed?).
     */
    public getActionState(action: InputAction): boolean {
        return this.actionStates.get(action) ?? false;
    }

    /**
     * Gets the accumulated mouse delta since the last call and resets the accumulator.
     * Call this once per frame (e.g., in InputSystem).
     */
    public consumeMouseDelta(): { x: number; y: number } {
        const delta = { ...this.unconsumedMouseDelta };
        this.unconsumedMouseDelta.x = 0;
        this.unconsumedMouseDelta.y = 0;
        return delta;
    }
}
