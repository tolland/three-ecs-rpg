//src/devinspectx/extension/service_worker/state.ts
import { MyPort } from '@devinspectx/types/runtime-port-nonnull';
import { TabId } from '@devinspectx/types/message-get-tabid';
import { generateMessageId } from '@devinspectx/extension/utils/message-type-conversion';


export const instanceId = `${chrome.runtime.id}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/**
 * Connection types
 *
 * originally the thought was that the panel and devtools js would have a tabId
 * in common with the inspected page, but this is not the case. so this tabID
 * is the tabId of the devtools panel
 */

// type ConnectionMap = Record<TabId, chrome.runtime.Port>;
type ConnectionChannel = string;

export const connections: Map<ConnectionChannel, MyPort[]> = new Map();

/**
 * list of ports to notify for a content page tabId message
 *
 * set by a connect-ready message
 */
export const connection_tabs: Record<TabId, MyPort[]> = {};

interface BgState {
    bgInterval: TimeoutId | undefined;
    connections: Map<ConnectionChannel, MyPort[]>;
    connection_tabs: Record<TabId, MyPort[]>;
    instanceId: string;
}

export const bgState: BgState = {
    connections: connections,
    connection_tabs: connection_tabs,
    bgInterval: undefined,
    instanceId: `bg-${generateMessageId()}`,
};
