
import { serializeObject } from '@bridge/serilaizer';
import { bridgeState } from '@bridge/bridge_state';


export function getSystemsList() {
    if (!bridgeState.appWorld || !bridgeState.appWorld.systems) return [];

    try {
        return bridgeState.appWorld.systems.map((system: any) => {
            // Basic system info
            const result: any = {
                name: system.constructor.name,
                active: true, // Assuming all systems are active by default
                executionTime: system._lastExecutionTime || 0,
            };

            // Try to get more info if available
            if (typeof system.getEntitiesCount === 'function') {
                result.entities = system.getEntitiesCount();
            }

            return result;
        });
    } catch (e) {
        console.error(
            '[Three.js ECS Inspector] Error getting systems list:',
            e,
        );
        return [];
    }
}

export function getSystemByName(name: string) {
    if (!bridgeState.appWorld || !bridgeState.appWorld.systems) return null;

    try {
        const system = bridgeState.appWorld.systems.find(
            (s: any) => s.constructor.name === name,
        );
        if (!system) return null;

        return serializeObject(system, 0, 2);
    } catch (e) {
        console.error('[Three.js ECS Inspector] Error getting system:', e);
        return null;
    }
}
