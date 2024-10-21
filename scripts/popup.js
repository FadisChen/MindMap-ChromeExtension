let apiKey = '';
let model = 'gemma2-9b-it';
let scale = 1;
let isDragging = false;
let startX, startY;

let cy; // 定義全局 Cytoscape 實例
let writeButton, writeContainer, userInput, generateButton, cancelButton;

function startCapture() {
    chrome.runtime.sendMessage({action: "startCapture"});
}
// 在文件開頭添加這個函數
function stripHtmlTags(html) {
    let tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

// 修改 handleCapturedContent 函數
function handleCapturedContent() {
  chrome.storage.local.get(['capturedContent'], function(result) {
    if (result.capturedContent) {
      // 在這裡使用 stripHtmlTags 函數
      const cleanContent = stripHtmlTags(result.capturedContent);
      generateResponse(cleanContent);
      // 清除存儲的內容,以便下次使用
      chrome.storage.local.remove('capturedContent');
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
    const captureButton = document.getElementById('captureButton');
    const settingsButton = document.getElementById('settingsButton');
    const clearButton = document.getElementById('clearButton');
    const fileButton = document.getElementById('fileButton');
    const settingsContainer = document.getElementById('settingsContainer');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const modelInput = document.getElementById('modelInput');
    const saveSettingsButton = document.getElementById('saveSettings');
    const mermaidCodeTextarea = document.getElementById('mermaidCode');
    const mindmapContainer = document.getElementById('mindmapContainer');
    const downloadButton = document.getElementById('downloadButton');
    const editButton = document.getElementById('editButton');

    //mermaid.initialize({ startOnLoad: true });

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

    clearButton.addEventListener('click', function() {
        mermaidCodeTextarea.value = '';
        mindmapContainer.innerHTML = '';
        document.getElementById('summaryText').textContent = '';
        document.getElementById('summaryContainer').style.display = 'none';
        chrome.storage.local.remove('mermaidCode');
        chrome.storage.local.remove('summary');
    });

    fileButton.addEventListener('click', function() {
        chrome.tabs.create({url: 'readfile.html'});
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
                        //console.error("Error executing script:", chrome.runtime.lastError);
                    } else {
                        window.close();
                    }
                });
            }
        });
    });

    mermaidCodeTextarea.addEventListener('input', function() {
        renderMindmap(this.value);
        chrome.storage.local.set({mermaidCode: this.value});
    });

    downloadButton.addEventListener('click', downloadMindmap);

    handleCapturedContent(); // 添加這行

    editButton.addEventListener('click', function() {
        if (mermaidCodeTextarea.style.display === 'none') {
            mermaidCodeTextarea.style.display = 'block';
            editButton.textContent = '完成';
        } else {
            mermaidCodeTextarea.style.display = 'none';
            editButton.textContent = '編輯';
            // 重新渲染心智图
            renderMindmap(mermaidCodeTextarea.value);
        }
    });

    // 新增這段代碼
    chrome.runtime.sendMessage({action: "popupReady"}, function(response) {
        if (response && response.action === "reloadContent") {
            handleCapturedContent();
        } else if (response && response.action === "captureCancelled") {
            console.log("Capture cancelled");
            // 可以在這裡添加一些視覺反饋，例如顯示一個通知
        }
    });

    writeButton = document.getElementById('writeButton');
    writeContainer = document.getElementById('writeContainer');
    userInput = document.getElementById('userInput');
    generateButton = document.getElementById('generateButton');
    cancelButton = document.getElementById('cancelButton');

    writeButton.addEventListener('click', function() {
        writeContainer.style.display = 'block';
    });

    generateButton.addEventListener('click', function() {
        const content = userInput.value.trim();
        if (content) {
            generateResponse(content);
            writeContainer.style.display = 'none';
            userInput.value = '';
        }
    });

    cancelButton.addEventListener('click', function() {
        writeContainer.style.display = 'none';
        userInput.value = '';
    });
});

