import { state } from './ui_state';
import { updateStatus } from '@panel/ui_actions';
import { handleInitialize } from '@panel/initialize';
import { handleUpdate } from '@panel/handle_update';
import { handleResponse } from '@panel/handle_response';
import { handleObjectChanged } from '@panel/handle_object_changed';
import { sendMessage } from '@panel/send_message';

export function handleContentMessage(message: any): void {
    if (!message || !message.type) return;
    switch (message.type) {
        case 'bridge-ready':
            console.log('Bridge script is ready');
            state.connected = true;
            updateStatus('Connected to Three.js ECS application');

            // Send initial connection message
            sendMessage({ type: 'connected' });
            break;

        case 'initialize':
            handleInitialize(message);
            break;

        case 'update':
            handleUpdate(message);
            break;

        case 'response':
            handleResponse(message);
            break;

        case 'objectChanged':
            handleObjectChanged(message);
            break;
    }
}

export function handleBackgroundMessage(message: any): void {
    if (!message || !message.type) return;
    switch (message.type) {
        case 'content-connected':
            console.log('Content script is connected');
            updateStatus('Content script connected, waiting for bridge...');
            break;

        case 'content-disconnected':
            console.log('Content script disconnected');
            state.connected = false;
            updateStatus('Disconnected from page');
            break;
    }
}
