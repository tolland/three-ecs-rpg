// src/shared/core/AppActions.ts
export enum AppAction {
    TOGGLE_DEBUG_HUD = 'TOGGLE_DEBUG_HUD',
    TOGGLE_MAP_HUD = 'TOGGLE_MAP_HUD', // Assuming you might add an HTML map HUD later
    TOGGLE_ENTITY_OUTLINES = 'TOGGLE_ENTITY_OUTLINES', // Placeholder for future feature
    PAUSE_GAME = 'PAUSE_GAME',
    SWITCH_PLAYER_CONTROL = 'SWITCH_PLAYER_CONTROL', // The 'P' key logic

    // Camera Controls (could be combined or separate)
    SET_CAMERA_MAIN = 'SET_CAMERA_MAIN',
    SET_CAMERA_NPC1 = 'SET_CAMERA_NPC1', // Or cycle next/prev?
    CYCLE_CAMERA_NEXT = 'CYCLE_CAMERA_NEXT', // Alternative camera control
    SET_CAMERA_FIRST_PERSON = 'SET_CAMERA_FIRST_PERSON', // Can reuse SET_CAMERA_MAIN if desired
    SET_CAMERA_THIRD_PERSON_GLOBAL = 'SET_CAMERA_THIRD_PERSON_GLOBAL',
    SET_CAMERA_THIRD_PERSON_ENTITY = 'SET_CAMERA_THIRD_PERSON_ENTITY',
    TOGGLE_DEBUG_VISUALS = 'TOGGLE_DEBUG_VISUALS', // New or reused action
    ENTITY_COLLISION_IMPACT = 'ENTITY_COLLISION_IMPACT',
    PLAYER_ACTION = 'PLAYER_ACTION',
    AREA_TRIGGER_ENTER = 'AREA_TRIGGER_ENTER',
    AREA_TRIGGER_EXIT = 'AREA_TRIGGER_EXIT',
    TOGGLE_GOD_MODE = 'TOGGLE_GOD_MODE',
    INCREASE_TIME_SCALE = 'INCREASE_TIME_SCALE',
    DECREASE_TIME_SCALE = 'DECREASE_TIME_SCALE',
    RESET_TIME_SCALE = 'RESET_TIME_SCALE',
    RELOAD = 'RELOAD',
    FORCE_RELOAD = 'FORCE_RELOAD',
    TOGGLE_SPLITSCREEN = 'TOGGLE_SPLITSCREEN',
    SPLITSCREEN_HORIZONTAL = 'SPLITSCREEN_HORIZONTAL',
    SPLITSCREEN_VERTICAL = 'SPLITSCREEN_VERTICAL',
    VIEWPORT_SPLIT_HORIZONTAL = 'VIEWPORT_SPLIT_HORIZONTAL',
    VIEWPORT_SPLIT_VERTICAL = 'VIEWPORT_SPLIT_VERTICAL',
    // Merge the focused viewport's parent
    VIEWPORT_MERGE_FOCUSED = 'VIEWPORT_MERGE_FOCUSED',
    // Cycle focus to next viewport
    VIEWPORT_CYCLE_FOCUS = 'VIEWPORT_CYCLE_FOCUS',
    // Set focus directly (e.g., by clicking) payload: { viewportId: ViewportID }
    VIEWPORT_SET_FOCUS = 'VIEWPORT_SET_FOCUS',

    VIEW_CYCLE_ENTITY = 'VIEW_CYCLE_ENTITY', // Cycle entity in focused view
    VIEW_CYCLE_MODE = 'VIEW_CYCLE_MODE', // Cycle camera mode in focused view
    VIEW_SET_ENTITY = 'VIEW_SET_ENTITY', // Set specific entity payload: { viewConfigId: ViewConfigID, entityId: Entity | null }
    VIEW_SET_MODE = 'VIEW_SET_MODE', // Set specific mode payload: { viewConfigId: ViewConfigID, mode: CameraMode | 'FREECAM' }
    QUITTING = 'QUITTING', // try and cleanup before quitting
    QUIT = 'QUIT', // quit the app
    // --- internalapp events ---
    CONFIG_CHANGED = 'CONFIG_CHANGED',
    LAYOUT_UPDATED = 'LAYOUT_UPDATED',

}
