// src/renderer/types/main.d.ts

interface Window {
    electronProcess: {
        onUncaughtException: (callback: (error: Error) => void) => void;
    };
}

// --- Type Definition for the Exposed API (Important for TypeScript) ---
declare global {
    interface Window {
        __THREE__: typeof THREE;
        __THREE_DEVTOOLS__: {
            dispatchEvent: (event: Event) => void;
        };
        scene: THREE.Scene;
        renderer: THREE.WebGLRenderer;
        electronIPC: {
            // Add other exposed functions here if any
            handle: (
                channel: string,
                listener: (args: any) => Promise<any> | any,
            ) => void;
            invoke: (channel: string, args?: any) => Promise<any>;
            send: (channel: string, args?: any) => Promise<any>;
            handleRequest: (
                channel: string,
                listener: (args: any) => Promise<any> | any,
            ) => Promise<any> | any;
            on: (
                channel: string,
                listener: (args: any) => Promise<any> | any,
            ) => Promise<any> | any;
        };
    }
}

// Required to make the global augmentation work
export {};
