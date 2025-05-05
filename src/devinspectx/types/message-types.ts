// src/devinspectx/types/message-types.ts
import { GetTabIdMessage } from '@devinspectx/types/message-get-tabid';
import {
    CommandMessage,
    ConnectionMessage,
    RequestMessage,
    ResponseMessage,
    UpdateMessage,
} from '@devinspectx/types/message-request-varieties';

/**
 * Type definitions for messages passed between different parts of the extension
 */

// Define all possible message sources and destinations
export type MessageSource = 'bridge' | 'content' | 'devtools' | 'panel' | 'background';
export type MessageDestination = MessageSource;

// Define possible message routes (legs of the journey)
export type MessageRoute = {
    origin: MessageSource;      // Original sender
    destination: MessageDestination; // Final recipient
    currentSender: MessageSource;    // Current leg sender
    currentReceiver: MessageDestination; // Current leg receiver
};

// Base message interface with routing information
export interface MessageWithRouting {
    route: MessageRoute;
    messageId: string;  // Unique ID to track message through system
    timestamp: number;
    responseToId?: string; // Optional reference to a message this is responding to
}


// Base message content types (what your existing system has)
export type MessageContent =
    | GetTabIdMessage
    | ConnectionMessage
    | RequestMessage
    | ResponseMessage
    | UpdateMessage
    | CommandMessage;

// Combined message type with routing and content
export interface RoutedMessage extends MessageWithRouting {
    content: MessageContent;
}

// Window.postMessage wrapper
export interface PostMessageEvent {
    type: 'message';
    data: RoutedMessage;
}

// Chrome.runtime.Port message wrapper
export interface PortMessage {
    routingInfo: MessageRoute;
    messageId: string;
    timestamp: number;
    responseToId?: string;
    contentType: string;
    payload: any;
}


// Base message interface
export interface BridgeMessage {
  type: string;
  timestamp?: number;
}

// Wrapped message with source information
export interface WrappedMessage {
  source: MessageSource;
  data: BridgeMessage;
}
