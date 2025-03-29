// src/renderer/main.ts
import * as THREE from 'three';
import {World} from '@ecs/World';
import {GameLoop} from '@core/GameLoop';
import {setupScene} from '@setup/sceneSetup';
import {setupECS} from '@setup/ecsSetup';
import {setupWorld} from '@setup/worldSetup';
import {
    CameraMode,
    CameraTargetComponent,
    ColliderComponent,
    InputControllableComponent,
    PlayerControlledComponent
} from "@ecs/components";
import {AppAction} from '@core/AppActions';
import {appEventManager} from '@core/AppEventManager'; // Import the singleton instance
import {InputManager} from '@core/InputManager';
import {physicsConfigManager} from '@core/PhysicsConfigManager';
import { ipcRenderer } from 'electron';

// --- Basic Setup ---
const container = document.getElementById('container');
if (!container) throw new Error('Container element not found');

// --- App Event Manager Setup ---
// const eventManager = new AppEventManager(); // If not using singleton
const eventManager = appEventManager; // Use the singleton instance

const {scene, camera: initialCamera, renderer, cleanup: cleanupScene} = setupScene(container);

// --- Input Manager Setup ---
// Pass eventManager instance to InputManager constructor
const inputManager = new InputManager(container, eventManager);


// --- ECS Setup ---
const world = new World();
const {cameraSystem, collisionSystem, inputSystem /* or however you get it */} = setupECS(
    world,
    scene,
    renderer,
    inputManager, // Pass the manager instead of the container
    physicsConfigManager, // Pass the manager
);

// --- Camera Management ---
// Add the initial camera and potentially others for split screen / NPCs
cameraSystem.addCamera('main', initialCamera); // Register the default camera
// Add a second camera for potential split screen (e.g., following NPC1)
const npcCamera = initialCamera.clone();
cameraSystem.addCamera('npc1', npcCamera, new THREE.Vector4(0.5, 0, 0.5, 1)); // Initially viewport on right

// --- Initial Camera/Screen Setup ---
// Set initial renderer size for cameras
cameraSystem.setRendererSize(window.innerWidth, window.innerHeight);
cameraSystem.setSingleScreen('main'); // Start showing only the main camera view

// Add resize handler that updates camera system
window.addEventListener('resize', () => {
    cameraSystem.setRendererSize(window.innerWidth, window.innerHeight);
});


// --- Game Loop ---
// RenderSystem is already part of the world update loop
const gameLoop = new GameLoop(world);

// --- Define App Action Handlers ---

// Toggle HUDs (Example - assumes you have corresponding systems/logic)
let isDebugHudVisible = true; // Keep track of state
const debugHudElement = document.getElementById('debug-hud');
eventManager.on(AppAction.TOGGLE_DEBUG_HUD, () => {
    isDebugHudVisible = !isDebugHudVisible;
    if (debugHudElement) {
        debugHudElement.style.display = isDebugHudVisible ? 'block' : 'none'; // Or toggle a class
    }
    console.log("Debug HUD toggled:", isDebugHudVisible);
});
// Add similar handler for TOGGLE_MAP_HUD

// Pause Game
eventManager.on(AppAction.PAUSE_GAME, () => {
    gameLoop.togglePause(); // Add a togglePause method to GameLoop
    console.log("Game Paused:", gameLoop.isPaused()); // Add isPaused method
    // Optional: Show/hide a pause menu overlay
});


// Switch Player Control
eventManager.on(AppAction.SWITCH_PLAYER_CONTROL, () => {
    console.log("Attempting to switch control via event...");
    // --- Paste the existing KeyP logic here ---
    const playerEntities = world.queryEntities([PlayerControlledComponent]);
    const npcEntities = world.queryEntities([CameraTargetComponent]); // Find potential NPCs

    if (playerEntities.length > 0 && npcEntities.length > 0) {
        const currentPcEntity = playerEntities[0];
        // Find the NPC entity (assuming it's the first one found with CameraTarget that isn't the player)
        let targetNpcEntity = -1;
        for (const npc of npcEntities) {
            if (npc !== currentPcEntity && world.hasComponent(npc, ColliderComponent)) { // Make sure it's not player and is collidable
                targetNpcEntity = npc;
                break;
            }
        }
        if (targetNpcEntity !== -1) {
            console.log(`Switching PlayerControl from ${currentPcEntity} to ${targetNpcEntity}`);

            // Remove control from current player
            world.removeComponent(currentPcEntity, PlayerControlledComponent);
            const currentInputComp = world.getComponent(currentPcEntity, InputControllableComponent);
            if (currentInputComp) currentInputComp.pointerLocked = false; // Release pointer lock if held

            // Add control to NPC
            if (!world.hasComponent(targetNpcEntity, InputControllableComponent)) {
                world.addComponent(targetNpcEntity, new InputControllableComponent());
            }
            world.addComponent(targetNpcEntity, new PlayerControlledComponent());

            // Make the main camera follow the newly controlled entity
            const playerTargetComp = world.getComponent(currentPcEntity, CameraTargetComponent);
            const npcTargetComp = world.getComponent(targetNpcEntity, CameraTargetComponent);

            if (playerTargetComp && playerTargetComp.cameraId === 'main') {
                world.removeComponent(currentPcEntity, CameraTargetComponent);
            }
            if (!npcTargetComp || npcTargetComp.cameraId !== 'main') {
                // Ensure the new entity has a main camera target component
                world.addComponent(targetNpcEntity, new CameraTargetComponent('main', npcTargetComp?.offset || new THREE.Vector3(0, 0.7, 0)));
            }

            // Force pointer lock request if window focused (might need user interaction)
            setTimeout(() => container.requestPointerLock(), 100);
        }
    }
    // --- End of KeyP logic ---
});

