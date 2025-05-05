import { ContentScriptLoggingConfig } from '@devinspectx/extension/content_script/content_logging';

import { LoggingService } from '@shared/utils/LoggingService';
import { csState } from './cs_state';
import { JsonObject } from '@shared/types/serialization';
import { Serializer } from '@devinspectx/extension/utils/serializer-util';

const logger = LoggingService.getInstance();

export const bgOnMessageHandler = (message: JsonObject) => {
    console.dir(Serializer.serialize(message));
    ContentScriptLoggingConfig.logToGraylog &&
        logger.logMessage({
            host: ContentScriptLoggingConfig.source,
            short_message: 'message received in content script',
            _origin: message._origin,
            _destination: message._destination,
            _channel_type: 'port',
            _event: 'onMessage',
            _data: {
                origin_id: csState.instanceId,
                port: !!csState.value,
                message: Serializer.serialize(message),
            },
        });
    // Forward messages from the DevTools panel to the page
    if (message.source === 'devtools-panel') {
        window.postMessage(
            {
                source: message.source,
                data: {
                    ...{
                        _origin: message._origin,
                        _destination: message._destination,
                        _channel_type: 'window',
                        _event: 'postMessage',
                    },
                    ...message.data as JsonObject,
                },
            },
            '*',
        );
    }
};
