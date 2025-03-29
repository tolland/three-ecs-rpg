// src/preload/preload.ts
import { contextBridge } from 'electron';

// Example: Expose a simple API
contextBridge.exposeInMainWorld('electronAPI', {
    // Add any APIs you need to expose here
    // E.g., nodeVersion: () => process.versions.node,
});

console.log('Preload script loaded.');