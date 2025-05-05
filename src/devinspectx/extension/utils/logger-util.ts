// src/devinspectx/extension/utils/logger-util.ts
import { LoggingService } from '@shared/utils/LoggingService';
import { JsonObject } from '@shared/types/serialization';
import { MyPort } from '@devinspectx/types/runtime-port-nonnull';
import { Serializer } from '@devinspectx/extension/utils/serializer-util';
/**
 * Enhanced logging for messaging system
 */
import {
    MessageDestination,
    MessageSource,
    RoutedMessage,
} from '@devinspectx/types/message-types';
import Port = chrome.runtime.Port;

const logger = LoggingService.getInstance();

export function die(obj: any, message: string): never {
    console.error(`[Three.js ECS Inspector] ${message}`, obj);
    throw new Error(message);
}

export interface LoggingConfig {
    source: string;
    enabled: boolean;
    logToGraylog: boolean;
    logConstructors?: boolean;
    logMethods?: boolean;
    logMessages?: boolean; // New field for message logging
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    styleLifecycle?: (event: string) => string;
    styleFocusChange?: (name: string) => string;
}

// Graylog logger service enhanced for messaging system
export class MessageLogger {
    private readonly config: LoggingConfig;
    private readonly instanceId: string;

    constructor(config: LoggingConfig, instanceId: string) {
        this.config = config;
        this.instanceId = instanceId;
    }

    // Log a message being sent
    async logMessageSent(
        message: RoutedMessage,
        channel: 'postMessage' | 'port',
    ) {
        console.log("got to logMessageSent", message, channel);
        if (!this.shouldLog()) return;

        await this.logToGraylog({
            host: this.config.source,
            short_message: `Message sent from ${message.route.currentSender} to ${message.route.currentReceiver}`,
            _origin: message.route.origin,
            _destination: message.route.destination,
            _current_sender: message.route.currentSender,
            _current_receiver: message.route.currentReceiver,
            _channel_type: channel,
            _event: 'sendMessage',
            _message_id: message.messageId,
            _message_type: message.content.type,
            _data: {
                currentId: this.instanceId,
                message: this.safeSerialize(message),
            },
        });
    }

    // Log a message being received
    async logMessageReceived(
        message: RoutedMessage,
        channel: 'postMessage' | 'port',
        portInfo?: any,
    ) {
        if (!this.shouldLog()) return;

        await this.logToGraylog({
            host: this.config.source,
            short_message: `Message received by ${message.route.currentReceiver} from ${message.route.currentSender}`,
            _origin: message.route.origin,
            _destination: message.route.destination,
            _current_sender: message.route.currentSender,
            _current_receiver: message.route.currentReceiver,
            _channel_type: channel,
            _event: 'onMessage',
            _message_id: message.messageId,
            _message_type: message.content.type,
            _data: {
                currentId: this.instanceId,
                portInfo: portInfo ? this.safeSerialize(portInfo) : undefined,
                message: this.safeSerialize(message),
            },
        });
    }

    // Log a message being relayed
    async logMessageRelay(
        message: RoutedMessage,
        fromComponent: MessageSource,
        toComponent: MessageDestination,
    ) {
        if (!this.shouldLog()) return;

        await this.logToGraylog({
            host: this.config.source,
            short_message: `Message relayed from ${fromComponent} to ${toComponent}`,
            _origin: message.route.origin,
            _destination: message.route.destination,
            _previous_sender: message.route.currentSender,
            _previous_receiver: message.route.currentReceiver,
            _new_sender: fromComponent,
            _new_receiver: toComponent,
            _channel_type: 'relay',
            _event: 'relayMessage',
            _message_id: message.messageId,
            _message_type: message.content.type,
            _data: {
                currentId: this.instanceId,
                message: this.safeSerialize(message),
            },
        });
    }

    // Generic logging method for graylog
    async logToGraylog(logData: any) {
        console.log("got to logToGraylog", logData);
        if (!this.config.logToGraylog) return;

        try {
            // Add required GELF fields
            const gelfData = {
                timestamp: Date.now() / 1000,
                level: this.getLogLevel(),
                _newlogger: "true",
                ...logData,
            };
            LoggingService.getInstance().logMessage(gelfData);
        } catch (error) {
            // Log to console if Graylog logging fails
            console.error('Failed to log to Graylog:', error);
        }
    }

    private shouldLog(): boolean {
        return (
            this.config.enabled &&
            (this.config.logMessages === undefined || this.config.logMessages)
        );
    }

    private getLogLevel(): number {
        switch (this.config.logLevel) {
            case 'debug':
                return 7;
            case 'info':
                return 6;
            case 'warn':
                return 4;
            case 'error':
                return 3;
            default:
                return 6; // Default to INFO
        }
    }

    private safeSerialize(obj: any): string {
        try {
            return JSON.stringify(obj);
        } catch (error) {
            return `[Unserializable object: ${error instanceof Error ? error.message : String(error)}]`;
        }
    }
}

export const logConnect = (
    config: JsonObject,
    port: chrome.runtime.Port,
    instanceId: string,
) => {
    logger.logMessage({
        host: config.source,
        short_message: 'handling onConnect',
        _channel_type: 'port',
        _event: 'onConnect',
        _devToolsPortName: port.name,
        _data: {
            currentId: instanceId,
            senderId: port.sender?.id ?? 'unknown',
            port: parsePortToJson(port),
        },
    });
};

export const logDisconnect = (
    config: JsonObject,
    port: chrome.runtime.Port,
    instanceId: string,
) => {
    config.enabled &&
        logger.logMessage({
            host: config.source,
            short_message: 'handling onDisconnect',
            _channel_type: 'port',
            _event: 'onDisconnect',
            _devToolsPortName: port.name,
            _data: {
                currentId: instanceId,
                senderId: port.sender?.id ?? 'unknown',
                port: parsePortToJson(port),
            },
        });
};

export const logOnMessage = (
    config: JsonObject,
    port: MyPort,
    message: JsonObject,
    instanceId: string,
    title: string,
) => {
    logger.logMessage({
        host: config.source,
        short_message: `onMessage log '${title}'`,
        _origin: message._origin ?? 'none',
        _destination: message._destination ?? 'none',
        _channel_type: 'port',
        _event: 'onMessage',
        _data: {
            currentId: instanceId,
            tabId: parsePortToJson(port),
            message: Serializer.serialize(message),
            portName: port.name,
        },
    });
};

export const parsePortToJson = (port: Port): JsonObject => {
    return {
        name: port.name,
        senderId: port.sender?.id ?? 'unknown',
        senderUrl: port.sender?.url ?? 'unknown',
        senderTabId: port.sender?.tab?.id ?? 'unknown',
        senderTabUrl: port.sender?.tab?.url ?? 'unknown',
        senderWindowId: port.sender?.tab?.windowId ?? 'unknown',
    };
};

export const parseConnectionsToJson = (
    connections: Map<string, MyPort[]>,
): JsonObject => {
    const connectionsJson: JsonObject = {};
    for (const [key, value] of connections.entries()) {
        connectionsJson[key] = value.map((port) => parsePortToJson(port));
    }
    return connectionsJson;
};

export const logCSOnMessage = (
    config: JsonObject,
    message: JsonObject,
    contentInstanceId: string,
) => {
    config.enabled &&
        config.logToGraylog &&
        logger.logMessage({
            host: config.source,
            short_message: 'message from bridge',
            _channel_type: 'window',
            _event: 'message',
            _data: {
                content_id: contentInstanceId,
                message: Serializer.serialize(message.data),
            },
        });
};
