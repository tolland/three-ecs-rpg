// src/devinspectx/extension/panel/send_message.ts
import { panelState } from '@panel/panel_state';
import { PanelLoggingConfig } from '@panel/logging_config';
import { LoggingService } from '@shared/utils/LoggingService';
import { JsonObject } from '@shared/types/serialization';
import { Serializer } from '@devinspectx/extension/utils/serializer-util';

const logger = LoggingService.getInstance();

const msgDefaults: JsonObject = {
    _origin: 'devtools-panel',
    _destination: 'bridge',
};

export function sendMessage(message: any): void {
    PanelLoggingConfig.enabled &&
        PanelLoggingConfig.logToGraylog &&
        logger.logMessage({
            host: PanelLoggingConfig.source,
            short_message: 'sending message via port',
            _channel_type: 'port',
            _origin: 'devtools-panel',
            _destination: 'bridge',
            _devToolsPortName: JSON.stringify(panelState.panelPort?.name),
            _data: {
                port: !!panelState.panelPort,
                message: Serializer.serialize(message),
            },
        });

    if (panelState.panelPort) {
        panelState.panelPort.postMessage({
            ...msgDefaults,
            ...{
                source: 'devtools-panel',
                data: message ,
            },
        });
    } else {
        logger.logMessage({
            host: PanelLoggingConfig.source,
            short_message: 'panelPort is null',
            _origin: 'devtools-panel',
            _destination: 'background',
            _data: {
                port: !!panelState.panelPort,
                message: Serializer.serialize(message),
            },
        });
    }
}
