// src/devinspectx/types/messaging.ts

/**
 *
 * This is an attempt to prevent constantly having to null check for nullable
 * properties down the port.sender?.tab?.<property> chain. not sure its adding
 * much value.
 *
 */

/**
 * This is a MessageSender that definitely has a sender
 */
export interface MyMessageSender extends chrome.runtime.MessageSender {
    tab: MyTab;
}

/**
 * This is a Port that definitely has a sender
 */
export interface MyPort extends chrome.runtime.Port {
    sender: MyMessageSender;
}

/**
 * This is a tab that definitely has a url
 */
export interface MyTab extends chrome.tabs.Tab  {
    url: string,
    id: number,
}
