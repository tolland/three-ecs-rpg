// Content script message relay
import { PortMessage, RoutedMessage } from '@devinspectx/types/message-types';
import {
    convertFromPortMessage,
    convertToPortMessage,
    isPortMessage,
    isRoutedMessage,
    relayMessage,
} from '@devinspectx/extension/utils/message-type-conversion';
import {
    LoggingConfig,
    MessageLogger,
} from '@devinspectx/extension/utils/logger-util';

export class ContentScriptMessageRelay {
    private port: chrome.runtime.Port;
    private logger: MessageLogger;

    constructor(config: LoggingConfig, instanceId: string) {
        this.port = chrome.runtime.connect({ name: 'content-script' });
        this.logger = new MessageLogger(config, instanceId);
        this.setupListeners();
    }

    private setupListeners() {
        // Listen for window.postMessage from bridge
        window.addEventListener('message', async (event) => {
            if (!event.data || typeof event.data !== 'object') return;

            const routedMsg = event.data as RoutedMessage;
            if (!isRoutedMessage(routedMsg)) return;

            // Log the received message
            await this.logger.logMessageReceived(routedMsg, 'postMessage');

            // Check if content script should handle or relay this message
            if (routedMsg.route.currentReceiver === 'content') {
                this.handleMessage(routedMsg);
            } else if (
                routedMsg.route.currentReceiver === 'panel' ||
                routedMsg.route.currentReceiver === 'background'
            ) {
                // Relay to background script
                this.relayToBackground(routedMsg);
            }
        });

        // Listen for messages from background script
        this.port.onMessage.addListener(async (portMsg: PortMessage) => {
            if (!isPortMessage(portMsg)) return;

            const routedMsg = convertFromPortMessage(portMsg);

            // Log the received message
            await this.logger.logMessageReceived(routedMsg, 'port', {
                portName: this.port.name,
                portId: (this.port as any).id,
            });

            // Check if this content script is the final destination
            if (routedMsg.route.destination === 'content') {
                this.handleMessage(routedMsg);
            } else if (routedMsg.route.destination === 'bridge') {
                // Relay to bridge via postMessage
                this.relayToBridge(routedMsg);
            }
        });
    }

    private async relayToBackground(msg: RoutedMessage) {
        // Update current leg information
        const relayedMsg = relayMessage(
            msg,
            'content',
            msg.route.currentReceiver,
        );

        // Log the relay operation
        await this.logger.logMessageRelay(
            msg,
            'content',
            msg.route.currentReceiver,
        );

        // Convert to Port format and send
        const portMsg = convertToPortMessage(relayedMsg);

        // Log the message being sent
        await this.logger.logMessageSent(relayedMsg, 'port');

        // Send the message
        this.port.postMessage(portMsg);
    }

    private async relayToBridge(msg: RoutedMessage) {
        // Update current leg information
        const relayedMsg = relayMessage(msg, 'content', 'bridge');

        // Log the relay operation
        await this.logger.logMessageRelay(msg, 'content', 'bridge');

        // Log the message being sent
        await this.logger.logMessageSent(relayedMsg, 'postMessage');

        // Send via postMessage
        window.postMessage(relayedMsg, '*');
    }

    private handleMessage(msg: RoutedMessage) {
        // Handle messages targeted at content script
    }
}
