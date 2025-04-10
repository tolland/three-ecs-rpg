import { CameraSystem, ViewportLayoutSystem } from '@ecs/systems';
import { CameraMode, PlayerControlledComponent } from '@ecs/components';
import { World } from '@ecs/World';

export function createInitialView(world: World, cameraSystem: CameraSystem) {
    const layoutSystem = world.getSystem(ViewportLayoutSystem)!;

    const defaultLeafId = world
        .getSystem(ViewportLayoutSystem)!
        .getRootNode().id; // Assumes root is leaf initially
    const defaultCamId = 'main'; // ID for the camera instance
    const defaultViewConfigId = 'player_view_config'; // ID for the view config

    // Create resources
    cameraSystem.createCameraInstance(defaultCamId);

    const playerEntity = world.queryEntities([PlayerControlledComponent])[0]; // Find player

    cameraSystem.createViewConfiguration(defaultViewConfigId, 'Player View', {
        targetEntity: playerEntity ?? null, // Target player if found
        mode: CameraMode.THIRD_PERSON_ENTITY, // Default mode
    });

    // Link them together
    cameraSystem.createActiveView(
        defaultLeafId,
        defaultCamId,
        defaultViewConfigId,
    );

    const newSplit = layoutSystem.splitHorizontal(
        layoutSystem.getRootNode().id,
    );

    const npcEntity = world
        .getAllEntitiesWithName()
        .find((entity) => entity.name === 'Playable_2');

    const npcViewConfig = 'npc_view_config';

    const viewConfig = cameraSystem.createViewConfiguration(
        npcViewConfig,
        'NPC View',
        {
            targetEntity: npcEntity?.id ?? null,
            mode: CameraMode.THIRD_PERSON_ENTITY,
        },
    );

    const npcCamId = 'npc1';

    cameraSystem.createCameraInstance(npcCamId);

    if (newSplit) {
        console.log('found split');
        cameraSystem.createActiveView(
            newSplit.childB.id,
            npcCamId,
            viewConfig.id,
        );
    }
}
