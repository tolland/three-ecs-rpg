// src/renderer/core/ViewportLayout.ts
import * as THREE from 'three';

export type ViewportID = string; // Unique ID for a viewport leaf node
export type CameraID = string; // Unique ID for a THREE.Camera instance
export type ViewConfigID = string; // Unique ID for a View Configuration

/**
 * ViewportLayoutNode (Tree Structure): Represents the screen layout. Can be a leaf (displaying a view) or a split node (dividing space).
 */

// Calculated absolute viewport rectangle (0-1)
export interface ViewportRect extends THREE.Vector4 {} // x, y, width, height

export type LayoutNode = SplitNode | LeafNode;

export interface SplitNode {
    id: string;
    type: 'split';
    direction: 'horizontal' | 'vertical';
    splitPercentage: number; // 0-1 (e.g., 0.5 for equal split)
    childA: LayoutNode;
    childB: LayoutNode;
}

export interface LeafNode {
    id: ViewportID;
    type: 'leaf';
    // Links to an ActiveView managed elsewhere
    activeViewId: string | null;
    // Calculated absolute viewport (updated by LayoutManager)
    calculatedViewport: ViewportRect;
}

// Helper to create unique IDs
export const generateId = (options?: {
    prefix?: string;
    suffix?: string;
}): string =>
    (options?.prefix ?? '') +
    Math.random().toString(36).substring(2, 9) +
    (options?.suffix ?? '');
