
export const ContentScriptLoggingConfig = {
    source: 'content-script',
    enabled: true,
    logToGraylog: true,
    logConstructors: true,
    logFocusedChanged: false,
    logMethods: false,
    // /** Style for manager names in logs */
    // styleFocusChange: (name: string) => `\x1b[36m${name}\x1b[0m`, // Cyan color
    // /** Style for lifecycle events */
    // styleLifecycle: (event: string) => `\x1b[33m${event}\x1b[0m`, // Yellow color
};
