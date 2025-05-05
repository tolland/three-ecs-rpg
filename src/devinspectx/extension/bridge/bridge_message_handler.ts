// src/devinspectx/extension/bridge/bridge_message_handler.ts
import {
    MessageContent,
    MessageDestination,
    RoutedMessage,
} from '@devinspectx/types/message-types';
import {
    createMessage,
    isRoutedMessage,
} from '@devinspectx/extension/utils/message-type-conversion';
import {
    CommandMessage,
    RequestMessage,
} from '@devinspectx/types/message-request-varieties';
import {
    LoggingConfig,
    MessageLogger,
} from '@devinspectx/extension/utils/logger-util';

/**
 * Message handling utilities with type safety
 */

// Bridge message handler
export class BridgeMessageHandler {
    private logger: MessageLogger;

    constructor(config: LoggingConfig, instanceId: string) {
        this.logger = new MessageLogger(config, instanceId);
    }

    handleMessage(event: MessageEvent) {
        // Type guard for window.postMessage events
        if (!event.data || typeof event.data !== 'object') return;

        const routedMsg = event.data as RoutedMessage;
        if (!isRoutedMessage(routedMsg)) return;

        // Check if this bridge is the intended recipient
        if (routedMsg.route.currentReceiver !== 'bridge') return;

        // Log the received message
        this.logger.logMessageReceived(routedMsg, 'postMessage');

        // Process based on content type
        switch (routedMsg.content.type) {
            case 'request':
                this.handleRequest(routedMsg);
                break;
            case 'command':
                this.handleCommand(routedMsg);
                break;
            // Handle other types
        }
    }

    // Send message to content script
    async sendMessage(
        content: MessageContent,
        destination: MessageDestination,
    ) {
        const msg = createMessage('bridge', destination, content);

        // Log the message before sending
        await this.logger.logMessageSent(msg, 'postMessage');

        // Send the message
        window.postMessage(msg, '*');
    }

    private handleRequest(msg: RoutedMessage) {
        const requestContent = msg.content as RequestMessage;
        // Process request and send response
    }

    private handleCommand(msg: RoutedMessage) {
        const commandContent = msg.content as CommandMessage;
        // Execute command
    }
}
