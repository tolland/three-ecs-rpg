/**
 * Generic utility for setting defaults for any options object
 * @param defaults Default values
 * @param options User provided options (overrides defaults)
 * @returns Options with defaults applied
 */
export function withDefaults<T extends object>(defaults: T, options: Partial<T>): T {
  return { ...defaults, ...options };
}

// Usage example with PlayerOptions:
// const playerOpts = withDefaults(
//   { ...DEFAULT_PLAYER_OPTIONS, position: new THREE.Vector3() },
//   { position: new THREE.Vector3(1, 2, 3), isControlled: true }
// );