import { System } from '@ecs/System';
import { World } from '@ecs/World';
import { PlayerControlGroundedComponent } from '@ecs/components';

// Import necessary component types

export class DebugHUDSystem extends System {
    private debugElement: HTMLElement | null;
    private entitiesSnapshot: string = ''; // Store formatted string

    constructor(world: World, hudElementId: string = 'debug-hud') {
        super(world);
        this.debugElement = document.getElementById(hudElementId);
        if (!this.debugElement) {
            console.warn(`Debug HUD element '#${hudElementId}' not found!`);
        }
    }

    update(deltaTime: number): void {
        if (!this.debugElement) return;

        // Optimization: Update less frequently? e.g., every 0.5 seconds
        if (Math.random() > 0.1) return; // Simple throttle example

        let output = '--- ECS Debug ---\n';
        output += `Entities: ${this.world.queryEntities([]).length}\n`; // Total entities

        const controlled = this.world.queryEntities([
            PlayerControlGroundedComponent,
        ]);
        if (controlled.length > 0) {
            const entity = controlled[0];
            output += `\nPlayer Controlled Entity: ${entity}\n`;
            const components = this.world.getEntityComponents(entity);
            if (components) {
                components.forEach((comp, type) => {
                    output += `  - ${type.name}: ${JSON.stringify(comp, null, 2)}\n`; // Basic component stringify
                });
            }
        }

        // TODO: Add entity map visualization logic here if using HTML map

        // Only update DOM if content changed
        if (output !== this.entitiesSnapshot) {
            this.debugElement.innerText = output;
            this.entitiesSnapshot = output;
        }
    }
}
