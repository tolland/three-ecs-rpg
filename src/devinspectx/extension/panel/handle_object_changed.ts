

// Handle object changed notification
import { refreshScene, requestObjectDetails } from './ui_actions';
import { state } from './ui_state';

export function handleObjectChanged(message: { uuid: any }) {
    if (!message || !message.uuid) return;

    // Update the scene hierarchy if needed
    refreshScene();

    // If this is the currently selected object, update its details
    if (
        state.scene.selectedNode &&
        state.scene.selectedNode.uuid === message.uuid
    ) {
        requestObjectDetails(message.uuid);
    }
}
