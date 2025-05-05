
// Connection status messages
import { EntityInfo, MemoryStats, SceneNodeInfo, SystemInfo } from '@devinspectx/types/message-dto-types';
import { BridgeMessage } from '@devinspectx/types/message-types';


export interface ConnectionMessage extends BridgeMessage {
    type: 'connected' | 'disconnected';
}

// Request messages
export interface RequestMessage extends BridgeMessage {
    type: 'request';
    target: 'scene' | 'entities' | 'components' | 'systems' | 'world';
    action: string;
    id: string;
    params?: Record<string, any>;
}

// Response messages
export interface ResponseMessage extends BridgeMessage {
    type: 'response';
    requestId: string;
    data: any;
    error?: string;
}

// Update messages (sent periodically or on change)
export interface UpdateMessage extends BridgeMessage {
    type: 'update';
    target: 'scene' | 'entities' | 'components' | 'systems' | 'stats';
    data: any;
}

// Command messages (actions to perform)
export interface CommandMessage extends BridgeMessage {
    type: 'command';
    command: string;
    params?: Record<string, any>;
}

// Scene-specific message interfaces
export interface SceneUpdateMessage extends UpdateMessage {
    target: 'scene';
    data: {
        hierarchy: SceneNodeInfo[];
        selected?: string; // UUID of selected object
    };
}

// Entity-specific message interfaces
export interface EntityUpdateMessage extends UpdateMessage {
    target: 'entities';
    data: {
        entities: EntityInfo[];
        selected?: number; // ID of selected entity
    };
}

// System-specific message interfaces
export interface SystemUpdateMessage extends UpdateMessage {
    target: 'systems';
    data: {
        systems: SystemInfo[];
        active: string[]; // Names of active systems
    };
}

// Performance stats update
export interface StatsUpdateMessage extends UpdateMessage {
    target: 'stats';
    data: {
        fps: number;
        memory: MemoryStats;
        timing: Record<string, number>; // System update timings
    };
}
