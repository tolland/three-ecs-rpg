import { LoggingService } from '@shared/utils/LoggingService';
import { BridgeScriptLoggingConfig } from '@bridge/logging_config';
import { bridgeState } from '@bridge/bridge_state';
import { sendMessage } from '@bridge/send_message';
import { findAppObjects } from './find_app_objects';
import { handleRequest } from '@bridge/handle_requests';
import {
    handleCommand,
    sendInitialState,
    startUpdates,
    stopUpdates,
} from '@bridge/updating';
import { JsonObject } from '@shared/types/serialization';
import { Serializer } from '@devinspectx/extension/utils/serializer-util';
import { handleMessage } from '@bridge/handle_message';
import { logConnectionStatus } from '@ext-cs/cs_utils';
import { BridgeMessageHandler } from '@bridge/bridge_message_handler';

const logger = LoggingService.getInstance();

/**
 * Bridge script injected into the page to access Three.js and ECS objects
 * This script runs in the page context and can access the application's objects
 *
 * this gets wrapped into an "iife" module by rollup
 */

const bus = new BridgeMessageHandler(
    BridgeScriptLoggingConfig,
    bridgeState.instanceId,
);

// Initialize communication
console.log('[Three.js ECS Inspector] Bridge script loaded');

// ECS related helper functions

// Set up message listener
window.addEventListener('message', (event: MessageEvent) => {
    if (event.data.source === 'bridge') return;
    logger.logMessage({
        host: BridgeScriptLoggingConfig.source,
        short_message: `handling message in bridge.js from ${event.data.source}`,
        _channel_type: 'window',
        _event: 'message',
        _origin: event.data?._origin ?? 'unknown',
        _destination: event.data?._destination ?? 'unknown',
        _data: {
            source: event.data.source,
            data: Serializer.serialize(event.data.data),
        },
    });

    // Only handle messages from the content script
    if (event.data && event.data.source === 'devtools-panel') {
        handleMessage(event.data.data);
    }
});

// Try to find app objects immediately
findAppObjects();

const discoverInterval = setInterval(() => {
    if (Object.values(findAppObjects()).every((value) => value)) {
        clearInterval(discoverInterval);
        console.log(
            '[Bridge] discoverAppObjects successful, interval cleared.',
        );
    }
}, 2000);

setInterval(logConnectionStatus, 10000);

console.log("got to before bus.sendMessage");
// Notify that bridge is ready
bus.sendMessage(
    {
        type: 'connected',
    },
    'panel',
);
