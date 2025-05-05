import { LoggingConfig, MessageLogger } from '@devinspectx/extension/utils/logger-util';
import { MessageSource, PortMessage, RoutedMessage } from '@devinspectx/types/message-types';
import {
    convertFromPortMessage, convertToPortMessage,
    isPortMessage,
    relayMessage,
} from '@devinspectx/extension/utils/message-type-conversion';

export class BackgroundMessageRelay {
    private connections: Map<number, chrome.runtime.Port> = new Map();
    private logger: MessageLogger;

    constructor(
        config: LoggingConfig,
        instanceId: string
    ) {
        this.logger = new MessageLogger(config, instanceId);
        this.setupConnectionListener();
    }

    private setupConnectionListener() {
        chrome.runtime.onConnect.addListener((port) => {
            // Determine connection type from port name
            const portType = port.name as MessageSource;

            // For content script connections, store by tab ID
            if (portType === 'content') {
                const tabId = port.sender?.tab?.id;
                if (tabId) {
                    this.connections.set(tabId, port);
                }
            }

            // Listen for messages on this port
            port.onMessage.addListener(async (portMsg) => {
                // Log received message
                const routedMsg = convertFromPortMessage(portMsg);
                await this.logger.logMessageReceived(routedMsg, 'port', {
                    portName: port.name,
                    portId: (port as any).id,
                    senderTabId: port.sender?.tab?.id
                });

                // Handle relay
                this.handleRelayMessage(portMsg);
            });

            // Handle disconnection
            port.onDisconnect.addListener(() => {
                if (portType === 'content') {
                    const tabId = port.sender?.tab?.id;
                    if (tabId) {
                        this.connections.delete(tabId);
                    }
                }
            });
        });
    }

    private async handleRelayMessage(portMsg: PortMessage) {
        if (!isPortMessage(portMsg)) return;

        const routedMsg = convertFromPortMessage(portMsg);
        const nextReceiver = routedMsg.route.destination;

        // Update routing for next leg
        const relayedMsg = relayMessage(
            routedMsg,
            'background',
            nextReceiver
        );

        // Log the relay operation
        await this.logger.logMessageRelay(
            routedMsg,
            'background',
            nextReceiver
        );

        // Convert message to port format
        const relayedPortMsg = convertToPortMessage(relayedMsg);

        // Route to appropriate connection
        if (nextReceiver === 'panel') {
            // Find panel connection and relay
            await this.sendToPanel(relayedPortMsg);
        } else if (nextReceiver === 'content' || nextReceiver === 'bridge') {
            // Find content script connection by tab ID
            await this.sendToContentScript(relayedPortMsg);
        }
    }

    private async sendToPanel(portMsg: PortMessage) {
        // Logic to find and send to panel port
        const routedMsg = convertFromPortMessage(portMsg);

        // Log the message being sent
        await this.logger.logMessageSent(routedMsg, 'port');

        // Send the message to the panel
        // Implementation depends on how you're managing panel connections
    }

    private async sendToContentScript(portMsg: PortMessage) {
        // Logic to find correct content script port by tab ID
        const routedMsg = convertFromPortMessage(portMsg);

        // Get tab ID from message or context
        const tabId = this.determineTabIdFromMessage(routedMsg);
        if (!tabId) return;

        const contentPort = this.connections.get(tabId);
        if (!contentPort) return;

        // Log the message being sent
        await this.logger.logMessageSent(routedMsg, 'port');

        // Send the message
        contentPort.postMessage(portMsg);
    }

    private determineTabIdFromMessage(message: RoutedMessage): number | undefined {
        // Logic to extract tab ID from message
        // This might be stored in message metadata or context
        return undefined; // Placeholder
    }
}
