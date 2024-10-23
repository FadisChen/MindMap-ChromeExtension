// 在文件開頭添加這個函數
function stripHtmlTags(html) {
    let tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

let captureMode = false;
let originalStyles = new Map();
let wordCountElement = null;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "startCapture") {
        captureMode = true;
        document.body.style.cursor = 'pointer';
        
        let notification = document.createElement('div');
        notification.textContent = '請點擊要擷取的內容（按 ESC 取消）';
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
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 5000);

        // 添加 ESC 鍵監聽器
        document.addEventListener('keydown', handleEscKey);
    }
    sendResponse({received: true});
    return true;
});

// 新增 ESC 鍵處理函數
function handleEscKey(e) {
    if (e.key === 'Escape' && captureMode) {
        cancelCapture();
    }
}

// 新增取消擷取函數
function cancelCapture() {
    captureMode = false;
    document.body.style.cursor = 'default';
    restoreAllElements();
    document.removeEventListener('keydown', handleEscKey);
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
        e.preventDefault();
        let content = e.target.innerText;
        
        chrome.storage.local.set({capturedContent: content}, function() {
            chrome.runtime.sendMessage({action: "contentCaptured"});
        });
        
        captureMode = false;
        document.body.style.cursor = 'default';
        restoreAllElements();
        document.removeEventListener('keydown', handleEscKey);
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
    }
}

function updateWordCountPosition(e) {
    if (wordCountElement && wordCountElement.style.display !== 'none') {
        wordCountElement.style.left = `${e.clientX + 14}px`;
        wordCountElement.style.top = `${e.clientY - 3}px`;
    }
}

function highlightElement(element) {
    if (!originalStyles.has(element)) {
        originalStyles.set(element, {
            outline: element.style.outline,
            backgroundColor: element.style.backgroundColor
        });
    }
    element.style.outline = '2px solid red';
    element.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';

    const cleanText = stripHtmlTags(element.innerHTML);
    showWordCount(cleanText.trim().length);
}

function restoreElement(element) {
    if (originalStyles.has(element)) {
        const original = originalStyles.get(element);
        element.style.outline = original.outline;
        element.style.backgroundColor = original.backgroundColor;
        originalStyles.delete(element);
    }
    hideWordCount();
}

function restoreAllElements() {
    originalStyles.forEach((styles, element) => {
        element.style.outline = styles.outline;
        element.style.backgroundColor = styles.backgroundColor;
    });
    originalStyles.clear();
    hideWordCount();
}

//console.log("Content script loaded");
