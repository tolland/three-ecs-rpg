// src/devinspectx/extension/panel/panel_state.ts
import { generateMessageId } from '@devinspectx/extension/utils/message-type-conversion';

/**
 *
 */

interface PanelState {
    panelPort: chrome.runtime.Port | undefined;
    instanceId: string;
}

export const panelState: PanelState = {
    panelPort: undefined,
    instanceId: `cs-${generateMessageId()}`,
};
