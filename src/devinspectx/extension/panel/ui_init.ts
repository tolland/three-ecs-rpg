import { checkUIElements } from './ui_check_elements';
import { ui } from './ui_elements';
import { LoggingService } from '@shared/utils/LoggingService';
import {
    captureSnapshot,
    locateSelectedObject,
    performSearch,
    refreshAll,
    toggleEditMode,
    updateStatus,
} from './ui_actions';


export function initUI(): void {
    if (!checkUIElements()) return;
    console.log('UI elements verified, setting up event handlers');

    // Set up tab switching
    ui.tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            console.log('Tab clicked:', tab.dataset.tab);

            // Deactivate all tabs and containers
            ui.tabs.forEach((t) => t.classList.remove('active'));

            ui.treeContainers.forEach((c) => c.classList.remove('active'));

            // Activate the clicked tab and its container
            tab.classList.add('active');
            const tabName = tab.dataset.tab;
            const element = document.getElementById(`${tabName}-tree`);
            if (element) {
                element.classList.add('active');
            } else {
                LoggingService.getInstance()
                    .logMessage({
                        host: 'panel.ts',
                        short_message: 'initialzing initUI in panel',
                        _data: {
                            tabName: tabName ?? 'unknown',
                        }
                    });
                console.error(
                    `Could not find tree container for tab: ${tabName}`,
                );
                console.log('document is %o and $O', document, document);
            }
        });
    });

    // Set up refresh button
    if (ui.refreshBtn) {
        ui.refreshBtn.addEventListener('click', () => {
            refreshAll();
        });
    }

    // Set up capture button
    if (ui.captureBtn) {
        ui.captureBtn.addEventListener('click', () => {
            captureSnapshot();
        });
    }

    // Set up search functionality
    if (ui.searchInput && ui.searchBtn) {
        ui.searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });

        ui.searchBtn.addEventListener('click', () => {
            performSearch();
        });
    }

    // Setup locate button
    if (ui.locateBtn) {
        ui.locateBtn.addEventListener('click', () => {
            locateSelectedObject();
        });
    }

    // Setup edit button
    if (ui.editBtn) {
        ui.editBtn.addEventListener('click', () => {
            toggleEditMode();
        });
    }

    // Update the status to show we're initializing
    updateStatus('Initializing Three.js ECS Inspector...');
}
