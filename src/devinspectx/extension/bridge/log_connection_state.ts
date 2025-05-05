// src/devinspectx/extension/bridge/log_connection_state.ts
import { BridgeScriptLoggingConfig } from '@bridge/logging_config';
import { bridgeState } from '@bridge/bridge_state';
import { LoggingService } from '@shared/utils/LoggingService';

const logger = LoggingService.getInstance();

export function logConnectionStatus() {
    logger.logMessage({
        host: BridgeScriptLoggingConfig.source,
        short_message: `status heartbeat`,
        _origin: 'bridge',
        _destination: 'background',
        _action: 'heartbeat',
        _data: {
            appScene: !!bridgeState.appScene,
            appRenderer: !!bridgeState.appRenderer,
            appWorld: !!bridgeState.appWorld,
            appEcsDebug: !!bridgeState.appEcsDebug,
            devToolsConnected: bridgeState.devToolsConnected,
        },
    });
    // console.log('[Bridge] Connection status:', {
    //     appScene: !!bridgeState.appScene,
    //     appRenderer: !!bridgeState.appRenderer,
    //     appWorld: !!bridgeState.appWorld,
    //     appEcsDebug: !!bridgeState.appEcsDebug,
    //     devToolsConnected: bridgeState.devToolsConnected,
    // });
}
