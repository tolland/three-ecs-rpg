import { ui } from './ui_elements';


export     function checkUIElements(): boolean {
    const missingElements: string[] = [];

    if (!ui.tabs || ui.tabs.length === 0) missingElements.push('tabs');
    if (!ui.treeContainers || ui.treeContainers.length === 0)
        missingElements.push('treeContainers');
    if (!ui.sceneTree) missingElements.push('sceneTree');
    if (!ui.entityTree) missingElements.push('entityTree');
    if (!ui.systemTree) missingElements.push('systemTree');
    if (!ui.performanceTree) missingElements.push('performanceTree');
    if (!ui.detailsTitle) missingElements.push('detailsTitle');
    if (!ui.detailsContainer) missingElements.push('detailsContainer');
    if (!ui.statusMessage) missingElements.push('statusMessage');
    if (!ui.refreshBtn) missingElements.push('refreshBtn');
    if (!ui.searchInput) missingElements.push('searchInput');

    if (missingElements.length > 0) {
        console.error('Missing UI elements:', missingElements);
        document.body.innerHTML = `
        <div style="padding: 20px; color: red;">
          <h3>Error: Missing UI Elements</h3>
          <p>The following elements could not be found: ${missingElements.join(', ')}</p>
          <p>Please check the panel.html file and ensure all required elements are present.</p>
        </div>
      `;
        return false;
    }

    return missingElements.length === 0;
}
