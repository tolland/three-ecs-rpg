


// Handle initialize message
import { updateStatus } from './ui_actions';
import { state } from './ui_state';

export function handleInitialize(message: {
    status: string;
    foundObjects: {
        foundScene: any;
        foundRenderer: any;
        foundWorld: any;
        foundEcsDebug: any;
    };
}) {
    console.log('Initialization:', message);

    if (message.status === 'complete') {
        updateStatus('Successfully connected to Three.js ECS');
        state.connected = true;
    } else if (message.status === 'partial') {
        const { foundScene, foundRenderer, foundWorld, foundEcsDebug } =
            message.foundObjects;

        let statusMsg = 'Partial connection: ';
        let foundItems = [];

        if (foundScene) foundItems.push('Scene');
        if (foundRenderer) foundItems.push('Renderer');
        if (foundWorld) foundItems.push('World');
        if (foundEcsDebug) foundItems.push('ECS Debug');

        statusMsg += foundItems.join(', ');

        if (foundItems.length === 0) {
            statusMsg = 'Could not find Three.js or ECS objects';
        }

        updateStatus(statusMsg);
    }
}
