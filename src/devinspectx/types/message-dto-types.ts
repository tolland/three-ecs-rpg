// src/devinspectx/types/dto-types.ts

/**
 * Type definitions for dto passed from bridge to panel
 */


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