function initializePopup() {
    chrome.storage.local.get(['mermaidCode', 'summary'], function(result) {
        if (result.mermaidCode) {
            document.getElementById('mermaidCode').value = result.mermaidCode;
            renderMindmap(result.mermaidCode);
        } else {
            document.getElementById('mermaidCode').value = '';
            document.getElementById('mindmapContainer').innerHTML = '';
        }

        if (result.summary) {
            document.getElementById('summaryText').textContent = result.summary;
            document.getElementById('summaryContainer').style.display = 'block';
        } else {
            document.getElementById('summaryContainer').style.display = 'none';
        }
    });
}

async function generateResponse(content) {
    try {
        document.getElementById('mermaidCode').value = '';
        document.getElementById('mindmapContainer').innerHTML = '';
        document.getElementById('summaryText').textContent = '';
        document.getElementById('summaryContainer').style.display = 'none';
        chrome.storage.local.remove('mermaidCode');
        chrome.storage.local.remove('summary');

        // 確保 content 是乾淨的文本
        content = stripHtmlTags(content);
        
        if (!apiKey) {
            document.getElementById('mindmapContainer').innerHTML = `
            <div style="color: red; padding: 10px; text-align: center;">
                錯誤：API Key 未設置。
            </div>`;
            return;
        }

        const systemPrompt = "Generate a mindmap in Mermaid syntax based on user input. The mindmap should follow a left-to-right (LR) flow and be displayed in Traditional Chinese.\n\n# Steps\n\n1. **Understand User Input**: Parse and comprehend the user's input to determine the main topics and subtopics for the mindmap.\n2. **Structure the Mindmap**: Organize the input into a hierarchy that represents a mindmap, identifying connections between nodes.\n3. **Translate Elements**: Ensure that all elements are translated into Traditional Chinese, if they are not already.\n4. **Format in Mermaid Syntax**: Use the Mermaid syntax for creating a graph with \"graph LR\" to arrange nodes from left to right.\n\n# Output Format\n\n- Provide the output as a Mermaid code snippet structured for a left-to-right mindmap.\n- Ensure the syntax aligns with Mermaid's requirements for a graph representation.\n\n# Examples\n\n**Input**: 數位行銷 -> 社交媒體, 電子郵件, 內容行銷; 社交媒體 -> 臉書, 推特; 電子郵件 -> 活動推廣  \n**Output**:  \n```\ngraph LR  \n    A[數位行銷] --> B[社交媒體]  \n    A --> C[電子郵件]  \n    A --> D[內容行銷]  \n    B --> E[臉書]  \n    B --> F[推特]  \n    C --> G[活動推廣]  \n```\n\n*(Real-world examples should be more complex and include additional subtopics as necessary.)*\n\n# Notes\n\n- Confirm that all graph nodes and labels are in Traditional Chinese.\n- Double-check Mermaid syntax for accuracy to ensure correct rendering. Do not include the ```mermaid code fence in your response.\n- Only include the graph content, starting with 'graph LR'.\n#zh-TW";

        let segments = [];
        if (content.length > 3000) {
            for (let i = 0; i < content.length; i += 2800) {
                let end = Math.min(i + 3000, content.length);
                segments.push(content.slice(i, end));
            }
        } else {
            segments.push(content);
        }

        let allResponses = [];
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const userPrompt = `根據以下文章內容<context>生成一個心智圖：
            <context>
            ${segment}
            </context>

            # Steps
            1. 閱讀並理解上述文章內容，識別主要概念和子概念。
            2. 使用Mermaid語法構建心智圖，以結構化方式展示概念和子概念。
            3. Mermaid代碼中的ID應以"${i}_"開頭，例如"${i}_A"、"${i}_B"等。
            4. Mermaid代碼中的固定以[ ]包起來，例如[${i}_A]、[${i}_B]等。

            # Output Format
            - 僅輸出Mermaid語法格式的心智圖代碼。
            - 不要包含任何其他說明或解釋。
            - 確保所有文字為繁體中文。

            # Notes
            - 熟悉Mermaid語法結構，正確使用節點和連接線。
            - 嚴格遵循ID命名規則以確保唯一性。
            - 每個節點最多包含5個子節點。
            - 最終輸出應只有Mermaid語法片段，無需其他包裝或附加說明。

            ${i === 0 ? '' : `請在以下現有的心智圖基礎上繼續擴展：

            <existing_mindmap>
            ${document.getElementById('mermaidCode').value}
            </existing_mindmap>

            注意：新增的節點ID必須以"${i}_"開頭，以避免與現有節點衝突。
            不必輸出existing_mindmap裡的內容`}

            #zh-TW`;

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
                    stream: false,
                    stop: null
                })
            });

            if (!response.ok) {
                //throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("API response:", data);

            if (!data.choices || data.choices.length === 0) {
                //throw new Error("No choices in API response");
            }

            let generatedResponse = data.choices[0].message.content.trim();
            console.log("Generated response:", generatedResponse);

            // 移除可能的額外說明文字和代碼塊標記
            generatedResponse = generatedResponse.replace(/```mermaid\n?/, '').replace(/```\n?$/, '');

            // 移除所有 "graph LR" 開頭（不僅僅是第一個段落之後的）
            generatedResponse = generatedResponse.replace(/^graph LR\n?/gm, '');

            allResponses.push(generatedResponse);

            // 立即渲染當前的 mindmap
            let currentMindmap = "graph LR\n" + allResponses.join("\n");
            document.getElementById('mermaidCode').value = currentMindmap;
            renderMindmap(currentMindmap);

            // 保存當前的 mermaid 代碼到 localStorage
            chrome.storage.local.set({mermaidCode: currentMindmap});
        }

        // 在生成心智圖後呼叫生成摘要的函數
        await generateSummary(content);
    } catch (error) {
        document.getElementById('mermaidCode').value = '';
        document.getElementById('mindmapContainer').innerHTML = `
            <div style="color: red; padding: 10px; text-align: center;">
                錯誤：${error.message}<br>
                請檢查您的設置並重試。
            </div>`;
    }
}

