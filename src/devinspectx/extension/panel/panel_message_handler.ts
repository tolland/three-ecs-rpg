// src/devinspectx/extension/panel/panel_message_handler.ts
import {
    EntityUpdateMessage, ResponseMessage, SceneUpdateMessage,
    UpdateMessage,
} from '@devinspectx/types/message-request-varieties';
import { MessageContent, PortMessage, RoutedMessage } from '@devinspectx/types/message-types';
import {
    convertFromPortMessage,
    convertToPortMessage,
    createMessage,
    generateMessageId, isPortMessage,
} from '@devinspectx/extension/utils/message-type-conversion';
import { LoggingConfig, MessageLogger } from '@devinspectx/extension/utils/logger-util';

/**
 * Panel and background script message handlers
 */

// DevTools panel message handler
export class PanelMessageHandler {
    private port: chrome.runtime.Port;
  private logger: MessageLogger;

  constructor(
    config: LoggingConfig,
    instanceId: string
  ) {
        this.port = chrome.runtime.connect({ name: 'panel' });
    this.logger = new MessageLogger(config, instanceId);
        this.setupListeners();
    }

    private setupListeners() {
    this.port.onMessage.addListener(async (portMsg: PortMessage) => {
            if (!isPortMessage(portMsg)) return;

            const routedMsg = convertFromPortMessage(portMsg);

      // Log the received message
      await this.logger.logMessageReceived(routedMsg, 'port', {
        portName: this.port.name,
        portId: (this.port as any).id
      });

            // Only process messages meant for the panel
            if (routedMsg.route.currentReceiver !== 'panel') return;

            this.processMessage(routedMsg);
        });
    }

    // Send message to bridge via background script
  async sendMessage(content: MessageContent) {
        const msg = createMessage('panel', 'bridge', content);

    // Log the message being sent
    await this.logger.logMessageSent(msg, 'port');

    // Send the message
        this.port.postMessage(convertToPortMessage(msg));
    }

    // Request scene data
  async requestSceneData() {
    await this.sendMessage({
            type: 'request',
            target: 'scene',
            action: 'getHierarchy',
            id: generateMessageId(),
        });
    }

    private processMessage(msg: RoutedMessage) {
        // Process based on content type
        switch (msg.content.type) {
            case 'update':
                this.handleUpdate(msg.content as UpdateMessage);
                break;
            case 'response':
                this.handleResponse(msg.content as ResponseMessage);
                break;
            // Handle other types
        }
    }

    private handleUpdate(updateMsg: UpdateMessage) {
        // Process update based on target
        switch (updateMsg.target) {
            case 'scene':
                this.updateSceneView(updateMsg as SceneUpdateMessage);
                break;
            case 'entities':
                this.updateEntityView(updateMsg as EntityUpdateMessage);
                break;
            // Handle other targets
        }
    }

    private handleResponse(responseMsg: ResponseMessage) {
        // Handle response
    }

    private updateSceneView(sceneUpdate: SceneUpdateMessage) {
        // Update UI with scene data
    }

    private updateEntityView(entityUpdate: EntityUpdateMessage) {
        // Update UI with entity data
    }
}
