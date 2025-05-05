// Communication with the content script
import { JsonObject } from '@shared/types/serialization';
import { LoggingService } from '@shared/utils/LoggingService';
import { BridgeScriptLoggingConfig } from '@bridge/logging_config';
import { bridgeState } from '@bridge/bridge_state';
import { Serializer } from '@devinspectx/extension/utils/serializer-util';

export function sendMessage(message: JsonObject) {
    LoggingService.getInstance().logMessage({
        host: BridgeScriptLoggingConfig.source,
        short_message: `sendMessage to window (content script)`,
        _channel_type: 'window',
        _event: 'postMessage',
        _origin: message._origin ?? 'bridge',
        _destination: message._destination ?? 'unknown',
        _data: {
            appScene: !!bridgeState.appScene,
            appRenderer: !!bridgeState.appRenderer,
            appWorld: !!bridgeState.appWorld,
            appEcsDebug: !!bridgeState.appEcsDebug,
            devToolsConnected: bridgeState.devToolsConnected,
            original_message: Serializer.serialize(message),
        },
    });
    window.postMessage(
        {
            source: 'bridge',
            data: message,
        },
        '*',
    );
}
