// src/renderer/core/AppEventManager.ts
import { AppAction } from '@shared/core/AppActions';
import { Serializer } from '@shared/serialization/Serializer';
import { serializeForConsole } from '@shared/core/utils';
import { RegisterManager } from '@core/ManagerRegistry';
import { CameraSystemLoggingConfig } from '@ecs/systems';

type AppActionListener = (payload?: any) => void;

export const AppEventManagerLoggingConfig = {
    /** Main toggle for enabling/disable all CameraSystem logging */
    enabled: false,
    /** Toggle for constructor logging */
    logConstructors: true,
    /** Toggle for constructor logging */
    logFocusedChanged: false,
    /** Toggle for method invocation logging */
    logMethods: false,
    /** Style for manager names in logs */
    styleFocusChange: (name: string) => `\x1b[36m${name}\x1b[0m`, // Cyan color
    /** Style for lifecycle events */
    styleLifecycle: (event: string) => `\x1b[33m${event}\x1b[0m`, // Yellow color
};

@RegisterManager()
export class AppEventManager {
    private listeners: Map<AppAction, AppActionListener[]> = new Map();

    constructor() {
        // Initialize listener arrays for all known actions
        Object.values(AppAction).forEach((action) => {
            this.listeners.set(action, []);
        });

        if (AppEventManagerLoggingConfig.enabled && AppEventManagerLoggingConfig.logConstructors) {
            console.log("in constructor of appeventmanager");
        }
    }

    on(action: AppAction, listener: AppActionListener): void {
        this.listeners.get(action)?.push(listener);
    }

    off(action: AppAction, listenerToRemove: AppActionListener): void {
        const actionListeners = this.listeners.get(action);
        if (actionListeners) {
            this.listeners.set(
                action,
                actionListeners.filter(
                    (listener) => listener !== listenerToRemove,
                ),
            );
        }
    }

    emit(action: AppAction, payload?: any): void {
        if (AppEventManagerLoggingConfig.enabled) {
            console.log(
                `Event emitted: ${action} payload :${serializeForConsole(Serializer.serialize(payload))}`,
            ); // Debug emission
        }
        this.listeners.get(action)?.forEach((listener) => {
            try {
                listener(payload);
            } catch (error) {
                console.error(`Error in listener for action ${action}:`, error);
            }
        });
    }
}

// Singleton instance (optional, but often convenient for a global event bus)
export const appEventManager = new AppEventManager();
