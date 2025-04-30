/**
 * Type definitions for Chrome extension APIs
 * These are simplified definitions for the Chrome Extension API
 * that we're using in our inspector extension.
 */

declare namespace chrome {
  namespace runtime {
    function connect(connectInfo?: { name?: string }): Port;
    function getURL(path: string): string;

    interface Port {
      name: string;
      onMessage: {
        addListener(callback: (message: any) => void): void;
        removeListener(callback: (message: any) => void): void;
      };
      onDisconnect: {
        addListener(callback: () => void): void;
      };
      postMessage(message: any): void;
      disconnect(): void;
    }
  }

  namespace devtools {
    interface PanelShownEvent {
      addListener(callback: (window: Window) => void): void;
    }

    interface PanelHiddenEvent {
      addListener(callback: () => void): void;
    }

    interface Panel {
      onShown: PanelShownEvent;
      onHidden: PanelHiddenEvent;
    }

    namespace panels {
      function create(title: string, iconPath: string, pagePath: string, callback: (panel: Panel) => void): void;
    }

    interface InspectedWindow {
      tabId: number;
      eval(expression: string, callback?: (result: any, isException: boolean) => void): void;
    }

    const inspectedWindow: InspectedWindow;
  }
}

// Add global extension properties to Window interface
interface Window {
    __panelInitialized?: boolean;
    __hasMessageListener?: boolean;
  __threeEcsInspectorPort?: chrome.runtime.Port;
  __ecsDebug?: any;

  // Add Three.js global variables that might exist in the page context
  scene?: any;
  renderer?: any;
  world?: any;
}

// Declare global script element with onload handler
interface HTMLScriptElement extends HTMLElement {
  onload: (this: GlobalEventHandlers, ev: Event) => any;
}

// Added NodeJS timeout type compatibility
interface SetIntervalReturn {}

// Declare setTimeout/setInterval return type compatibility between browser and node
type TimeoutId = number | NodeJS.Timeout;
