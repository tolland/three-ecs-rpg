// src/renderer/ecs/systems/TelemetrySystem.ts
import { System } from '@ecs/System';
import { World } from '@ecs/World';
import { NumericComponent } from '@components/NumericComponent';

export class TelemetrySystem extends System {
    private isEnabled: boolean = false;

    constructor(world: World) {
        super(world);
    }

    update(deltaTime: number): void {
        if (Math.random() < 0.05) return;
        const entities = this.world.queryEntities([NumericComponent]);

        for (const entity of entities) {
        }
    }
}
