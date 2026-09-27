const MENU_ID = "save-selection";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "Guardar selección en Gamebook",
      contexts: ["selection"],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID) return;

  const pending = {
    text: info.selectionText || "",
    url: (tab && tab.url) || "",
    title: (tab && tab.title) || "",
    savedAt: Date.now(),
  };

  chrome.storage.local.set({ pending }, () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("capture.html") });
  });
});
