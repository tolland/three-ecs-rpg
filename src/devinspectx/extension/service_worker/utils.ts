// src/devinspectx/extension/service_worker/utils.ts

export function hasSenderTab(
    port: chrome.runtime.Port,
): port is chrome.runtime.Port & {
    sender: chrome.runtime.MessageSender & {
        tab: chrome.tabs.Tab & { id: number; url: string };
    };
} {
    const tab = port.sender?.tab;
    return !!tab && typeof tab.id === 'number' && typeof tab.url === 'string';
}
