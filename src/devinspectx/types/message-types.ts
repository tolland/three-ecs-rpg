/**
 * Type definitions for messages passed between different parts of the extension
 */

// Base message interface
export interface BridgeMessage {
  type: string;
  timestamp?: number;
}

// Message source types
export type MessageSource = 'bridge' | 'content' | 'devtools' | 'background';

// Wrapped message with source information
export interface WrappedMessage {
  source: MessageSource;
  data: BridgeMessage;
}

// Connection status messages
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

// Type definitions for serialized data structures

export interface SceneNodeInfo {
  uuid: string;
  name: string;
  type: string;
  visible: boolean;
  childCount: number;
  children?: SceneNodeInfo[];
  position?: Vector3Data;
  rotation?: EulerData;
  scale?: Vector3Data;
  selected?: boolean;
}

export interface EntityInfo {
  id: number;
  name: string;
  components: string[]; // Component type names
  selected?: boolean;
}

export interface ComponentInfo {
  type: string;
  data: Record<string, any>;
}

export interface SystemInfo {
  name: string;
  active: boolean;
  executionTime: number; // Average execution time in ms
  entities?: number; // Number of entities this system operates on
  lastUpdateTime?: number;
}

export interface MemoryStats {
  geometries: number;
  textures: number;
  jsHeap?: number;
  jsHeapTotal?: number;
  jsHeapLimit?: number;
}

// Three.js related data types
export interface Vector3Data {
  x: number;
  y: number;
  z: number;
}

export interface EulerData {
  x: number;
  y: number;
  z: number;
  order: string;
}

export interface QuaternionData {
  x: number;
  y: number;
  z: number;
  w: number;
}
