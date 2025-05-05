// src/devinspectx/extension/content_script/index.ts
import { getTabId, injectBridgeScript, startHeartBeat } from '@ext-cs/cs_utils';
import {
    connectToBackend,
    registerHandlers,
    windowOnMessageHandler,
} from '@ext-cs/connect';
import { BridgeMessageHandler } from '@bridge/bridge_message_handler';
import { BridgeScriptLoggingConfig } from '@bridge/logging_config';
import { bridgeState } from '@bridge/bridge_state';
import { ContentScriptMessageRelay } from '@ext-cs/content_message_relay';
import { ContentScriptLoggingConfig } from '@ext-cs/content_logging';
import { csState } from '@ext-cs/cs_state';

/**
 * Content script for the Three.js ECS Inspector extension
 * This script is injected into the page and serves as a bridge between
 * the page context (where the application runs) and the extension
 *
 * this gets wrapped into an "iife" module by rollup
 */



const onReady = () => {

    const bus = new ContentScriptMessageRelay(
        ContentScriptLoggingConfig,
        csState.instanceId,
    );

    const contentTabid = getTabId();

    // inject the bridge script into the renderer page
    injectBridgeScript();

    // connect to the background script and handle disconnects
    //connectToBackend();

    // register handlers for messages from the extension
    //registerHandlers();

    // Listen for messages from the page (bridge script)
    //window.addEventListener('message', windowOnMessageHandler);

    // At the end of content-script.js
    startHeartBeat();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
} else {
    onReady();
}
