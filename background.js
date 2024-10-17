chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "startCapture") {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "startCapture"});
        });
    } else if (request.action === "contentCaptured") {
        // 當內容被擷取時，打開 popup
        chrome.action.openPopup();
        // 發送消息給 popup，通知它重新加載內容
        chrome.runtime.sendMessage({action: "reloadContent"});
    }
});
