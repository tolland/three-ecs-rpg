import { state } from './ui_state';
import { ui } from './ui_elements';
import { sendMessage } from '@panel/send_message';

export function refreshAll(): void {
    if (!state.connected) {
        updateStatus('Not connected. Attempting to reconnect...');
        sendMessage({ type: 'connected' });
        return;
    }
    sendMessage({ type: 'command', command: 'refreshAll' });
    updateStatus('Refreshing all data...');
}

export function updateStatus(message: string): void {
    if (ui.statusMessage) ui.statusMessage.textContent = message;
    console.log('Status:', message);
}

export function performSearch() {
    const query = ui.searchInput ? ui.searchInput.value : '';
    console.log('Performing search for:', query);
}

export function locateSelectedObject() {
    console.log('Locating selected object');
}

export function toggleEditMode() {
    state.editMode = !state.editMode;
    console.log('Edit mode:', state.editMode);
}

export function captureSnapshot() {
    console.log('Capturing snapshot');
}

export function refreshScene() {
    console.log('Refreshing scene');
}

export function requestObjectDetails(uuid: any) {
    console.log('Requesting object details:', uuid);
}
