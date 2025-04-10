interface Window {
    electronProcess: {
        onUncaughtException: (callback: (error: Error) => void) => void;
    };
}

// --- Type Definition for the Exposed API (Important for TypeScript) ---
declare global {
    interface Window {
        electronIPC: {
            // Add other exposed functions here if any
            handle: (
                channel: string,
                listener: (args: any) => Promise<any> | any,
            ) => void;
            invoke: (channel: string, args?: any) => Promise<any>; // If needed
            handleRequest: (
                channel: string,
                listener: (args: any) => Promise<any> | any,
            ) => Promise<any> | any;
            on:  (
                channel: string,
                listener: (args: any) => Promise<any> | any,
            ) => Promise<any> | any;
        };
    }
}

// Required to make the global augmentation work
export {};
