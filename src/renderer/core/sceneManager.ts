import { setupScene } from '@setup/sceneSetup';
import * as THREE from 'three';
// import { createInspector } from 'three-inspect/vanilla';
import { PerspectiveCamera } from 'three';
const container = document.getElementById('container');
if (!container) throw new Error('Container element not found');

const { scene, renderer, cleanup } = setupScene(container);

export { scene, renderer, cleanup };

window.__THREE__ = THREE;

// Expose your specific instances
// window.__THREE_DEVTOOLS__ = {
//     scenes: [scene],
//     renderer: renderer
// };

// if (typeof window.__THREE_DEVTOOLS__ !== 'undefined') {
//     window.__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent('observe', { detail: scene }));
//     window.__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent('observe', { detail: renderer }));
// }
//
// console.log("Three.js DevTools hook initialized", window.__THREE_DEVTOOLS__);
//
// const targetElement = document.querySelector('#container')
// const camera = new THREE.PerspectiveCamera();
// const inspector = createInspector(targetElement, {
//     scene,
//     camera,
//     renderer,
// })
