import { World } from '@ecs/World';
import { GameLoop } from '@core/GameLoop';
import { setupECS } from '@setup/ecsSetup';

import {
    AppEventManager,
    appEventManager,
    InputManager,
    worldConfigManager,
} from '@renderer/core';
import { physicsConfigManager } from '@core/PhysicsConfigManager';
import { UberConfigManager } from '@core/UberConfigManager';
import { simulationConfigManager } from '@core/SimulationConfigManager';
import { DEBUG_OBJ2 } from '@renderer/utils/debug';
import { cleanup as cleanupScene, renderer, scene } from '@core/sceneManager';
import { setupIpc } from '@setup/ipcSetup';
import { initAppEventManager } from '@renderer/logic/AppEventManager';
import { FocusManager } from '@core/FocusManager';
import { createInitialView } from '@renderer/prefabs/initialView';
import { WorldBuilder } from '@setup/WorldBuilder';
import { setupFileMenuListeners } from '@setup/menu_ipc';
import { initDebugTools } from '@renderer/debugTools';
import { audioManager } from '@core/AudioManager';

// Declare cleanup listeners
let cleanupControlListener: (() => void) | undefined;
let cleanupConfigListener: (() => void) | undefined;

// --- Basic Setup ---
const container = document.getElementById('container');
if (!container) throw new Error('Container element not found');

// --- App Event Manager Setup ---
const eventManager: AppEventManager = appEventManager;

// --- Input Manager Setup ---
const inputManager = new InputManager(container, eventManager);

// --- Focus Manager ---
const focusManager = new FocusManager();

// --- ECS Setup ---
const world = new World();

const {
    cameraSystem,
    collisionSystem,
    inputSystem,
    debugVisualsSystem,
    viewPortLayoutSystem,
} = setupECS(world, scene, renderer, inputManager, physicsConfigManager);

// --- Manager to expose configs to the renderer and gui ---
const uberConfigManager = new UberConfigManager();
uberConfigManager.registerConfigManager('physics', physicsConfigManager);
uberConfigManager.registerConfigManager('simulation', simulationConfigManager);

setupIpc(
    world,
    cleanupControlListener,
    cleanupConfigListener,
    collisionSystem,
    eventManager,
    uberConfigManager,
    cameraSystem,
    viewPortLayoutSystem,
);

// Add resize handler that updates camera system
window.addEventListener('resize', () => {
    cameraSystem.setRendererSize(window.innerWidth, window.innerHeight);
});

// --- Game Loop ---
// RenderSystem is already part of the world update loop
const gameLoop = new GameLoop(
    world,
    // for debugging track the updateid to link together update calls
    // with a tracking id. probably slow so disable unless required
    () => {
        DEBUG_OBJ2.updateId = DEBUG_OBJ2.updateId + 1;
    },
);

console.log('before calling logic of appeventmanager');
// --- Define App Action Handlers ---
initAppEventManager(
    eventManager,
    gameLoop,
    debugVisualsSystem,
    world,
    inputSystem,
    cameraSystem,
    container,
    uberConfigManager,
    cleanupControlListener,
    cleanupConfigListener,
);
console.log('after calling logic of appeventmanager');

focusManager.registerDependencies(world);

// --- Create World Builder ---
const worldBuilder = new WorldBuilder(worldConfigManager);

// Set up file menu event listeners
setupFileMenuListeners(
    worldBuilder,
    world,
    scene,
    collisionSystem,
    cameraSystem,
);

// --- Load World Config, Assets, Input Config, and Create Initial Entities ---
Promise.all([
    // Load input config first (or concurrently)
    inputManager.loadConfig('assets/configs/inputConfig.json'),
    physicsConfigManager.loadConfig('assets/configs/physicsConfig.json'),

    // Build world from YAML config
    worldBuilder.buildFromConfig(
        'assets/configs/world.yaml',
        world,
        scene,
        collisionSystem,
        cameraSystem,
    ),
])
    .then(() => {
        console.log(
            'Configuration and World setup complete. Starting game loop.',
        );

        createInitialView(world, cameraSystem);

        // Register dependencies which also sets initial focus
        focusManager.registerDependencies(world);

        // *** MODIFICATION: Add a delay before starting the game loop to ensure cameras are ready ***
        setTimeout(() => {
            // Initialize the audio system now that cameras exist
            initializeAudioSystem();

            // Start the game loop after audio is initialized
            gameLoop.start();
        }, 100); // 100ms delay should be enough for camera matrices to update
    })
    .catch((err) => {
        console.error('Error during initial setup:', err);
    });

function initializeAudioSystem() {
    try {
        console.log('Initializing audio system...');

        // Ensure the AudioContext is created and resumed (needed for some browsers)
        if (audioManager.listener && audioManager.listener.context &&
            audioManager.listener.context.state !== 'running') {
            console.log('Resuming audio context...');
            audioManager.listener.context.resume().catch(err => {
                console.warn('Could not resume audio context:', err);
            });
        }

        // Log audio listener status
        if (audioManager.listener) {
            console.log('Audio listener is initialized');
            if (audioManager.listener.parent) {
                console.log('Audio listener is attached to:', audioManager.listener.parent.name);
            } else {
                console.log('Audio listener is not attached to any object');
            }
        }

        console.log('Audio system initialized');
    } catch (error) {
        console.error('Error initializing audio system:', error);
        // Continue anyway - audio is not critical to app functionality
    }
}

// --- Cleanup ---
window.addEventListener('beforeunload', () => {
    gameLoop.stop();
    cleanupScene();
    console.log('Game loop stopped and scene cleaned up.');
});

initDebugTools(world);
