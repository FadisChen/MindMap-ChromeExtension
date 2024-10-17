chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "generateMindmap",
    title: "生成心智圖",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "generateMindmap") {
    const selectedText = info.selectionText;
    chrome.storage.local.set({capturedContent: selectedText}, () => {
      chrome.action.openPopup();
    });
  }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "startCapture") {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "startCapture"});
        });
    } else if (request.action === "contentCaptured") {
        chrome.action.openPopup();
        chrome.runtime.sendMessage({action: "reloadContent"});
    }
});
