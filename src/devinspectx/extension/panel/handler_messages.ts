import { PanelLoggingConfig } from '@panel/logging_config';
import { LoggingService } from '@shared/utils/LoggingService';
import { panelState } from '@panel/panel_state';
import { instanceId } from '@panel/panel_status';
import {
    handleBackgroundMessage,
    handleContentMessage,
} from '@panel/messaging';
import { JsonObject } from '@shared/types/serialization';

export const onMessageHandler = (message: JsonObject) => {
    PanelLoggingConfig.enabled &&
        PanelLoggingConfig.logToGraylog &&
        LoggingService.getInstance().logMessage({
            host: PanelLoggingConfig.source,
            short_message: 'onMessageHandler in panel received message',
            _origin: message._origin,
            _destination: message._destination,
            _devToolsPortName: JSON.stringify(panelState.panelPort?.name),
            _channel_type: 'port',
            _event: 'onMessage',
            _data: {
                origin_id: instanceId,
                port: !!panelState.panelPort,
                message: JSON.stringify(message).slice(0, 1000),
            },
        });
    if (!message || !message.data) return;
    const { source, data } = message;
    if (source === 'bridge') handleContentMessage(data);
    else if (source === 'background') handleBackgroundMessage(data);
};
