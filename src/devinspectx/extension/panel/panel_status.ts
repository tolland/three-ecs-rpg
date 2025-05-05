import { PanelLoggingConfig } from '@panel/logging_config';
import { LoggingService } from '@shared/utils/LoggingService';
import { panelState } from '@panel/panel_state';
import { state } from '@panel/ui_state';


export const instanceId = `${chrome.runtime.id}-${Math.random().toString(36).slice(2, 9)}`;

export function logConnectionStatus(): void {
    PanelLoggingConfig.enabled &&
    PanelLoggingConfig.logToGraylog &&
    LoggingService.getInstance().logMessage({
        host: PanelLoggingConfig.source,
        _action: 'heartbeat',
        short_message: 'logging status heartbeat',
        _devToolsPortName: JSON.stringify(panelState.panelPort?.name),
        _data: {
            origin_id: instanceId,
            port: !!panelState.panelPort,
            state: {
                connected: state.connected,
                hasScene: !!state.scene.hierarchy,
                hasEntities: state.entities.list.length > 0,
                hasSystems: state.systems.list.length > 0,
            },
        },
    });
    console.log('[Panel] Connection status:', {
        port: !!panelState.panelPort,
        state: {
            connected: state.connected,
            hasScene: !!state.scene.hierarchy,
            hasEntities: state.entities.list.length > 0,
            hasSystems: state.systems.list.length > 0,
        },
    });
}
