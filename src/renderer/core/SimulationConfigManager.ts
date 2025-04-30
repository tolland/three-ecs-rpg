// src/renderer/core/SimulationConfigManager.ts
import { Config, IConfigManager } from '@core/ConfigManager';
import { ConfigMetadata, ConfigSetter } from '@core/UberConfigManager';
import { LogManager } from '@renderer/utils/ManagerLogger';

export interface SimulationConfig extends Config {
    timeScale: number;
    maxDeltaTime: number; // Store max dt here too?
}

@LogManager()
export class SimulationConfigManager implements IConfigManager {
    public config: SimulationConfig = {
        timeScale: 1.0,
        maxDeltaTime: 1 / 30, // Default max delta
    };

    // --- Setters ---
    setTimeScale(value: number): void {
        // Clamp the value to reasonable limits (e.g., 0.1x to 5x speed)
        this.config.timeScale = Math.max(0.05, Math.min(value, 5.0));
        console.log(`Simulation Time Scale set to: ${this.config.timeScale.toFixed(2)}`);
    }

    setMaxDeltaTime(value: number): void {
        if (value > 0) {
            this.config.maxDeltaTime = value;
        }
    }

    // --- Getters ---
    getTimeScale(): number {
        return this.config.timeScale;
    }
    getMaxDeltaTime(): number {
        return this.config.maxDeltaTime;
    }

    // --- For UberConfigManager ---
    getConfig(): Readonly<SimulationConfig> {
        return this.config;
    }

    getSetters(): Record<string, ConfigSetter> {
        return {
            timeScale: this.setTimeScale.bind(this),
            maxDeltaTime: this.setMaxDeltaTime.bind(this),
        };
    }

    getMetadata(): Record<string, ConfigMetadata> {
        return {
            timeScale: {
                type: 'number', min: 0.05, max: 5.0, step: 0.05, description: 'Game speed multiplier',
            },
            maxDeltaTime: {
                type: 'number', min: 0.001, step: 0.001, description: 'Max frame time step (s)',
            },
        };
    }
}

// Optional singleton instance
export const simulationConfigManager = new SimulationConfigManager();
