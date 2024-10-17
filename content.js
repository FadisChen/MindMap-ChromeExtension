let captureMode = false;
let originalStyles = new Map();

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    //console.log("Message received in content script:", request);
    if (request.action === "startCapture") {
        captureMode = true;
        document.body.style.cursor = 'pointer';
        //console.log("Capture mode activated");
        
        // 添加視覺提示
        let notification = document.createElement('div');
        notification.textContent = '請點擊要擷取的內容';
        notification.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #4CAF50;
            color: white;
            padding: 10px;
            border-radius: 5px;
            z-index: 10000;
        `;
        document.body.appendChild(notification);
        
        // 5秒後自動移除提示
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 5000);
    }
    // 確保消息被正確處理
    sendResponse({received: true});
    return true;
});

document.addEventListener('mouseover', function(e) {
    if (captureMode) {
        highlightElement(e.target);
    }
});

document.addEventListener('mouseout', function(e) {
    if (captureMode) {
        restoreElement(e.target);
    }
});

document.addEventListener('click', function(e) {
    if (captureMode) {
        e.preventDefault();
        let content = e.target.innerText;
        //console.log("Captured content:", content);
        
        // 使用 chrome.storage 來存儲擷取的內容
        chrome.storage.local.set({capturedContent: content}, function() {
            //console.log("Content saved to storage");
            // 發送一個消息到背景腳本，通知內容已被擷取
            chrome.runtime.sendMessage({action: "contentCaptured"});
        });
        
        captureMode = false;
        document.body.style.cursor = 'default';
        restoreAllElements();
        //console.log("Capture mode deactivated");
    }
});

function highlightElement(element) {
    if (!originalStyles.has(element)) {
        originalStyles.set(element, {
            outline: element.style.outline,
            backgroundColor: element.style.backgroundColor
        });
    }
    element.style.outline = '2px solid red';
    element.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
}

function restoreElement(element) {
    if (originalStyles.has(element)) {
        const original = originalStyles.get(element);
        element.style.outline = original.outline;
        element.style.backgroundColor = original.backgroundColor;
        originalStyles.delete(element);
    }
}

function restoreAllElements() {
    originalStyles.forEach((styles, element) => {
        element.style.outline = styles.outline;
        element.style.backgroundColor = styles.backgroundColor;
    });
    originalStyles.clear();
}

//console.log("Content script loaded");
