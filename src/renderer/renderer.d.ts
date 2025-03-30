interface Window {
    electronProcess: {
        onUncaughtException: (callback: (error: Error) => void) => void;
    };
}
