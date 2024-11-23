chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "generateMindmap",
    title: "生成心智圖",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "generateMindmap") {
    const selectedText = info.selectionText;
    try {
      // 先開啟側邊欄
      await chrome.sidePanel.open({ windowId: tab.windowId });
      
      // 等待一小段時間確保側邊欄已完全載入
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 設置內容和狀態
      await new Promise((resolve) => {
        chrome.storage.local.get(['maxTokens', 'overlapTokens'], function(result) {
          const maxTokens = result.maxTokens || 5000;
          const overlapTokens = result.overlapTokens || 200;
          const apiCalls = Math.ceil(selectedText.length / (maxTokens - overlapTokens));
          
          chrome.storage.local.set({
            capturedContent: selectedText,
            capturedContentLength: selectedText.length,
            capturedContentApiCalls: apiCalls,
            captureStatus: "captured"
          }, resolve);
        });
      });

      // 廣播消息給所有監聽者
      chrome.runtime.sendMessage({
        action: "reloadContent",
        source: "contextMenu"
      });
      
    } catch (error) {
      console.error('Error in contextMenu handler:', error);
    }
  }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "startCapture") {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {action: "startCapture"});
            }
        });
    } else if (request.action === "contentCaptured") {
        chrome.storage.local.set({captureStatus: "captured"}, () => {
            chrome.runtime.sendMessage({action: "reloadContent"});
        });
    } else if (request.action === "captureCancelled") {
        chrome.storage.local.set({captureStatus: "cancelled"}, () => {
            chrome.runtime.sendMessage({action: "captureCancelled"});
        });
    }
    return true;
});

// 點擊 extension icon 時開啟側邊欄
chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ windowId: tab.windowId });
});
