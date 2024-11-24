// 在文件開頭添加這個函數
function stripHtmlTags(html) {
    let tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

let captureMode = false;
let originalStyles = new Map();
let wordCountElement = null;
let wordCountEnabled = true; // 預設啟用
let captureType = "normal";

// 在文件開頭添加載入設定
chrome.storage.local.get(['wordCountEnabled'], function(result) {
    if (result.wordCountEnabled !== undefined) {
        wordCountEnabled = result.wordCountEnabled;
    }
});

// 新增取消擷取函數
function cancelCapture() {
    captureMode = false;
    document.body.style.cursor = 'default';
    restoreAllElements();
    
    // 移除取消按鈕
    const cancelButtons = document.querySelectorAll('button');
    cancelButtons.forEach(button => {
        if (button.textContent === '取消擷取') {
            document.body.removeChild(button);
        }
    });
    
    chrome.runtime.sendMessage({action: "captureCancelled"});
}

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
        // 如果點擊的是取消按鈕，不要處理擷取邏輯
        if (e.target.textContent === '取消擷取') {
            return;
        }
        
        e.preventDefault();
        let content = e.target.innerText;
        
        // 根據不同的擷取模式發送不同的消息
        if (captureType === "chat") {
            chrome.runtime.sendMessage({
                action: "chatContentCaptured",
                content: content
            });
        } else {
            chrome.storage.local.set({capturedContent: content}, function() {
                chrome.runtime.sendMessage({action: "contentCaptured"});
            });
        }
        
        captureMode = false;
        document.body.style.cursor = 'default';
        restoreAllElements();
        
        // 移除取消按鈕
        const cancelButtons = document.querySelectorAll('button');
        cancelButtons.forEach(button => {
            if (button.textContent === '取消擷取') {
                document.body.removeChild(button);
            }
        });
    }
});

document.addEventListener('selectionchange', function() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 0) {
        showWordCount(selectedText.length);
    } else {
        hideWordCount();
    }
});

document.addEventListener('mousemove', updateWordCountPosition);

function showWordCount(count) {
    if (!wordCountEnabled) return; // 如果功能關閉則不顯示

    chrome.storage.local.get(['maxTokens', 'overlapTokens'], function(result) {
        const maxTokens = result.maxTokens || 5000;
        const overlapTokens = result.overlapTokens || 200;
        const apiCalls = Math.ceil(count / maxTokens);

        if (!wordCountElement) {
            wordCountElement = document.createElement('div');
            wordCountElement.style.cssText = `
                position: fixed;
                background-color: rgba(0, 0, 0, 0.5);
                color: white;
                padding: 2px 5px;
                font-size: 12px;
                border-radius: 3px;
                z-index: 10001;
                pointer-events: none;
            `;
            document.body.appendChild(wordCountElement);
        }
        wordCountElement.textContent = `${count} 字 / ${apiCalls} 次`;
        wordCountElement.style.display = 'block';
    });
}

function hideWordCount() {
    if (wordCountElement) {
        wordCountElement.style.display = 'none';
        // 如果設定已關閉，移除元素
        if (!wordCountEnabled && document.body.contains(wordCountElement)) {
            document.body.removeChild(wordCountElement);
            wordCountElement = null;
        }
    }
}

function updateWordCountPosition(e) {
    if (wordCountElement && wordCountElement.style.display !== 'none') {
        wordCountElement.style.left = `${e.clientX + 14}px`;
        wordCountElement.style.top = `${e.clientY - 3}px`;
    }
}

