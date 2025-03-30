import * as THREE from 'three';

export enum RenderLayers {
    RENDER_LAYER = 0, // Default layer, everything else
    PLAYER_LAYER = 1, // Layer for the player's own model
}

export function setupScene(container: HTMLElement) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x88ccff);

    // Basic Camera (will be managed by CameraSystem later)
    const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000,
    );
    camera.position.z = 5;
    camera.position.y = 2;

    camera.layers.enable(RenderLayers.RENDER_LAYER); // Render default layer
    camera.layers.disable(RenderLayers.PLAYER_LAYER); // <<<<< DO NOT render player's own layer

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // Better color grading
    renderer.outputColorSpace = THREE.SRGBColorSpace; // Correct color space
    container.appendChild(renderer.domElement);

    // Basic Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    // Configure shadow properties if needed
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    scene.add(directionalLight);
    scene.add(directionalLight.target); // Target is needed for directional light shadows

    // Handle Resize
    const onWindowResize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        // Note: Camera aspect ratio is now handled by CameraSystem based on viewports
        renderer.setSize(width, height);
        // Inform CameraSystem about the resize
        // cameraSystem.setRendererSize(width, height); // Will be called from main.ts
    };
    window.addEventListener('resize', onWindowResize);

    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    // const gridHelper = new THREE.GridHelper(100, 100);
    // scene.add(gridHelper);

    return {
        scene,
        camera,
        renderer,
        cleanup: () => window.removeEventListener('resize', onWindowResize),
    };
}