// 添加一個延遲函數
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateSummary(content) {
    try {
        const systemPrompt = `根據提供的內容生成摘要，摘要需以繁體中文呈現，捕捉內容的主要觀點和關鍵信息，並控制在150至250字之間。

                            # Steps
                            1. 閱讀並理解提供的內容，識別其主要觀點、論點和關鍵信息。
                            2. 確保提取的信息足以反映內容的核心思想。
                            3. 構建摘要，將關鍵資訊和主要觀點清晰有條理地呈現。
                            4. 校對摘要，確保字數在150至250字之間，語言流暢自然。

                            # Output Format
                            - 長度：150至250字。
                            - 語言：繁體中文。
                            - 結構：突出內容的主要觀點和關鍵信息。

                            # Notes
                            - 當內容複雜且信息量大時，優先考慮最重要的觀點和資訊。
                            - 確保摘要留有完整性和連貫性，不丟失關鍵細節。#zh-TW`;

        let segments = [];
        if (content.length > 3000) {
            for (let i = 0; i < content.length; i += 2800) {
                let end = Math.min(i + 3000, content.length);
                segments.push(content.slice(i, end));
            }
        } else {
            segments.push(content);
        }

        let allSummaries = [];
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            let userPrompt = "請為以下內容<context>生繁體中文摘要：\n\n<context>\n\n" + segment + "\n\n</context>\n\n";

            if (i > 0) {
                userPrompt += "請在以下現有的摘要<existing_summary>上繼續，但不要輸出<existing_summary>的內容：\n\n<existing_summary>\n\n" + allSummaries.join("\n\n") + "\n\n</existing_summary>\n\n#zh-TW";
                // 如果不是第一個段落，等待10秒
                await delay(10000);
            }

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
                    max_tokens: 512,
                    top_p: 1,
                    stream: true,
                    stop: null
                })
            });

            if (!response.ok) {
                //throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let summary = "";
            let displayedSummary = "";

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
                                // 逐字顯示摘要，每個字間隔0.05秒
                                for (let char of parsed.choices[0].delta.content) {
                                    displayedSummary += char;
                                    document.getElementById('summaryText').textContent = allSummaries.join("\n\n") + (allSummaries.length > 0 ? "\n\n" : "") + displayedSummary;
                                    document.getElementById('summaryContainer').style.display = 'block';
                                    await delay(50);
                                }
                            }
                        } catch (e) {
                            //console.error('Error parsing JSON:', e);
                        }
                    }
                }
            }

            if (summary === "") {
                //throw new Error("No content generated for summary");
            }

            allSummaries.push(summary);

            // 保存當前的摘要到 localStorage
            let currentSummary = allSummaries.join("\n\n");
            chrome.storage.local.set({summary: currentSummary});
        }
    } catch (error) {
        document.getElementById('summaryText').textContent = `生成摘要時發生錯誤：${error.message}。請檢查您的設置並重試。`;
        document.getElementById('summaryContainer').style.display = 'block';
    }
}