// Camera Mode Switching
eventManager.on(AppAction.SET_CAMERA_FIRST_PERSON, () => {
    const controlled = world.queryEntities([PlayerControlledComponent])[0];
    if (controlled !== undefined) {
        cameraSystem.setCameraMode('main', CameraMode.FIRST_PERSON, controlled);
    }
});

eventManager.on(AppAction.SET_CAMERA_THIRD_PERSON_GLOBAL, () => {
    const controlled = world.queryEntities([PlayerControlledComponent])[0];
    if (controlled !== undefined) {
        cameraSystem.setCameraMode('main', CameraMode.THIRD_PERSON_GLOBAL, controlled);
    }
});

eventManager.on(AppAction.SET_CAMERA_THIRD_PERSON_ENTITY, () => {
    const controlled = world.queryEntities([PlayerControlledComponent])[0];
    if (controlled !== undefined) {
        cameraSystem.setCameraMode('main', CameraMode.THIRD_PERSON_ENTITY, controlled);
    }
});

let isSplitScreen = false; // Track split screen state
eventManager.on(AppAction.TOGGLE_SPLITSCREEN, () => {
    isSplitScreen = !isSplitScreen;
    if (isSplitScreen) {
        console.log("Setting Split Screen (Main/NPC1)");
        // Ensure both cameras exist before setting split screen
        if (cameraSystem.getCamera('main') && cameraSystem.getCamera('npc1')) {
            cameraSystem.setTwoPlayerSplitScreen('main', 'npc1');
        } else {
            console.warn("Cannot set split screen: One or both cameras (main, npc1) not found.");
            isSplitScreen = false; // Revert state if cameras missing
        }
    } else {
        console.log("Setting Single Screen (Main)");
        cameraSystem.setSingleScreen('main');
    }
});

// Optional: Cycle Camera Logic
let availableCameraIds: string[] = ['main', 'npc1']; // Example IDs
let currentCameraIndex = 0;
eventManager.on(AppAction.CYCLE_CAMERA_NEXT, () => {
    currentCameraIndex = (currentCameraIndex + 1) % availableCameraIds.length;
    const nextCamId = availableCameraIds[currentCameraIndex];
    console.log(`Cycling camera to: ${nextCamId}`);
    cameraSystem.setSingleScreen(nextCamId);
    isSplitScreen = false; // Cycling implies single screen view
});

// --- Load World Assets, Input Config, and Create Initial Entities ---
Promise.all([
    // Load input config first (or concurrently)
    inputManager.loadConfig('assets/inputConfig.json'),
    physicsConfigManager.loadConfig('assets/physicsConfig.json'), // Load physics config
    // Load world assets (depends on input config finishing if listeners needed immediately, but usually okay)
    setupWorld(world, scene, collisionSystem) // Pass collisionSystem
        .then(() => {
            // Set Octree on CameraSystem *after* world is loaded and Octree is built
            if (collisionSystem.getWorldOctree()) { // Add a getter to CollisionSystem
                cameraSystem.setWorldOctree(collisionSystem.getWorldOctree()!);
            } else {
                console.error("Failed to get World Octree from CollisionSystem for CameraSystem!");
            }
        })



]).then(() => {
    console.log("Input config and World setup complete. Starting game loop.");
    gameLoop.start();
}).catch(err => {
    console.error("Error during initial setup:", err);
});


// --- Cleanup ---
window.addEventListener('beforeunload', () => {
    gameLoop.stop();
    cleanupScene();
    console.log("Game loop stopped and scene cleaned up.");
});

// --- Exception Handling ---
// process.on('uncaughtException', (err) => {
//     console.error('Uncaught Exception:', err);
// });
//
// process.on('unhandledRejection', (reason, promise) => {
//     console.error('Unhandled Rejection at:', promise, 'reason:', reason);
// });