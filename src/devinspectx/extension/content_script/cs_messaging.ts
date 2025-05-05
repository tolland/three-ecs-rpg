import { csState } from '@ext-cs/cs_state';
import { JsonObject } from '@shared/types/serialization';
import { LoggingService } from '@shared/utils/LoggingService';
import { ContentScriptLoggingConfig } from '@ext-cs/content_logging';
import { Serializer } from '@devinspectx/extension/utils/serializer-util';

const logger = LoggingService.getInstance();

export function sendMessage(message: JsonObject): void {
    if (csState.value) {
        csState.value.postMessage({
            source: 'content-script',
            data: message,
        });
    } else {
        logger.logMessage({
            host: ContentScriptLoggingConfig.source,
            short_message: 'cs port is null',
            _data: {
                message: Serializer.serialize(message),
            },
        });
    }
}