// 修改 renderMindmap 函數
function renderMindmap(mermaidCode) {
    if (mermaidCode === '') {
        return;
    }

    const mindmapContainer = document.getElementById('mindmapContainer');
    mindmapContainer.innerHTML = '';

    // 將 Mermaid 代碼轉換為 Cytoscape 元素
    const elements = convertMermaidToCytoscape(mermaidCode);

    // 定義顏色方案
    const colorSchemes = [
        ['#FF6B6B', '#FF8E8E', '#FFA4A4', '#FFBABA', '#FFD0D0'], // 紅色系
        ['#4D96FF', '#6BA5FF', '#89B4FF', '#A7C3FF', '#C5D2FF'], // 藍色系
        ['#6BCB77', '#8AD492', '#A8DDAD', '#C6E6C8', '#E4EFE3'], // 綠色系
        ['#FFA500', '#FFB733', '#FFC966', '#FFDB99', '#FFEDCC'], // 橘色系
        ['#FFC0CB', '#FFCCCE', '#FFD9D1', '#FFE5D4', '#FFF2D7'], // 粉紅色系
        ['#FFD700', '#FFE033', '#FFE966', '#FFF299', '#FFFCCC'], // 黃金色系
        ['#B19CD9', '#C3B1E1', '#D4C4E9', '#E6D9F0', '#F7EDF8'], // 淡紫色系
        ['#87CEEB', '#A2D9F2', '#BDE4F8', '#D8EFFE', '#F3FAFF'], // 天藍色系
        ['#F0E68C', '#F4ECA4', '#F7F2BC', '#FBF8D4', '#FEFDED']  // 淡黃色系
    ];

    cy = cytoscape({
        container: mindmapContainer,
        elements: elements,
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': '#FFFF00', // 根節點默認為鮮黃色
                    'label': 'data(label)',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'text-wrap': 'wrap',
                    'text-max-width': '200px',
                    'font-size': '12px',
                    'shape': 'roundrectangle',
                    'line-height': 1.5,
                    'padding': 3
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': '#ccc',
                    'target-arrow-color': '#ccc',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier'
                }
            }
        ],
        layout: {
            name: 'dagre',
            rankDir: 'LR',
            nodeSep: 50,
            rankSep: 200,
            padding: 10
        }
    });

    // 為不同分支設置顏色
    const root = cy.nodes().roots();
    let colorIndex = 0;
    root.outgoers('node').forEach(node => {
        const colorScheme = colorSchemes[colorIndex % colorSchemes.length];
        colorBranch(node, colorScheme, 0);
        colorIndex++;
    });

    // 在創建完 Cytoscape 實例後，調整節點大小
    cy.nodes().forEach(function(node) {
        var padding = parseFloat(node.style('padding'));
        var textWidth = node.boundingBox({includeLabels: true}).w;
        var textHeight = node.boundingBox({includeLabels: true}).h;
        var lineCount = node.data('label').split('\n').length;
        node.style({
            'width': textWidth ,
            'height': textHeight 
        });
    });

    // 啟用縮放和平移
    cy.userZoomingEnabled(true);
    cy.userPanningEnabled(true);

    // 啟用節點拖曳
    cy.nodes().grabify();

    // 自動調整視圖以適應所有元素
    cy.fit();
}

// 新增函數：為分支設置顏色
function colorBranch(node, colorScheme, depth) {
    if (depth >= colorScheme.length) {
        depth = colorScheme.length - 1;
    }
    node.style('background-color', colorScheme[depth]);
    node.outgoers('node').forEach(child => {
        colorBranch(child, colorScheme, depth + 1);
    });
}

