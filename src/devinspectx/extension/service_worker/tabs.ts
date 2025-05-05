


export async function tabOnActivatedHandler(
    activeInfo: chrome.tabs.TabActiveInfo,
) {
    console.log('tabOnActivated', activeInfo);
    chrome.tabs.get(activeInfo.tabId, (tab: chrome.tabs.Tab) => {
        console.dir(tab);
    });
}
