let apiKey = '';
let model = 'gemma2-9b-it';
let scale = 1;
let isDragging = false;
let startX, startY;

// 在文件開頭添加這個函數
function handleCapturedContent() {
  chrome.storage.local.get(['capturedContent'], function(result) {
    if (result.capturedContent) {
      generateResponse(result.capturedContent);
      // 清除存儲的內容,以便下次使用
      chrome.storage.local.remove('capturedContent');
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
    const captureButton = document.getElementById('captureButton');
    const clearButton = document.getElementById('clearButton');
    const settingsButton = document.getElementById('settingsButton');
    const settingsContainer = document.getElementById('settingsContainer');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const modelInput = document.getElementById('modelInput');
    const saveSettingsButton = document.getElementById('saveSettings');
    const mermaidCodeTextarea = document.getElementById('mermaidCode');
    const mindmapContainer = document.getElementById('mindmapContainer');
    const downloadButton = document.getElementById('downloadButton');

    mermaid.initialize({ startOnLoad: true });

    // 載入設置
    chrome.storage.local.get(['groqApiKey', 'model'], function(result) {
        if (result.groqApiKey) {
            apiKey = result.groqApiKey;
            apiKeyInput.value = apiKey;
        }
        if (result.model) {
            model = result.model;
            modelInput.value = model;
        } else {
            modelInput.value = model; // 設置默認值
        }
    });

    initializePopup();

    settingsButton.addEventListener('click', function() {
        settingsContainer.style.display = settingsContainer.style.display === 'none' ? 'block' : 'none';
    });

    saveSettingsButton.addEventListener('click', function() {
        apiKey = apiKeyInput.value;
        model = modelInput.value;
        chrome.storage.local.set({groqApiKey: apiKey, model: model}, function() {
            settingsContainer.style.display = 'none';
        });
    });

    captureButton.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    function: startCapture
                }, (injectionResults) => {
                    if (chrome.runtime.lastError) {
                        console.error("Error executing script:", chrome.runtime.lastError);
                    } else {
                        window.close();
                    }
                });
            } else {
                console.error("No active tab found");
            }
        });
    });

    clearButton.addEventListener('click', function() {
        mermaidCodeTextarea.value = '';
        mindmapContainer.innerHTML = '';
        chrome.storage.local.remove('capturedContent');
    });

    mermaidCodeTextarea.addEventListener('input', function() {
        renderMindmap(this.value);
    });

    // 添加拖曳功能
    mindmapContainer.addEventListener('mousedown', startDragging);
    mindmapContainer.addEventListener('mousemove', drag);
    mindmapContainer.addEventListener('mouseup', stopDragging);
    mindmapContainer.addEventListener('mouseleave', stopDragging);

    // 添加滾輪縮放功能
    mindmapContainer.addEventListener('wheel', handleWheel);

    downloadButton.addEventListener('click', downloadMindmap);

    handleCapturedContent(); // 添加這行
});

function initializePopup() {
    chrome.storage.local.get(['capturedContent'], function(result) {
        if (result.capturedContent) {
            generateResponse(result.capturedContent);
        } else {
            console.log("No captured content found in storage");
            document.getElementById('mermaidCode').value = '';
            document.getElementById('mindmapContainer').innerHTML = '';
        }
    });
}

function startCapture() {
    chrome.runtime.sendMessage({action: "startCapture"});
}

function startDragging(e) {
    isDragging = true;
    startX = e.clientX - mindmapContainer.offsetLeft;
    startY = e.clientY - mindmapContainer.offsetTop;
}

function drag(e) {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.clientX - mindmapContainer.offsetLeft;
    const y = e.clientY - mindmapContainer.offsetTop;
    const walkX = (x - startX) * 2;
    const walkY = (y - startY) * 2;
    mindmapContainer.scrollLeft -= walkX;
    mindmapContainer.scrollTop -= walkY;
    startX = x;
    startY = y;
}

function stopDragging() {
    isDragging = false;
}

function handleWheel(e) {
    e.preventDefault();
    if (e.deltaY < 0) {
        // 滾輪向前，放大
        scale *= 1.1;
    } else {
        // 滾輪向後，縮小
        scale /= 1.1;
    }
    applyZoom();
}

function applyZoom() {
    const svg = mindmapContainer.querySelector('svg');
    if (svg) {
        svg.style.transform = `scale(${scale})`;
        svg.style.transformOrigin = 'top left';
    }
}

