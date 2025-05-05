
// Handle update messages
import { updateEntityData, updateSceneData, updateStatsData, updateSystemData } from './updates';

export function handleUpdate(message: { target: any; data: any }) {
    if (!message || !message.target) return;

    switch (message.target) {
        case 'scene':
            updateSceneData(message.data);
            break;

        case 'entities':
            updateEntityData(message.data);
            break;

        case 'systems':
            updateSystemData(message.data);
            break;

        case 'stats':
            updateStatsData(message.data);
            break;
    }
}

