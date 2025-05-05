import { initUI } from './ui_init';
import { panelState } from '@panel/panel_state';
import { logConnectionStatus } from '@panel/panel_status';
import { onMessageHandler } from '@panel/handler_messages';
import { sendMessage } from '@panel/send_message';
import { BackgroundMessageRelay } from '@ext-bg/background_message_handler';
import { BackgroundScriptLoggingConfig } from '@ext-bg/logging_config';
import { bgState } from '@ext-bg/state';
import { PanelMessageHandler } from '@panel/panel_message_handler';

async function initializePanel(): Promise<void> {
    console.log('Initializing panel...');

    const bus = new PanelMessageHandler(
        BackgroundScriptLoggingConfig,
        panelState.instanceId,
    );

    const contentTabId = chrome.devtools.inspectedWindow.tabId;

    // panelState.panelPort = chrome.runtime.connect({
    //     name: `background-script`,
    // });
    //
    // panelState.panelPort.onMessage.addListener(onMessageHandler);

    bus.sendMessage({
        type: 'connected',
    });

    logConnectionStatus();

    setInterval(logConnectionStatus, 5000);
    initUI();

    await bus.requestSceneData();
    // sendMessage({
    //     name: 'request-state',
    //     contentTabId: contentTabId,
    // });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Panel DOM loaded, initializing UI');
    await initializePanel();
});
