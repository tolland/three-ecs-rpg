import { setupScene } from '@setup/sceneSetup';

const container = document.getElementById('container');
if (!container) throw new Error('Container element not found');

const { scene, renderer, cleanup } = setupScene(container);

export { scene, renderer, cleanup };
