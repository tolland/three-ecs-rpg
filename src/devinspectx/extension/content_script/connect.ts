import { csState } from '@ext-cs/cs_state';
import { bgOnMessageHandler } from '@ext-cs/cs_handlers';
import { logCSOnMessage, logDisconnect } from '@devinspectx/extension/utils/logger-util';
import { ContentScriptLoggingConfig } from '@ext-cs/content_logging';

/**
 * Handle being disconnected from the background script.
 *
 *
 */
export const bgOnDisconnectHandler = () => {
    logDisconnect(
        ContentScriptLoggingConfig,
        csState.value!,
        csState.instanceId,
    );

    csState.value = undefined;
    console.log('[Three.js ECS Inspector] Disconnected from background script');

    // Notify the bridge page
    window.postMessage(
        {
            source: 'content-script',
            data: {
                type: 'disconnected',
            },
        },
        '*',
    );

    // Try to reconnect after a delay
    csState.disconnectInterval = setTimeout(connectToBackend, 3000);
};

export const windowOnMessageHandler = (event: MessageEvent) => {
    logCSOnMessage(ContentScriptLoggingConfig, event.data, csState.instanceId);
    if (event.data && event.data.source === 'bridge') {
        // Forward messages to the background script
        if (csState.value) {
            csState.value.postMessage({
                source: event.data.source,
                data: event.data.data,
            });
        } else {
            console.warn(
                '[Three.js ECS Inspector] Cannot forward message, not connected to background script',
            );
        }
    }
};

export const removeEventHandlers = () => {
    window.removeEventListener('message', windowOnMessageHandler);
    csState.connectInterval && clearInterval(csState.connectInterval);
    csState.disconnectInterval && clearInterval(csState.disconnectInterval);
};

export function connectToBackend() {
    try {
        csState.value = chrome.runtime.connect({
            name: 'background-script',
        });
    } catch (error) {
        if (
            error instanceof Error &&
            error.message.includes('Extension context invalidated')
        ) {
            console.error(
                '[Three.js ECS Inspector] Execution context invalidated:',
                error,
            );
            removeEventHandlers();
        } else {
            console.error(
                '[Three.js ECS Inspector] Unexpected error during connection:',
                error,
            );
        }
        return;
    }
}

export function registerHandlers() {
    // Listen for messages from the devtools panel sent via bg script
    csState.value!.onMessage.addListener(bgOnMessageHandler);
    csState.value!.onDisconnect.addListener(bgOnDisconnectHandler);
}
