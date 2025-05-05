// src/devinspectx/extension/bridge/handle_requests.ts
import {
    findObjectByUUID,
    getComponent,
    getEntitiesList,
    getEntityById,
    getEntityComponents,
    queryEntities,
} from './finding_objects';
import { serializeSceneHierarchy } from './serialize_scene';
import { updateComponent } from './updating';
import { getSystemByName, getSystemsList } from './get_objects';
import { serializeObject } from './serilaizer';
import { sendMessage } from '@bridge/send_message';
import { bridgeState } from '@bridge/bridge_state';


export function handleRequest(message: any) {
    if (!message.target || !message.action) return;

    const { target, action, id, params } = message;
    let responseData: any = null;
    let error: string | null = null;

    try {
        switch (target) {
            case 'scene':
                responseData = handleSceneRequest(action, params);
                break;

            case 'entities':
                responseData = handleEntityRequest(action, params);
                break;

            case 'components':
                responseData = handleComponentRequest(action, params);
                break;

            case 'systems':
                responseData = handleSystemRequest(action, params);
                break;

            case 'world':
                responseData = handleWorldRequest(action, params);
                break;

            default:
                error = `Unknown target: ${target}`;
        }
    } catch (e) {
        error = e instanceof Error ? e.message : 'Unknown error';
    }

    // Send response
    sendMessage({
        type: 'response',
        requestId: id,
        data: responseData,
        error,
        timestamp: Date.now(),
    });
}

// Handle scene requests
export function handleSceneRequest(action: string, params?: any) {
    if (!bridgeState.appScene) {
        throw new Error('Scene not found');
    }

    switch (action) {
        case 'getObjectById':
            if (!params || !params.uuid)
                throw new Error('Missing uuid parameter');
            return serializeObject(findObjectByUUID(params.uuid));

        case 'getObjectProperties':
            if (!params || !params.uuid)
                throw new Error('Missing uuid parameter');
            const obj = findObjectByUUID(params.uuid);
            return serializeObject(obj, 0, 1);

        case 'getHierarchy':
            return serializeSceneHierarchy();

        default:
            throw new Error(`Unknown scene action: ${action}`);
    }
}

// Handle entity requests
export function handleEntityRequest(action: string, params?: any) {
    if (!bridgeState.appWorld) {
        throw new Error('World not found');
    }

    switch (action) {
        case 'getAll':
            return getEntitiesList();

        case 'getById':
            if (!params || params.id === undefined)
                throw new Error('Missing id parameter');
            return getEntityById(params.id);

        case 'getComponents':
            if (!params || params.id === undefined)
                throw new Error('Missing id parameter');
            return getEntityComponents(params.id);

        default:
            throw new Error(`Unknown entity action: ${action}`);
    }
}

// Handle component requests
export function handleComponentRequest(action: string, params?: any) {
    if (!bridgeState.appWorld) {
        throw new Error('World not found');
    }

    switch (action) {
        case 'get':
            if (
                !params ||
                params.entityId === undefined ||
                !params.componentName
            ) {
                throw new Error(
                    'Missing entityId or componentName parameter',
                );
            }
            return getComponent(params.entityId, params.componentName);

        case 'update':
            if (
                !params ||
                params.entityId === undefined ||
                !params.componentName ||
                !params.data
            ) {
                throw new Error('Missing parameters for component update');
            }
            return updateComponent(
                params.entityId,
                params.componentName,
                params.data,
            );

        default:
            throw new Error(`Unknown component action: ${action}`);
    }
}

// Handle system requests
export function handleSystemRequest(action: string, params?: any) {
    if (!bridgeState.appWorld) {
        throw new Error('World not found');
    }

    switch (action) {
        case 'getAll':
            return getSystemsList();

        case 'getByName':
            if (!params || !params.name)
                throw new Error('Missing name parameter');
            return getSystemByName(params.name);

        default:
            throw new Error(`Unknown system action: ${action}`);
    }
}

// Handle world requests
export function handleWorldRequest(action: string, params?: any) {
    if (!bridgeState.appWorld) {
        throw new Error('World not found');
    }

    switch (action) {
        case 'getState':
            return serializeObject(bridgeState.appWorld, 0, 1);

        case 'queryEntities':
            if (!params || !params.componentTypes)
                throw new Error('Missing componentTypes parameter');
            return queryEntities(params.componentTypes);

        default:
            throw new Error(`Unknown world action: ${action}`);
    }
}
