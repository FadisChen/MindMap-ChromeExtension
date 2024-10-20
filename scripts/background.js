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
    } else if (request.action === "captureCancelled") {
        chrome.action.openPopup();
    } else if (request.action === "popupReady") {
        // 當 popup 準備好時，發送相應的消息
        if (request.captureStatus === "captured") {
            sendResponse({action: "reloadContent"});
        } else if (request.captureStatus === "cancelled") {
            sendResponse({action: "captureCancelled"});
        }
        return true; // 表示將異步發送回應
    }
});
