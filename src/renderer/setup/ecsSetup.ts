// src/renderer/setup/ecsSetup.ts
import { World } from '@ecs/World';
import {
    AnimationSystem,
    CameraSystem,
    CollisionSystem,
    DebugVisualsSystem,
    FreecamControlSystem,
    InputSystem,
    PhysicsSystem,
    PlayerControlSystem,
    RenderSystem,
    ViewportLayoutSystem,
} from '@ecs/systems';
import { Scene, WebGLRenderer } from 'three';
import { InputManager } from '@core/InputManager';
import { DebugHUDSystem } from '@systems/debug/DebugHUDSystem';
import { PhysicsConfigManager } from '@core/PhysicsConfigManager';
import { PhysicsHUD } from '@systems/hud/PhysicsHUD';
import { WindSystem } from '@systems/WindSystem';
import { AttachmentSystem } from '@systems/AttachmentSystem';
import { appEventManager } from '@renderer/core';
import { AreaTriggerSystem } from '@systems/AreaTriggerSystem';
import { AudioSystem } from '@systems/audio/AudioSystem';
import { ForceBasedGravitySystem } from '@systems/force/ForceBasedGravitySystem';
import { SpeedHUDSystem } from '@systems/hud/SpeedHUDSystem';
import * as F from '@renderer/utils/chalkColors';

export function setupECS(
    world: World,
    scene: Scene,
    renderer: WebGLRenderer,
    inputManager: InputManager,
    physicsConfigManager: PhysicsConfigManager, // Pass the manager
): {
    cameraSystem: CameraSystem;
    collisionSystem: CollisionSystem;
    inputSystem: InputSystem;
    debugVisualsSystem: DebugVisualsSystem;
    viewPortLayoutSystem: ViewportLayoutSystem;
} {
    // Return systems that might be needed elsewhere

    console.log(
        `${F.contrastGreenOnBlack('setupECS')}: starting setupECS`,
    );

    // --- Create Systems ---
    const viewPortLayoutSystem = new ViewportLayoutSystem(world);
    const cameraSystem = new CameraSystem(world, scene);
    const inputSystem = new InputSystem(world, inputManager); // Pass container for pointer lock
    const playerControlSystem = new PlayerControlSystem(
        world,
        physicsConfigManager,
        appEventManager,
    );
    const freecamControlSystem = new FreecamControlSystem(world);
    const windSystem = new WindSystem(world);
    const gravitySystem = new ForceBasedGravitySystem(
        world,
        physicsConfigManager,
    ); // <<< CHOOSE THIS#

    // const gravitySystem = new VelocityGravitySystem(world, physicsConfigManager); // <<< OR THIS
    const physicsSystem = new PhysicsSystem(world, physicsConfigManager);
    const collisionSystem = new CollisionSystem(world); // Needs Octree set later
    const animationSystem = new AnimationSystem(world);
    const attachmentSystem = new AttachmentSystem(world);
    const debugVisualsSystem = new DebugVisualsSystem(world, scene); // Instantiate
    const hudSystem = new DebugHUDSystem(world);
    const speedHudSystem = new SpeedHUDSystem(world);
    const physicsHUD = new PhysicsHUD(world);
    const areaTriggerSystem = new AreaTriggerSystem(world); // Instantiate
    const audioSystem = new AudioSystem(world); // Instantiate
    const renderSystem = new RenderSystem(world, scene, renderer);

    // --- Add Systems to World (Order can matter!) ---
    // @TODO doing this first for now, but should be moved to a better place
    world.addSystem(viewPortLayoutSystem);
    // 1. Input: Gather user input.
    world.addSystem(inputSystem);
    // 2. Player Control: Convert input to velocity/rotation changes.
    world.addSystem(playerControlSystem);
    world.addSystem(freecamControlSystem);
    // 3. Physics: Apply gravity, update position based on velocity.
    // world.addSystem(windSystem);
    world.addSystem(gravitySystem);
    // 4. Collision: Detect collisions, resolve positions(sliding), mark ground status.
    world.addSystem(collisionSystem);
    // apply forces and update velocity
    world.addSystem(physicsSystem);
    // 5. Camera: Update camera positions based on targets (after collision resolution).
    world.addSystem(cameraSystem);
    cameraSystem.registerDependencies();
    playerControlSystem.registerDependencies();
    freecamControlSystem.registerDependencies(inputManager);
    world.addSystem(animationSystem);
    world.addSystem(attachmentSystem);
    world.addSystem(debugVisualsSystem); // Add BEFORE RenderSystem
    world.addSystem(areaTriggerSystem); // Check positions before camera/audio
    world.addSystem(audioSystem); // Listens for events, run before render
    // 6. Render: Update Three.js objects and render the scene.
    world.addSystem(renderSystem);
    renderSystem.registerDependencies();
    // 7. Display any HUD updates. Maybe this needs to be split into ingame and DOM based
    // as it seems that in-game needs to ge before render system
    // world.addSystem(hudSystem);
    world.addSystem(physicsHUD);
    world.addSystem(speedHudSystem);

    console.log(
        `${F.contrastGreenOnBlack('setupECS')}: ending setupECS`,
    );

    // Return key systems needed externally (e.g., for setting octree, resizing)
    return {
        cameraSystem,
        collisionSystem,
        inputSystem,
        debugVisualsSystem,
        viewPortLayoutSystem,
    }; // Add collisionSystem here
}
