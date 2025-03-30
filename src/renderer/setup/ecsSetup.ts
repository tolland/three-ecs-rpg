import { World } from '@ecs/World';
import {
    AnimationSystem,
    CameraSystem,
    CollisionSystem,
    DebugVisualsSystem,
    InputSystem,
    PhysicsSystem,
    PlayerControlSystem,
    RenderSystem,
} from '@ecs/systems';
import { Scene, WebGLRenderer } from 'three';
import { InputManager } from '@core/InputManager';
import { DebugHUDSystem } from '@systems/DebugHUDSystem';
import { PhysicsConfigManager } from '@core/PhysicsConfigManager';
import { PhysicsHUD } from '@systems/PhysicsHUD';
import { WindSystem } from '@systems/WindSystem';
import { AttachmentSystem } from '@systems/AttachmentSystem';

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
} {
    // Return systems that might be needed elsewhere

    // --- Create Systems ---
    const cameraSystem = new CameraSystem(world, scene);
    const inputSystem = new InputSystem(world, inputManager); // Pass container for pointer lock
    const playerControlSystem = new PlayerControlSystem(
        world,
        physicsConfigManager,
    );
    const windSystem = new WindSystem(world);
    const physicsSystem = new PhysicsSystem(world, physicsConfigManager);
    const collisionSystem = new CollisionSystem(world); // Needs Octree set later
    const animationSystem = new AnimationSystem(world);
    const attachmentSystem = new AttachmentSystem(world); // Create attachment system
    const debugVisualsSystem = new DebugVisualsSystem(world, scene); // Instantiate
    const hudSystem = new DebugHUDSystem(world);
    const physicsHUD = new PhysicsHUD(world);
    const renderSystem = new RenderSystem(world, scene, renderer, cameraSystem); // Pass cameraSystem

    // --- Add Systems to World (Order can matter!) ---
    // 1. Input: Gather user input.
    // 2. Player Control: Convert input to velocity/rotation changes.
    // 3. Physics: Apply gravity, update position based on velocity.
    // 4. Collision: Detect collisions, resolve positions, update velocity (sliding), mark ground status.
    // 5. Camera: Update camera positions based on targets (after collision resolution).
    // 6. Render: Update Three.js objects and render the scene.
    world.addSystem(inputSystem);
    world.addSystem(playerControlSystem);
    world.addSystem(windSystem);
    world.addSystem(physicsSystem);
    world.addSystem(collisionSystem);
    world.addSystem(cameraSystem);
    world.addSystem(animationSystem);
    world.addSystem(attachmentSystem);
    world.addSystem(debugVisualsSystem); // Add BEFORE RenderSystem
    world.addSystem(renderSystem);
    // world.addSystem(hudSystem);
    world.addSystem(physicsHUD);

    // Return key systems needed externally (e.g., for setting octree, resizing)
    return { cameraSystem, collisionSystem, inputSystem, debugVisualsSystem }; // Add collisionSystem here
}
