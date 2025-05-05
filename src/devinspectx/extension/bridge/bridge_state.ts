// src/devinspectx/extension/bridge/bridge_state.ts
import * as THREE from 'three';
import { generateMessageId } from '@devinspectx/extension/utils/message-type-conversion';

// Find objects in window
let appScene: any = null;
let appRenderer: any = null;
let appWorld: any = null;
let appEcsDebug: any = null;

interface BridgeState {
    appScene?: THREE.Scene;
    appRenderer?: THREE.WebGLRenderer;
    appWorld?: any;
    appEcsDebug?: any;
    devToolsConnected: boolean,
    instanceId: string;
}

export const bridgeState: BridgeState = {
    appScene: appScene,
    appRenderer: appRenderer,
    appWorld: appWorld,
    appEcsDebug: appEcsDebug,
    devToolsConnected: false,
    instanceId: `br-${generateMessageId()}`,
}