// 修改 highlightElement 函數
function highlightElement(element) {
    if (element.getAttribute('data-capture-ui') === 'true') {
        return;
    }

    if (!originalStyles.has(element)) {
        originalStyles.set(element, element.style.cssText || '');
        element.style.outline = '2px solid #4CAF50';
        element.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';

        if (wordCountEnabled) { // 只在功能啟用時顯示字數
            const text = element.innerText;
            const charLength = text.length;

            chrome.storage.local.get(['maxTokens', 'overlapTokens'], function(result) {
                const maxTokens = result.maxTokens || 5000;
                const apiCalls = Math.ceil(charLength / maxTokens);
                
                if (!wordCountElement) {
                    wordCountElement = document.createElement('div');
                    wordCountElement.style.cssText = `
                        position: fixed;
                        background-color: rgba(0, 0, 0, 0.7);
                        color: white;
                        padding: 2px 5px;
                        border-radius: 3px;
                        font-size: 12px;
                        z-index: 10001;
                        pointer-events: none;
                    `;
                    document.body.appendChild(wordCountElement);
                }
                
                wordCountElement.textContent = `${charLength} 字 / ${apiCalls} 次`;
                wordCountElement.style.display = 'block';
            });
        }
    }
}

// 修改 restoreElement 函數
function restoreElement(element) {
    if (originalStyles.has(element)) {
        element.style.cssText = originalStyles.get(element);
        originalStyles.delete(element);
        
        // 隱藏字數提示
        if (wordCountElement) {
            wordCountElement.style.display = 'none';
        }
    }
}

// 修改 restoreAllElements 函數
function restoreAllElements() {
    originalStyles.forEach((originalStyle, element) => {
        if (element && document.body.contains(element)) {
            element.style.cssText = originalStyle;
        }
    });
    originalStyles.clear();
    
    // 移除字數提示元素
    if (wordCountElement && document.body.contains(wordCountElement)) {
        document.body.removeChild(wordCountElement);
        wordCountElement = null;
    }
}

//console.log("Content script loaded");

// 新增創建取消按鈕的函數
function createCancelButton() {
    const cancelButton = document.createElement('button');
    cancelButton.textContent = '取消擷取';
    cancelButton.setAttribute('data-capture-ui', 'true'); // 添加標記
    cancelButton.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #f44336;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        transition: background-color 0.2s, box-shadow 0.2s;
        pointer-events: auto;
    `;

    // 添加懸停效果
    cancelButton.addEventListener('mouseover', function() {
        this.style.backgroundColor = '#d32f2f';
        this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
    });

    // 恢復原始樣式
    cancelButton.addEventListener('mouseout', function() {
        this.style.backgroundColor = '#f44336';
        this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    });

    cancelButton.addEventListener('click', cancelCapture);
    document.body.appendChild(cancelButton);
    return cancelButton;
}

// 修改 onMessage 監聽器
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "startCapture") {
        captureMode = true;
        captureType = "normal";
        document.body.style.cursor = 'pointer';
        
        let notification = document.createElement('div');
        notification.textContent = '請點擊要擷取的內容';
        notification.setAttribute('data-capture-ui', 'true'); // 添加標記
        notification.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #4CAF50;
            color: white;
            padding: 10px;
            border-radius: 4px;
            z-index: 10000;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            pointer-events: none;
            user-select: none;
            -webkit-user-select: none;
        `;
        document.body.appendChild(notification);
        
        const cancelBtn = createCancelButton();
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 5000);
    } else if (request.action === "startChatCapture") {
        captureMode = true;
        captureType = "chat";
        document.body.style.cursor = 'pointer';
        
        let notification = document.createElement('div');
        notification.textContent = '請點擊要擷取的內容';
        notification.setAttribute('data-capture-ui', 'true'); // 添加標記
        notification.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #4CAF50;
            color: white;
            padding: 10px;
            border-radius: 4px;
            z-index: 10000;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            pointer-events: none;
            user-select: none;
            -webkit-user-select: none;
        `;
        document.body.appendChild(notification);
        
        const cancelBtn = createCancelButton();
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 5000);
    } else if (request.action === "updateSettings") {
        // 立即更新設定
        if (request.settings.wordCountEnabled !== undefined) {
            wordCountEnabled = request.settings.wordCountEnabled;
            // 如果設定為關閉，立即隱藏字數統計
            if (!wordCountEnabled && wordCountElement) {
                hideWordCount();
            }
        }
    }
    sendResponse({received: true});
    return true;
});
