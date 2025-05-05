// src/devinspectx/extension/panel/handle_response.ts

import { updateStatus } from './ui_actions';
import {
    displayComponentDetails,
    displayEntityDetails,
    displayObjectDetails,
    displaySystemDetails,
} from './display';

// Handle response messages (from requests we've sent)

export function handleResponse(message: {
    requestId: any;
    data: any;
    error: any;
}) {
    if (!message) return;

    const { requestId, data, error } = message;

    if (error) {
        console.error('Request error:', error);
        updateStatus(`Error: ${error}`);
        return;
    }

    console.log('Response:', requestId, data);

    // Handle different types of responses based on the request ID
    if (requestId.startsWith('scene_object_')) {
        displayObjectDetails(data);
    } else if (requestId.startsWith('entity_')) {
        displayEntityDetails(data);
    } else if (requestId.startsWith('component_')) {
        displayComponentDetails(data);
    } else if (requestId.startsWith('system_')) {
        displaySystemDetails(data);
    }
}