async function generateResponse(content) {
    try {
        if (!apiKey) {
            throw new Error("API Key is not set");
        }

        const systemPrompt = "Generate a mindmap in Mermaid syntax based on user input. The mindmap should follow a left-to-right (LR) flow and be displayed in Traditional Chinese.\n\n# Steps\n\n1. **Understand User Input**: Parse and comprehend the user's input to determine the main topics and subtopics for the mindmap.\n2. **Structure the Mindmap**: Organize the input into a hierarchy that represents a mindmap, identifying connections between nodes.\n3. **Translate Elements**: Ensure that all elements are translated into Traditional Chinese, if they are not already.\n4. **Format in Mermaid Syntax**: Use the Mermaid syntax for creating a graph with \"graph LR\" to arrange nodes from left to right.\n\n# Output Format\n\n- Provide the output as a Mermaid code snippet structured for a left-to-right mindmap.\n- Ensure the syntax aligns with Mermaid's requirements for a graph representation.\n\n# Examples\n\n**Input**: 數位行銷 -> 社交媒體, 電子郵件, 內容行銷; 社交媒體 -> 臉書, 推特; 電子郵件 -> 活動推廣  \n**Output**:  \n```\ngraph LR  \n    A[數位行銷] --> B[社交媒體]  \n    A --> C[電子郵件]  \n    A --> D[內容行銷]  \n    B --> E[臉書]  \n    B --> F[推特]  \n    C --> G[活動推廣]  \n```\n\n*(Real-world examples should be more complex and include additional subtopics as necessary.)*\n\n# Notes\n\n- Confirm that all graph nodes and labels are in Traditional Chinese.\n- Double-check Mermaid syntax for accuracy to ensure correct rendering.#zh-TW";
        const userPrompt = "請根據以下文章內容<context>生成一個mindmap：\n\n<context>\n\n" + content + "\n\n</context>\n\n請使用mermaid語法生成mindmap，不要包含任何其他解釋或說明。以繁體中文顯示。#zh-TW";

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 2048,
                top_p: 1,
                stream: false,
                stop: null
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("API response:", data);

        if (!data.choices || data.choices.length === 0) {
            throw new Error("No choices in API response");
        }

        let generatedResponse = data.choices[0].message.content;
        console.log("Generated response:", generatedResponse);

        // 移除可能的額外說明文字，只保留mermaid語法
        const startIndex = generatedResponse.indexOf("```mermaid");
        const endIndex = generatedResponse.lastIndexOf("```");
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            generatedResponse = generatedResponse.substring(startIndex + 10, endIndex).trim();
        }

        document.getElementById('mermaidCode').value = generatedResponse;
        
        renderMindmap(generatedResponse);

        // 在生成心智圖後呼叫生成摘要的函數
        await generateSummary(content);
    } catch (error) {
        console.error('Error generating response:', error);
        document.getElementById('mermaidCode').value = `Error generating response: ${error.message}. Please try again.`;
    }
}

// 新增生成摘要的函數
async function generateSummary(content) {
    try {
        const systemPrompt = "你是一個專業的文章摘要生成器。請根據提供的內容生成摘要，以繁體中文呈現。摘要應該捕捉內容的主要觀點和關鍵信息，長度控制在150~250字左右。";
        const userPrompt = "請為以下內容<context>生成摘要：\n\n<context>\n\n" + content + "\n\n</context>\n\n";

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 1024,
                top_p: 1,
                stream: true,
                stop: null
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let summary = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        break;
                    }
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                            summary += parsed.choices[0].delta.content;
                            document.getElementById('summaryText').textContent = summary;
                        }
                    } catch (e) {
                        console.error('Error parsing JSON:', e);
                    }
                }
            }
        }

        if (summary === "") {
            throw new Error("No content generated for summary");
        }
    } catch (error) {
        console.error('Error generating summary:', error);
        document.getElementById('summaryText').textContent = `Error generating summary: ${error.message}. Please try again.`;
    }
}

function renderMindmap(mermaidCode) {
    const mindmapContainer = document.getElementById('mindmapContainer');
    mindmapContainer.innerHTML = '';
    mermaid.render('mindmap', mermaidCode).then(result => {
        mindmapContainer.innerHTML = result.svg;
        applyZoom();
    }).catch(error => {
        console.error('Error rendering mindmap:', error);
        mindmapContainer.innerHTML = '<p>Error rendering mindmap. Please check the Mermaid syntax.</p>';
    });
}

function downloadMindmap() {
    const svg = document.querySelector('#mindmapContainer svg');
    if (!svg) {
        console.error('No SVG found');
        return;
    }

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mindmap.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// 添加這個監聽器來處理來自background.js的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "reloadContent") {
        handleCapturedContent();
    }
});
