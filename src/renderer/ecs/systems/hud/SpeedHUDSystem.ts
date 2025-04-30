// src/renderer/ecs/systems/SpeedHUDSystem.ts
import { System } from '@ecs/System';
import { World } from '@ecs/World';
import { simulationConfigManager } from '@core/SimulationConfigManager';
import { appEventManager, AppEventManager } from '@core/AppEventManager';
import { AppAction } from '@shared/core';

export class SpeedHUDSystem extends System {
    private hudElement: HTMLElement | null;
    private lastDisplayedScale: number = -1; // Cache last value to reduce DOM updates

    constructor(
        world: World,
        hudElementId: string = 'speed-hud',
        events: AppEventManager = appEventManager,
    ) {
        super(world);
        this.hudElement = document.getElementById(hudElementId);
        if (!this.hudElement) {
            console.warn(`Speed HUD element '#${hudElementId}' not found!`);
        }
        // Listen for config changes to update immediately
        events.on(AppAction.CONFIG_CHANGED, this.handleConfigChange);
    }

    private handleConfigChange = (payload?: { key: string; value: any }) => {
        if (payload?.key === 'simulation.timeScale') {
            this.updateDisplay(); // Update HUD if timeScale changed
        }
    };

    update(deltaTime: number): void {
        // Update could be driven purely by the event listener,
        // but a periodic update here ensures it's correct on startup/refresh.
        this.updateDisplay();
    }

    updateDisplay(): void {
        if (!this.hudElement) return;

        const currentScale = simulationConfigManager.getTimeScale();
        if (currentScale !== this.lastDisplayedScale) {
            const percentage = (currentScale * 100).toFixed(0);
            this.hudElement.innerText = `Speed: ${percentage}%`;
            this.lastDisplayedScale = currentScale;
        }
    }

    destroy() {
        // Clean up event listener
        appEventManager.off('configChanged' as any, this.handleConfigChange);
    }
}
