// src/renderer/core/ViewportLayout.ts
import * as THREE from 'three';



// Helper to create unique IDs
export const generateId = (options?: {
    prefix?: string;
    suffix?: string;
}): string =>
    (options?.prefix ?? '') +
    Math.random().toString(36).substring(2, 9) +
    (options?.suffix ?? '');
