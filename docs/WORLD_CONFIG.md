# World Configuration System

This document explains how to use the YAML-based world configuration system to define game worlds, assets, entities, and scene environments.

## Overview

The world configuration system allows you to define all aspects of a game world in a YAML file, including:

- Assets (models, sounds, textures)
- World geometry and collision
- Scene environment (lighting, fog, skybox)
- Player configuration
- Spawn points
- NPCs

This approach separates game content from code, making it easier to create, modify, and extend game worlds without changing code.

## Configuration File Structure

A world configuration file has the following sections:

```yaml
name: "World Name"
version: "1.0.0"

assets:
  # Asset definitions (models, sounds, textures)

world:
  # World model and collision settings

environment:
  # Scene environment settings (fog, lighting, skybox)

player:
  # Player configuration

spawnPoints:
  # Spawn point definitions

npcs:
  # NPC definitions

debugOptions:
  # Debug visualization options
```

### Asset Definitions

Assets are defined with a type, key, and path:

```yaml
assets:
  models:
    - type: "model"
      key: "world"
      path: "assets/low-poly_fps_map.glb"
    - type: "model"
      key: "soldier"
      path: "assets/Soldier.glb"
  
  sounds:
    - type: "sound"
      key: "jump"
      path: "assets/sounds/jump.wav"
```

### World Definition

The world section defines the main world model and collision settings:

```yaml
world:
  model: "world"  # References a model key from assets
  boundingBox:
    min: [-50, -10, -50]
    max: [50, 30, 50]
```

### Environment Settings

The environment section defines scene settings like fog, skybox, and lighting:

```yaml
environment:
  fog:
    type: "exponential"  # "linear" or "exponential"
    color: "#88ccee"
    density: 0.05  # For exponential fog
    # For linear fog, use:
    # near: 10
    # far: 100
  
  skybox:
    type: "color"  # "color", "cubemap", or "hdri"
    value: "#88ccee"  # Color value or path to cubemap/hdri
  
  ambient:
    type: "hemisphereLight"  # "ambientLight" or "hemisphereLight"
    color: "#ffffff"
    intensity: 0.8
    groundColor: "#444444"  # For hemisphere light
  
  directional:
    color: "#ffffff"
    intensity: 1.0
    position: [10, 20, 10]
    castShadow: true
    shadowMapSize: [1024, 1024]
    shadowBias: -0.0005
```

### Player Configuration

The player section defines the player entity's properties:

```yaml
player:
  model: "soldier"  # References a model key from assets
  radius: 0.35      # Collider radius
  height: 1.0       # Collider height
  mass: 70          # Physics mass
  speed: 5.0        # Movement speed
  jumpForce: 8.0    # Jump force
  sounds:
    JUMP: "jump"  # Maps sound actions to sound keys
    IMPACT_GROUND_HARD: "land_hard"
```

### Spawn Points

Spawn points define locations where entities can be instantiated:

```yaml
spawnPoints:
  - id: "default"    # Player spawn
    position: [0, 2, 5]
  - id: "npc_spawn"  # NPC spawn
    position: [5, 5, 2]
    rotation: [0, 0, 0, 1]  # Optional quaternion [x, y, z, w]
```

### NPCs

NPCs are defined similarly to the player:

```yaml
npcs:
  - id: "npc1"
    model: "soldier"  # References a model key from assets
    position: [5, 5, 2]
    mass: 70
    radius: 0.35
    height: 1.0
    behavior: "patrol"  # Optional behavior type
```

### Debug Options

Debug options control visualization helpers:

```yaml
debugOptions:
  showColliders: true
  showBoundingBoxes: true
  showSpawnPoints: true
```

## Usage in Code

To use the world configuration system:

1. Create a YAML file with your world configuration (see example in `assets/configs/world.yaml`)
2. Create a `WorldBuilder` instance and provide it with the configuration path:

```typescript
import { WorldBuilder } from '@setup/WorldBuilder';
import { worldConfigManager } from '@renderer/core';

// Create a WorldBuilder
const worldBuilder = new WorldBuilder(worldConfigManager);

// Build the world from config
await worldBuilder.buildFromConfig(
    'assets/configs/world.yaml',
    world,
    scene,
    collisionSystem,
    cameraSystem
);
```

## Extending the System

You can extend the configuration system by:

1. Adding new sections to the YAML schema
2. Updating the interfaces in `WorldConfigManager.ts`
3. Adding processing logic in the `WorldBuilder` class

For example, to add a weather system:

1. Add a `weather` section to your YAML:

```yaml
weather:
  type: "rain"
  intensity: 0.5
  wind: [1, 0, 0]
```

2. Update the `WorldConfig` interface:

```typescript
export interface WeatherConfig {
    type: 'rain' | 'snow' | 'fog';
    intensity: number;
    wind: [number, number, number];
}

export interface WorldConfig {
    // ... existing properties
    weather?: WeatherConfig;
}
```

3. Add weather processing to the `WorldBuilder`:

```typescript
private setupWeather(scene: Scene): void {
    if (!this.worldConfig || !this.worldConfig.weather) return;
    
    // Implement weather system based on config
    // ...
}
```