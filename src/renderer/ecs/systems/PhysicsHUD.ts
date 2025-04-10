import { System } from '@ecs/System';
import { World } from '@ecs/World';
import GUI from 'lil-gui';
import { physicsConfigManager } from '@core/PhysicsConfigManager';

export class PhysicsHUD extends System {
    private debugElement: HTMLElement | null;
    private entitiesSnapshot: string = '';
    private gui!: GUI;

    constructor(world: World, hudElementId: string = 'debug-hud') {
        super(world);
        this.debugElement = document.getElementById(hudElementId);
        if (!this.debugElement) {
            console.warn(`Debug HUD element '#${hudElementId}' not found!`);
        }
        this.gui = new GUI();
        this.makePhysicsHUD();
    }

    makePhysicsHUD() {
        const physFolder = this.gui.addFolder('Physics');

        physFolder
            .add(physicsConfigManager.config, 'baseGravity')
            .name('Base Gravity')
            .onChange(
                physicsConfigManager.setBaseGravity.bind(physicsConfigManager),
            );
        physFolder
            .add(physicsConfigManager.config, 'globalDamping', 0, 1)
            .name('Global Damping')
            .onChange(
                physicsConfigManager.setGlobalDamping.bind(
                    physicsConfigManager,
                ),
            );
        const playerFolder = physFolder.addFolder('Player');
        playerFolder
            .add(physicsConfigManager.config.player, 'walkSpeed', 0, 20)
            .onChange(
                physicsConfigManager.setPlayerWalkSpeed.bind(
                    physicsConfigManager,
                ),
            );
        playerFolder
            .add(physicsConfigManager.config.player, 'runSpeed', 0, 20)
            .onChange(
                physicsConfigManager.setPlayerRunSpeed.bind(
                    physicsConfigManager,
                ),
            );
        playerFolder
            .add(physicsConfigManager.config.player, 'jumpForce', 0, 20)
            .onChange(
                physicsConfigManager.setPlayerJumpForce.bind(
                    physicsConfigManager,
                ),
            );
        playerFolder
            .add(
                physicsConfigManager.config.player,
                'stopDampingMultiplier',
                0,
                20,
            )
            .onChange(
                physicsConfigManager.setPlayerStopDampingMultiplier.bind(
                    physicsConfigManager,
                ),
            );
    }

    update(deltaTime: number): void {}
}