// 新增函數：將 Mermaid 代碼轉換為 Cytoscape 元素
function convertMermaidToCytoscape(mermaidCode) {
    const lines = mermaidCode.split('\n');
    const elements = [];
    const nodeMap = new Map();

    lines.forEach(line => {
        const match = line.match(/(\w+)(?:\[(.+?)\])?\s*-->\s*(\w+)(?:\[(.+?)\])?/);
        if (match) {
            const [, sourceId, sourceLabel, targetId, targetLabel] = match;

            if (!nodeMap.has(sourceId)) {
                nodeMap.set(sourceId, sourceLabel || sourceId);
                elements.push({ data: { id: sourceId, label: sourceLabel || sourceId } });
            }

            if (!nodeMap.has(targetId)) {
                nodeMap.set(targetId, targetLabel || targetId);
                elements.push({ data: { id: targetId, label: targetLabel || targetId } });
            }

            elements.push({ data: { source: sourceId, target: targetId } });
        }
    });

    return elements;
}

// 修改 downloadMindmap 函數
function downloadMindmap() {
    if (!cy) {
        console.error('Cytoscape instance not found');
        return;
    }

    // 獲取心智圖的實際尺寸
    const extent = cy.extent();
    const height = extent.y2 - extent.y1;

    // 生成 SVG 字符串
    let svgContent = cy.svg({scale: 1, full: true, bg: 'white'});

    // 解析 SVG 字符串
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");

    // 獲取摘要內容
    const summaryText = document.getElementById('summaryText').textContent;

    // 計算摘要行數和高度
    const charsPerLine = 30;
    const lines = Math.ceil(summaryText.length / charsPerLine);
    const summaryHeight = lines * 25 + 20; 

    // 創建摘要文本元素
    const summaryElement = svgDoc.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    summaryElement.setAttribute("width", "500");
    summaryElement.setAttribute("height", summaryHeight);
    summaryElement.setAttribute("x", "10");
    summaryElement.setAttribute("y", "10");

    const summaryDiv = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
    summaryDiv.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
    summaryDiv.style.fontFamily = "Arial, sans-serif";
    summaryDiv.style.fontSize = "16px";
    summaryDiv.style.lineHeight = "1.2";
    summaryDiv.style.color = "#333";
    summaryDiv.style.width = "100%";
    summaryDiv.style.height = "100%";
    summaryDiv.style.overflow = "hidden";
    summaryDiv.style.wordWrap = "break-word";

    // 將摘要文本分行
    for (let i = 0; i < lines; i++) {
        const span = document.createElementNS("http://www.w3.org/1999/xhtml", "span");
        span.textContent = summaryText.substr(i * charsPerLine, charsPerLine);
        span.style.display = "block";
        summaryDiv.appendChild(span);
    }

    summaryElement.appendChild(summaryDiv);

    // 調整 SVG 的尺寸以容納摘要和心智圖
    const svgElement = svgDoc.documentElement;
    const totalHeight = summaryHeight + height*1.6 + 50;
    svgElement.setAttribute("height", totalHeight);

    // 將摘要元素添加到 SVG 的頂部
    svgDoc.documentElement.insertBefore(summaryElement, svgDoc.documentElement.firstChild);

    // 移動心智圖到摘要下方
    const mindmapElement = svgDoc.querySelector('svg > g');
    mindmapElement.setAttribute("transform", `translate(0, ${summaryHeight + 40})`);

    // 將修改後的 SVG 轉回字符串
    svgContent = new XMLSerializer().serializeToString(svgDoc);

    // 創建 Blob
    const blob = new Blob([svgContent], {type: 'image/svg+xml;charset=utf-8'});

    // 創建下載鏈接
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'mindmap_with_summary.svg';

    // 觸發下載
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 釋放 URL 對象
    URL.revokeObjectURL(link.href);
}

// 添加這個監聽器來處理來自background.js的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "reloadContent") {
        handleCapturedContent();
    } else if (request.action === "captureCancelled") {
        console.log("Capture cancelled");
        // 可以在這裡添加一些視覺反饋，例如顯示一個通知
    }
});
