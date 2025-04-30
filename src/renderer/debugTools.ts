// src/renderer/debugTools.ts
import { World } from '@ecs/World';
import { ManagerRegistry } from '@core/ManagerRegistry';

// Type definition for our global debug object
interface ECSDebug {
    managers?: Map<string, any>;

    refreshManagers(): void;
}

// Create a global debug object
const ecsDebug: ECSDebug = {
    managers: undefined,
    refreshManagers(): void {
        this.managers = ManagerRegistry.instance.getManagers();
        console.log(
            'Managers refreshed:',
            Array.from(this.managers?.keys() || []),
        );
    },
};

/**
 * Initialize the debug tools with the world instance
 */
export function initDebugTools(world: World): void {
    ecsDebug.refreshManagers();

    // Add to window object for console access
    (window as any).__ecsDebug = ecsDebug;

    console.log(
        'ECS Debug Tools initialized. Access via window.__ecsDebug in console.',
    );
}
