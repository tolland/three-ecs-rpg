import { LoggingService } from '@shared/utils/LoggingService';
import { BackgroundScriptLoggingConfig } from '@ext-bg/logging_config';

const logger = LoggingService.getInstance();

//

export const onInstalledHandler = () => {
    chrome.windows.create({
        url: chrome.runtime.getURL('background.html'),
        type: 'popup',
    });
};

export const onSuspendHandler = () => {
    logger.logMessage({
        host: BackgroundScriptLoggingConfig.source,
        short_message: 'background script onSuspendHandler',
    });
}

export const onStartupHandler = () => {
    logger.logMessage({
        host: BackgroundScriptLoggingConfig.source,
        short_message: 'background script onStartup',
    });
}

// export const onFocusChangedHandler = (windowId: number) => {}
