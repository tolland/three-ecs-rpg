// src/devinspectx/extension/service_worker/handlers.ts
import { LoggingService } from '@shared/utils/LoggingService';
import { BackgroundScriptLoggingConfig } from '@devinspectx/extension/service_worker/logging_config';
import { connections, instanceId } from './state';
import {
    logConnect,
    logOnMessage,
} from '@devinspectx/extension/utils/logger-util';
import { MyPort } from '@devinspectx/types/runtime-port-nonnull';
import Port = chrome.runtime.Port;
import { hasSenderTab } from '@ext-bg/utils';
import { JsonObject } from '@shared/types/serialization';
import { MessageType } from '@devinspectx/types/message-get-tabid';

const logger = LoggingService.getInstance();

// Handle one off messages, such as request for TabId by content script
export const onMessageHandler = (
    message: MessageType,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void,
) => {
    if (message.type === 'GET_TAB_ID') {
        sendResponse({ tabId: sender.tab?.id });
    }
    return false; // Synchronous response
};

export function onConnectHandler(origport: Port) {
    logConnect(BackgroundScriptLoggingConfig, origport, instanceId);
    if (!hasSenderTab(origport)) {
        console.error('[Three.js ECS Inspector] No tab ID found in sender');
        return;
    }
    const port = origport as MyPort;
    if (!connections.has(port.name)) {
        connections.set(port.name, []);
    }
    connections.get(port.name)!.push(port);

    port.onMessage.addListener((message: JsonObject) => {
        logOnMessage(
            BackgroundScriptLoggingConfig,
            origport,
            message,
            instanceId,
            `relaying in background from '${origport.sender?.tab?.url}'`
        );
        console.dir(message);
        console.log("message in bg handler");


        let myData: JsonObject = {
            relayed_by_background: 'true',
        };
        for (const key in message) {
            myData[key] = message[key];
        }

        for (const connected_port of connections.get(port.name)!) {
            if (connected_port !== port) {
                connected_port.postMessage(myData);
            }
        }
    });

    port.onDisconnect.addListener(() => {
        const { name, sender } = port;
        const tabId = sender?.tab?.id ?? 'unknown';
        const tabUrl = sender?.tab?.url ?? 'unknown';
        const index = connections.get(port.name)!.indexOf(port);
        if (index !== -1) {
            connections.get(port.name)!.splice(index, 1);
        }

        // Notify connected clients of the discuonnect
        for (const connected_port of connections.get(port.name)!) {
            connected_port.postMessage({
                source: 'background',
                data: {
                    type: 'disconnected',
                    tabUrl: tabUrl,
                    tabId: tabId,
                    index: index,
                },
            });
        }
    });
}
