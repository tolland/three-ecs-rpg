// src/devinspectx/extension/service_worker/background.ts

import { LoggingService } from '@shared/utils/LoggingService';
import { BackgroundScriptLoggingConfig } from '@devinspectx/extension/service_worker/logging_config';
import { bgState, connections, instanceId } from '@ext-bg/state';
import {
    onInstalledHandler,
    onStartupHandler,
    onSuspendHandler,
} from '@ext-bg/lifecycle';
import { Serializer } from '@devinspectx/extension/utils/serializer-util';
import { parseConnectionsToJson } from '@devinspectx/extension/utils/logger-util';
import { tabOnActivatedHandler } from '@ext-bg/tabs';
import { BackgroundMessageRelay } from '@ext-bg/background_message_handler';

/**
 * Background script for the Three.js ECS Inspector extension
 * This script handles communication between the DevTools panel and content scripts
 */

chrome.runtime.onInstalled.addListener(onInstalledHandler);
chrome.runtime.onStartup.addListener(onStartupHandler);
chrome.runtime.onSuspend.addListener(onSuspendHandler);
//chrome.windows.onFocusChanged.addListener(onFocusChangedHandler);

// Listen for connections from DevTools panel or content scripts
// chrome.runtime.onConnect.addListener(onConnectHandler);
// listen for messages from content script request tabId
// chrome.runtime.onMessage.addListener(onMessageHandler);

// hook tab activation - is working? I think not firing
chrome.tabs.onActivated.addListener(tabOnActivatedHandler);

function logConnectionStatus() {
    BackgroundScriptLoggingConfig.logToGraylog &&
        LoggingService.getInstance().logMessage({
            host: BackgroundScriptLoggingConfig.source,
            short_message: 'logging status in bg script',
            _origin: 'background',
            _destination: 'background',
            _action: 'heartbeat',
            _data: {
                origin_id: instanceId,
                connections: parseConnectionsToJson(connections),
            },
        });
    console.log('[Content] Background script status: %O', {
        origin_id: instanceId,
        connections: Serializer.serialize(connections),
    });
}

bgState.bgInterval = setInterval(logConnectionStatus, 10000);

(async function initializeBackground() {
    console.log('✅ Background script running');

    const bus = new BackgroundMessageRelay(
        BackgroundScriptLoggingConfig,
        bgState.instanceId,
    );

    await new Promise((res) => setTimeout(res, 500)); // Wait for possible setup

    const myTabs = await chrome.tabs.query({});
    for (const tab of myTabs) {
        if (tab.url && tab.url.endsWith('renderer/index.html')) {
            if (tab?.id) {
                console.log(`trying to inject into ${tab.url}`);
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content-script.js'],
                });
            } else {
                console.warn('[Background] Content script not be loaded.');
            }
        }
    }
})();
