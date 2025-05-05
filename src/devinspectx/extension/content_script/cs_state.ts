// src/devinspectx/extension/content_script/cs_state.ts
import { generateMessageId } from '@devinspectx/extension/utils/message-type-conversion';

/**
 *
 */

interface ContentScriptState {
    value?: chrome.runtime.Port;
    disconnectInterval?: TimeoutId;
    connectInterval?: TimeoutId;
    instanceId: string;
}

export const csState: ContentScriptState = {
    value: undefined,
    disconnectInterval: undefined,
    connectInterval: undefined,
    instanceId: `cs-${generateMessageId()}`,
};
