// src/devinspectx/extension/content_script/cs_utils.ts

import { ContentScriptLoggingConfig } from '@ext-cs/content_logging';
import { csState } from '@ext-cs/cs_state';
import { LoggingService } from '@shared/utils/LoggingService';
import { GetTabIdMessage, GetTabIdResponse, TabId } from '@devinspectx/types/message-get-tabid';

const logger = LoggingService.getInstance();

export async function getTabId(): Promise<TabId> {
    const response = await chrome.runtime.sendMessage<
        GetTabIdMessage,
        GetTabIdResponse
    >({
        type: 'GET_TAB_ID',
    });

    if ('error' in response) {
        throw new Error(response.error);
    }

    return response.tabId;
}

// Inject the bridge script into the page
export function injectBridgeScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('bridge/bridge.js');
    script.addEventListener('load', function () {
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }
    });
    (document.head || document.documentElement).appendChild(script);

    console.log('[Three.js ECS Inspector] Bridge script injected');
}

export function logConnectionStatus() {
    ContentScriptLoggingConfig.logToGraylog &&
        logger.logMessage({
            host: ContentScriptLoggingConfig.source,
            short_message: 'logging status in content-script',
            _action: 'heartbeat',
            _origin: 'content-script',
            _destination: 'background',
            _data: {
                origin_id: csState.instanceId,
                port: !!csState.value,
            },
        });
}

export function startHeartBeat() {
    csState.connectInterval = setInterval(logConnectionStatus, 10000);
}
