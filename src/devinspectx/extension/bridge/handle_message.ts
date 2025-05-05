// src/devinspectx/extension/bridge/handle_message.ts
import { bridgeState } from '@bridge/bridge_state';
import { handleCommand, sendInitialState, startUpdates, stopUpdates } from '@bridge/updating';
import { handleRequest } from '@bridge/handle_requests';

export function handleMessage(message: any) {
    if (!message || !message.type) return;

    switch (message.type) {
        case 'connected':
            console.log('[Three.js ECS Inspector] DevTools connected');
            bridgeState.devToolsConnected = true;
            startUpdates();
            // Send initial state
            sendInitialState();
            break;

        case 'disconnected':
            console.log('[Three.js ECS Inspector] DevTools disconnected');
            bridgeState.devToolsConnected = false;
            stopUpdates();
            break;

        case 'request':
            console.log('[Three.js ECS Inspector] DevTools request');
            handleRequest(message);
            break;

        case 'command':
            console.log('[Three.js ECS Inspector] DevTools command');
            handleCommand(message);
            break;
    }
}
