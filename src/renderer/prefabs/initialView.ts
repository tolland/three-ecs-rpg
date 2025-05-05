import {
    CameraSystem,
    CameraSystemLoggingConfig,
    ViewportLayoutSystem,
} from '@ecs/systems';
import {
    CameraMode,
    PlayerControlComponent,
    PlayerControlGroundedComponent,
} from '@ecs/components';
import { World } from '@ecs/World';
import * as F from '@renderer/utils/chalkColors';
import { serializeForConsole } from '@shared/core/utils';
import { Serializer } from '@shared/serialization/Serializer';
import { CameraID } from '@core/types/viewport';
import { AudioManagerLoggingConfig } from '@core/AudioManager';

export const InitialViewLoggingConfig = {
    /** Main toggle for enabling/disable all AudioManager logging */
    enabled: false,
    logConstructors: false,
    logFocusedChanged: false,
    logEnableDisable: false,
    /** Toggle for method invocation logging */
    logMethods: false,
    /** Style for manager names in logs */
    styleFocusChange: (name: string) => `\x1b[36m${name}\x1b[0m`, // Cyan color
    /** Style for lifecycle events */
    styleLifecycle: (event: string) => `\x1b[33m${event}\x1b[0m`, // Yellow color
};

export function createInitialView(world: World, cameraSystem: CameraSystem) {
    const layoutSystem = world.getSystem(ViewportLayoutSystem)!;

    const defaultLeafId = world
        .getSystem(ViewportLayoutSystem)!
        .getRootNode().id; // Assumes root is leaf initially
    const defaultCamId: CameraID = 'main'; // ID for the camera instance
    const defaultViewConfigId = 'player_view_config'; // ID for the view config

    // Create resources
    const mainCam = cameraSystem.createCameraInstance(defaultCamId);

    const playerEntity = world.queryEntities([PlayerControlComponent])[0]; // Find player

    if (InitialViewLoggingConfig.enabled) {
        console.log(
            `player entity components ${serializeForConsole(Serializer.serialize(world.getEntityComponentNames(playerEntity)))}`,
        );
    }

    const view1 = cameraSystem.createViewConfiguration(
        defaultViewConfigId,
        'Player View',
        defaultCamId,
        {
            targetEntity: playerEntity ?? null, // Target player if found
            mode: CameraMode.THIRD_PERSON_ENTITY, // Default mode
        },
    );

    if (InitialViewLoggingConfig.enabled) {
        console.log(
            `initialView: ${serializeForConsole(Serializer.serialize(view1))}`,
        );
    }

    // Link them together
    cameraSystem.createActiveView(defaultLeafId, defaultViewConfigId);

    if (InitialViewLoggingConfig.enabled) {
        console.warn(
            `layoutsystem: ${serializeForConsole(Serializer.serialize(layoutSystem))}`,
        );

        console.log(
            'created first active view and assigned leaf to active view',
        );
    }
    const newSplit = layoutSystem.splitHorizontal(
        layoutSystem.getRootNode().id,
    );

    console.log(`${F.a11yImportant('InitialView: ')} created first split`);

    const npcEntity = world
        .getAllEntitiesWithName()
        .find((entity) => entity.name === 'Playable_2');
    if (InitialViewLoggingConfig.enabled) {
        console.log(
            `npcEntity: ${serializeForConsole(Serializer.serialize(npcEntity))}`,
        );
    }

    if (InitialViewLoggingConfig.enabled) {
        if (npcEntity) {
            console.log(
                `npcEntity entity components ${serializeForConsole(Serializer.serialize(world.getEntityComponentNames(npcEntity.id)))}`,
            );
        }
    }

    const npcCamId = 'npc1';

    const npcCam = cameraSystem.createCameraInstance(npcCamId);

    const npcViewConfig = 'npc_view_config';

    const viewConfig = cameraSystem.createViewConfiguration(
        npcViewConfig,
        'NPC View',
        npcCamId,
        {
            targetEntity: npcEntity?.id ?? null,
            mode: CameraMode.THIRD_PERSON_ENTITY,
        },
    );
    if (InitialViewLoggingConfig.enabled) {
        console.log('assigned npc to view config');
    }

    if (newSplit) {
        console.log('found split');
        cameraSystem.createActiveView(newSplit.childB.id, viewConfig.id);
    }
}
