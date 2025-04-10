// src/renderer/core/types/input.ts
import { InputAction } from '@shared/core/InputActions';
import { AppAction } from '@shared/core';

// Type for the loaded configuration (can map to either enum)
export type KeyMappingConfig = Record<string, InputAction | AppAction>;

// Type for the current state of InputActions
export type ActionStates = Map<InputAction, boolean>;
