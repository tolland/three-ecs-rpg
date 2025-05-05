


// Placeholder functions that would be implemented in a real extension
import { ui } from './ui_elements';

export function updateSceneData(data: any) {
    console.log('Scene data updated:', data);
    if (ui.sceneTree) {
        ui.sceneTree.innerHTML = '<div>Scene data received</div>';
    }
}

export function updateEntityData(data: any) {
    console.log('Entity data updated:', data);
    if (ui.entityTree) {
        ui.entityTree.innerHTML = '<div>Entity data received</div>';
    }
}

export function updateSystemData(data: any) {
    console.log('System data updated:', data);
    if (ui.systemTree) {
        ui.systemTree.innerHTML = '<div>System data received</div>';
    }
}

export function updateStatsData(data: { fps: any }) {
    console.log('Stats data updated:', data);
    if (ui.fpsCounter) {
        ui.fpsCounter.textContent = `FPS: ${data.fps || '--'}`;
    }
}
