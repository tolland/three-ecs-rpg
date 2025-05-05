// src/devinspectx/extension/utils/message-type-conversion.ts
import {
    MessageContent,
    MessageDestination,
    MessageSource,
    PortMessage,
    RoutedMessage,
} from '@devinspectx/types/message-types';



// Helper to generate unique message IDs
export function generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function isRoutedMessage(msg: any): msg is RoutedMessage {
    return msg && typeof msg === 'object' &&
        msg.route && msg.messageId && msg.content;
}

export function isPortMessage(msg: any): msg is PortMessage {
    return msg && typeof msg === 'object' &&
        msg.routingInfo && msg.messageId && msg.contentType;
}

export function convertToPortMessage(routedMsg: RoutedMessage): PortMessage {
    return {
        routingInfo: routedMsg.route,
        messageId: routedMsg.messageId,
        timestamp: routedMsg.timestamp,
        responseToId: routedMsg.responseToId,
        contentType: routedMsg.content.type,
        payload: { ...routedMsg.content }
    };
}

export function convertFromPortMessage(portMsg: PortMessage): RoutedMessage {
    return {
        route: portMsg.routingInfo,
        messageId: portMsg.messageId,
        timestamp: portMsg.timestamp,
        responseToId: portMsg.responseToId,
        content: {
            type: portMsg.contentType,
            ...portMsg.payload
        } as MessageContent
    };
}

// Function to create a new message
export function createMessage(
    origin: MessageSource,
    destination: MessageDestination,
    content: MessageContent
): RoutedMessage {
    return {
        route: {
            origin,
            destination,
            currentSender: origin,
            currentReceiver: destination
        },
        messageId: generateMessageId(),
        timestamp: Date.now(),
        content
    };
}

// Function to relay a message to next leg
export function relayMessage(
    message: RoutedMessage,
    newSender: MessageSource,
    newReceiver: MessageDestination
): RoutedMessage {
    return {
        ...message,
        route: {
            ...message.route,
            currentSender: newSender,
            currentReceiver: newReceiver
        }
    };
}
