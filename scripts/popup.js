let groqApiKey = '';
let openaiApiKey = '';
let groqModel = 'gemma2-9b-it';
let openaiModel = 'gpt-4o-mini';
let currentApi = 'groq';
let maxTokens = 5000; // 默認值
let overlapTokens = 200; // 默認值
let scale = 1;
let isDragging = false;
let startX, startY;

let cy; // 定義全局 Cytoscape 實例
let writeButton, writeContainer, userInput, generateButton, cancelButton;

let apiDelay = 3000; // 默認值為 3 秒

let jinaApiKey = '';
let contentEmbeddings = [];
let contentChunks = [];
let qaEnabled = false;

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
      // 清除存儲的內容,以便下次使
      chrome.storage.local.remove('capturedContent');
    }
  });
}

// 在文件開頭添加這個函數
function getApiConfig() {
    return {
        groq: {
            url: 'https://api.groq.com/openai/v1/chat/completions',
            key: groqApiKey,
            model: groqModel
        },
        openai: {
            url: 'https://api.openai.com/v1/chat/completions',
            key: openaiApiKey,
            model: openaiModel
        }
    };
}

// 在文件開頭添加這個函數
function updateCharCount() {
    const cleanText = stripHtmlTags(userInput.value);
    const charLength = cleanText.length;
    const apiCalls = Math.ceil(charLength / maxTokens);
    charCount.textContent = `${charLength} 字 / ${apiCalls} 次`;
}

document.addEventListener('DOMContentLoaded', function() {
    const captureButton = document.getElementById('captureButton');
    const settingsButton = document.getElementById('settingsButton');
    const clearButton = document.getElementById('clearButton');
    const fileButton = document.getElementById('fileButton');
    const settingsContainer = document.getElementById('settingsContainer');
    const apiSelector = document.getElementById('apiSelector');
    const groqApiKeyInput = document.getElementById('groqApiKeyInput');
    const openaiApiKeyInput = document.getElementById('openaiApiKeyInput');
    const groqModelInput = document.getElementById('groqModelInput');
    const openaiModelInput = document.getElementById('openaiModelInput');
    const saveSettingsButton = document.getElementById('saveSettings');
    const mermaidCodeTextarea = document.getElementById('mermaidCode');
    const mindmapContainer = document.getElementById('mindmapContainer');
    const downloadButton = document.getElementById('downloadButton');
    const editButton = document.getElementById('editButton');
    const groqSettings = document.getElementById('groqSettings');
    const openaiSettings = document.getElementById('openaiSettings');
    const maxTokensInput = document.getElementById('maxTokensInput');
    const overlapTokensInput = document.getElementById('overlapTokensInput');
    const maxTokensValue = document.getElementById('maxTokensValue');
    const overlapTokensValue = document.getElementById('overlapTokensValue');
    const apiDelayInput = document.getElementById('apiDelayInput');
    const apiDelayValue = document.getElementById('apiDelayValue');

    const jinaApiKeyInput = document.getElementById('jinaApiKeyInput');
    const questionInput = document.getElementById('questionInput');
    
    //mermaid.initialize({ startOnLoad: true });

    // 載入設置
    chrome.storage.local.get([
        'groqApiKey', 
        'openaiApiKey', 
        'groqModel', 
        'openaiModel', 
        'currentApi', 
        'maxTokens', 
        'overlapTokens', 
        'apiDelay', 
        'jinaApiKey',
        'qaEnabled'
    ], function(result) {
        if (result.groqApiKey) {
            groqApiKey = result.groqApiKey;
            groqApiKeyInput.value = groqApiKey;
        }
        if (result.openaiApiKey) {
            openaiApiKey = result.openaiApiKey;
            openaiApiKeyInput.value = openaiApiKey;
        }
        if (result.groqModel) {
            groqModel = result.groqModel;
            groqModelInput.value = groqModel;
        } else {
            groqModelInput.value = groqModel; // 設置默認值
        }
        if (result.openaiModel) {
            openaiModel = result.openaiModel;
            openaiModelInput.value = openaiModel;
        } else {
            openaiModelInput.value = openaiModel; // 設置默認值
        }
        if (result.currentApi) {
            currentApi = result.currentApi;
            apiSelector.value = currentApi;
        }
        if (result.maxTokens) {
            maxTokens = result.maxTokens;
            maxTokensInput.value = maxTokens;
            maxTokensValue.textContent = maxTokens + " 字";
        } else {
            maxTokensValue.textContent = maxTokens + " 字"; // 設置默認值
        }
        if (result.overlapTokens) {
            overlapTokens = result.overlapTokens;
            overlapTokensInput.value = overlapTokens;
            overlapTokensValue.textContent = overlapTokens + " 字";
        } else {
            overlapTokensValue.textContent = overlapTokens + " 字"; // 設置默認值
        }
        if (result.apiDelay !== undefined) {
            apiDelay = result.apiDelay;
            apiDelayInput.value = apiDelay / 1000;
            apiDelayValue.textContent = apiDelay / 1000 + " 秒";
        } else {
            apiDelayValue.textContent = apiDelay / 1000 + " 秒"; // 設置默認值
        }
        if (result.jinaApiKey) {
            jinaApiKey = result.jinaApiKey;
            jinaApiKeyInput.value = jinaApiKey;
        }
        
        // 載入 QA 功能開關狀態
        if (result.qaEnabled !== undefined) {
            qaEnabled = result.qaEnabled;
            document.getElementById('qaEnabledCheckbox').checked = qaEnabled;
        }
        
        // 根據當前 API 設置顯示相應的設置
        updateApiSettings();
    });

    apiSelector.addEventListener('change', function() {
        currentApi = this.value;
        chrome.storage.local.set({currentApi: currentApi});
        console.log("Current API changed to:", currentApi);
        updateApiSettings();
    });

    function updateApiSettings() {
        if (currentApi === 'groq') {
            groqSettings.style.display = 'block';
            openaiSettings.style.display = 'none';
        } else {
            groqSettings.style.display = 'none';
            openaiSettings.style.display = 'block';
        }
    }

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
        groqApiKey = groqApiKeyInput.value;
        openaiApiKey = openaiApiKeyInput.value;
        groqModel = groqModelInput.value;
        openaiModel = openaiModelInput.value;
        maxTokens = parseInt(maxTokensInput.value) || 5000;
        overlapTokens = parseInt(overlapTokensInput.value) || 200;
        apiDelay = parseInt(apiDelayInput.value) * 1000;
        jinaApiKey = jinaApiKeyInput.value;
        qaEnabled = document.getElementById('qaEnabledCheckbox').checked;  // 獲取 checkbox 狀態
        
        chrome.storage.local.set({
            groqApiKey: groqApiKey, 
            openaiApiKey: openaiApiKey, 
            groqModel: groqModel, 
            openaiModel: openaiModel,
            maxTokens: maxTokens,
            overlapTokens: overlapTokens,
            apiDelay: apiDelay,
            jinaApiKey: jinaApiKey,
            qaEnabled: qaEnabled  // 儲存 QA 功能開關狀態
        }, function() {
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
    const charCount = document.getElementById('charCount');

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

    userInput.addEventListener('input', updateCharCount);

    // 添加滑動條的事件監聽器
    maxTokensInput.addEventListener('input', function() {
        maxTokens = parseInt(this.value);
        maxTokensValue.textContent = maxTokens + " 字";
        updateCharCount();
    });

    overlapTokensInput.addEventListener('input', function() {
        overlapTokens = parseInt(this.value);
        overlapTokensValue.textContent = overlapTokens + " 字";
        updateCharCount();
    });

    // 添加 API 延遲滑動條的事件監聽器
    apiDelayInput.addEventListener('input', function() {
        apiDelay = parseInt(this.value) * 1000;
        apiDelayValue.textContent = this.value + " 秒";
    });

    // 載入 Jina API Key
    chrome.storage.local.get(['jinaApiKey'], function(result) {
        if (result.jinaApiKey) {
            jinaApiKey = result.jinaApiKey;
            jinaApiKeyInput.value = jinaApiKey;
        }
    });
    
    // 添加 questionInput 的 keypress 事件監聽
    questionInput.addEventListener('keypress', async function(e) {
        if (e.key === 'Enter') {
            e.preventDefault(); // 防止預設的換行行為
            const question = this.value.trim();
            if (question && contentEmbeddings.length > 0) {
                await handleQuestion(question);
                this.value = '';
            } else {
                document.getElementById('answerText').textContent = '請先生成心智圖並確保已設定 Jina AI API Key';
                document.getElementById('answerContainer').style.display = 'block';
            }
        }
    });
});

function initializePopup() {
    chrome.storage.local.get(['mermaidCode', 'summary', 'llmType'], function(result) {
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
            document.getElementById('llmType').textContent = result.llmType === 'groq' ? 'Groq' : 'OpenAI';
        } else {
            document.getElementById('summaryContainer').style.display = 'none';
        }
    });
}

// 在文件開頭添加這個新函數
async function callLLMAPI(apiConfig, systemPrompt, userPrompt, maxTokens = 1024, model=apiConfig.model) {
    const response = await fetch(apiConfig.url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiConfig.key}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: maxTokens,
            top_p: 1,
            stream: false,
            stop: null
        })
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0) {
        throw new Error("No choices in API response");
    }

    return data.choices[0].message.content.trim();
}

// 修改 generateResponse 函數
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
        document.getElementById('userInput').value = content;
        updateCharCount();
        if (!groqApiKey && !openaiApiKey) {
            document.getElementById('mindmapContainer').innerHTML = `
            <div style="color: red; padding: 10px; text-align: center;">
                錯誤：API Key 未設置。
            </div>`;
            return;
        }

        const systemPrompt = "Generate a mindmap in Mermaid syntax based on user input. The mindmap should follow a left-to-right (LR) flow and be displayed in Traditional Chinese.\n\n# Steps\n\n1. **Understand User Input**: Parse and comprehend the user's input to determine the main topics and subtopics for the mindmap.\n2. **Structure the Mindmap**: Organize the input into a hierarchy that represents a mindmap, identifying connections between nodes.\n3. **Translate Elements**: Ensure that all elements are translated into Traditional Chinese, if they are not already.\n4. **Format in Mermaid Syntax**: Use the Mermaid syntax for creating a graph with \"graph LR\" to arrange nodes from left to right.\n\n# Output Format\n\n- Provide the output as a Mermaid code snippet structured for a left-to-right mindmap.\n- Ensure the syntax aligns with Mermaid's requirements for a graph representation.\n\n# Examples\n\n**Input**: 數位行銷 -> 社交媒體, 電子郵件, 內容行銷; 社交媒體 -> 臉書, 推特; 電子郵件 -> 活動推廣  \n**Output**:  \n```\ngraph LR  \n    A[數位行銷] --> B[社交媒體]  \n    A --> C[電子郵件]  \n    A --> D[內容行銷]  \n    B --> E[臉書]  \n    B --> F[推特]  \n    C --> G[活動推廣]  \n```\n\n*(Real-world examples should be more complex and include additional subtopics as necessary.)*\n\n# Notes\n\n- Confirm that all graph nodes and labels are in Traditional Chinese.\n- Double-check Mermaid syntax for accuracy to ensure correct rendering. Do not include the ```mermaid code fence in your response.\n- Only include the graph content, starting with 'graph LR'.\n#zh-TW";

        // 分割文本
        contentChunks = splitText(content);

        // 生成 embeddings
        contentEmbeddings = await getEmbeddings(contentChunks);

        // 根據設定決定是否顯示問答區域
        chrome.storage.local.get(['qaEnabled', 'jinaApiKey'], function(result) {
            if (result.qaEnabled && result.jinaApiKey) {
                document.getElementById('qaContainer').style.display = 'block';
            } else {
                document.getElementById('qaContainer').style.display = 'none';
            }
        });
        
        let segments = [];
        if (content.length > maxTokens) {
            for (let i = 0; i < content.length; i += maxTokens - overlapTokens) {
                let end = Math.min(i + maxTokens, content.length);
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
            4. Mermaid代碼中的節點內容固定以[ ]包起來，例如 ${i}_A[節點內容1] --> ${i}_B[節點內容2]。

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

            const apiConfig = getApiConfig()[currentApi];

            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, apiDelay));
            }

            let generatedResponse = await callLLMAPI(apiConfig, systemPrompt, userPrompt);

            // 移除可能的額外說明文字和代碼塊標記
            generatedResponse = generatedResponse.replace(/^graph LR\n?/gm, '').replace(/```mermaid\n?/, '').replace(/```\n?$/, '').replace(/{?/, '[').replace(/}?/, ']').replace('][','');

            allResponses.push(generatedResponse);

            // 立即渲染當前的 mindmap
            let currentMindmap = "graph LR\n" + allResponses.join("\n");
            document.getElementById('mermaidCode').value = currentMindmap;
            renderMindmap(currentMindmap);

            // 保存當前的 mermaid 代碼到 localStorage
            chrome.storage.local.set({mermaidCode: currentMindmap});
        }

        // 如果生成了多段心智圖，呼叫 LLM 進行最終檢查和調整
        if (segments.length > 1) {
            await finalMindmapCheck();
        }

        // 在生成心智圖後呼叫生成摘要的函數
        await generateSummary(content);
    } catch (error) {
        console.error("Error in generateResponse:", error);
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

// 修改 generateSummary 函數
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
                            - 確保摘要留有完整性和連貫性，不丟失關鍵細節。
                            #zh-TW`;

        let segments = [];
        if (content.length > maxTokens) {
            for (let i = 0; i < content.length; i += maxTokens - overlapTokens) {
                let end = Math.min(i + maxTokens, content.length);
                segments.push(content.slice(i, end));
            }
        } else {
            segments.push(content);
        }

        let allSummaries = [];
        const apiConfig = getApiConfig()[currentApi];

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            let userPrompt = "請為以下內容<context>生成繁體中文摘要：\n\n<context>\n\n" + segment + "\n\n</context>\n\n#zh-TW";

            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, apiDelay));
            }

            const summary = await callLLMAPI(apiConfig, systemPrompt, userPrompt, 512);
            allSummaries.push(summary);
        }

        let finalSummary;

        // 只有在有多個段落時才進行最終摘要
        if (allSummaries.length > 1) {
            const finalUserPrompt = "請根據以下摘要內容生成一份完整的摘要，捕捉所有重要信息：\n\n" + allSummaries.join("\n\n") + "\n\n請確保最終摘要在150至250字之間。#zh-TW";

            await new Promise(resolve => setTimeout(resolve, apiDelay));

            finalSummary = await callLLMAPI(apiConfig, systemPrompt, finalUserPrompt, 512);
        } else {
            finalSummary = allSummaries[0];
        }

        // 設置 LLM 類型
        document.getElementById('llmType').textContent = currentApi === 'groq' ? 'Groq' : 'OpenAI';

        // 顯示摘要容器
        document.getElementById('summaryContainer').style.display = 'block';
        
        // 逐字顯示摘要
        document.getElementById('summaryText').textContent = '';
        for (let char of finalSummary) {
            document.getElementById('summaryText').textContent += char;
            await delay(50);
        }

        // 保存當前的摘要到 localStorage
        chrome.storage.local.set({summary: finalSummary, llmType: currentApi});

    } catch (error) {
        console.error("Error in generateSummary:", error);
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

    const elements = convertMermaidToCytoscape(mermaidCode);

    cy = cytoscape({
        container: mindmapContainer,
        elements: elements,
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': 'white',
                    'border-width': 2,
                    'border-color': '#000000',
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
        },
        wheelSensitivity: 0.5  // 添加這行來降低縮放靈敏度
    });

    // 設置根節點的樣式
    cy.nodes().roots().style({
        'background-color': '#AAFFFF',
        'border-color': '#33FFFF'
    });

    // 為不同分支設置顏色
    const root = cy.nodes().roots();
    let colorIndex = 0;
    root.outgoers('node').forEach(node => {
        const color = generateColor(colorIndex);
        colorBranch(node, color);
        colorIndex++;
    });

    // 調整節點大小
    cy.nodes().forEach(function(node) {
        var textWidth = node.boundingBox({includeLabels: true}).w;
        var textHeight = node.boundingBox({includeLabels: true}).h;
        node.style({
            'width': textWidth,
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
    cy.center();
}

function colorBranch(node, color) {
    if (!node.isChild()) { // 如果不是根節點
        node.style('border-color', color);
    }
    node.outgoers('node').forEach(child => {
        colorBranch(child, color);
    });
}

function generateColor(index) {
    // 使用 HSL 顏色模型生成顏色
    // 調整色相以獲得不同的顏色，保持飽和度和亮度不變
    const hue = (index * 137.5) % 360; // 使用黃金角來分散顏色
    return `hsl(${hue}, 70%, 50%)`;
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
    const totalHeight = summaryHeight + height + 100;
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

// 修改 finalMindmapCheck 函數
async function finalMindmapCheck() {
    const currentMindmap = document.getElementById('mermaidCode').value;
    const systemPrompt = `你是一個專業的心智圖檢查和優化專家。你的任務是檢查Mermaid語法的心智圖，判斷是否需要調整或合併節點，並移除重複節點。請確保最終的心智圖結構清晰、邏輯合理，並且沒有重複或冗餘的信息。

    # 步驟
    1. 檢查Mermaid語法的正確性。
    2. 識別並合併相似或重複的節點。
    3. 調整節點層級和關係，確保邏輯合理。
    4. 移除冗餘或不必要的節點。
    5. 確保所有文字仍為繁體中文。

    # 輸出格式
    - 只輸出優化後的Mermaid語法心智圖代碼。
    - 不要包含任何解釋或額外的文字。
    - 確保代碼以 "graph LR" 開始。
    - 節點名稱固定以[ ]包起來，例如:0_1[A]、0_2[B]等。

    # 注意事項
    - 保持原有的主要結構和重要信息。
    - 確保節點ID的唯一性和一致性。
    - 最終輸出應該是一個完整、優化的心智圖。
    #zh-TW`;

    const userPrompt = `請檢查並優化以下Mermaid語法的心智圖：

    ${currentMindmap}

    請按照系統提示中的步驟進行檢查和優化，並提供優化後的完整Mermaid代碼。
    #zh-TW`;

    const apiConfig = getApiConfig()[currentApi];

    try {
        let optimizedMindmap = await callLLMAPI(apiConfig, systemPrompt, userPrompt, 2048);
        
        // 移除可能的額外說明文字和代碼塊標記
        optimizedMindmap = optimizedMindmap.replace(/```mermaid\n?/, '').replace(/```\n?$/, '');

        // 更新 mermaidCode 和渲染優化後的心智圖
        document.getElementById('mermaidCode').value = optimizedMindmap;
        renderMindmap(optimizedMindmap);

        // 保存優化後的 mermaid 代碼到 localStorage
        chrome.storage.local.set({mermaidCode: optimizedMindmap});
    } catch (error) {
        console.error("Error in finalMindmapCheck:", error);
    }
}

// 添加文本分割函數
function splitText(text, maxLength = 1000, overlap = 200) {
    const paragraphs = text.split('\n');
    const chunks = [];
    let currentChunk = "";
    
    for (const para of paragraphs) {
        const trimmedPara = para.trim();
        if (!trimmedPara) continue;
        
        if (currentChunk.length + trimmedPara.length < maxLength) {
            currentChunk += trimmedPara + " ";
        } else {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = currentChunk.slice(-overlap) + trimmedPara + " ";
            } else {
                currentChunk = trimmedPara + " ";
            }
        }
    }
    
    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks;
}

// 修改 getEmbeddings 函數
async function getEmbeddings(texts, batchSize = 20) {
    if (!jinaApiKey) {
        throw new Error('Jina AI API Key 未設置');
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jinaApiKey}`
    };
    
    const allEmbeddings = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        
        // 修改資料格式，將文本包裝成正確的格式
        const data = {
            "model": "jina-embeddings-v3",
            "dimensions": 1024,
            "normalized": true,
            "embedding_type": "float",
            "input": batch.map(text => ({ text }))  // 將每個文本包裝成物件
        };
        
        try {
            const response = await fetch('https://api.jina.ai/v1/embeddings', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API 請求失敗: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            // 從回應中提取 embedding
            const batchEmbeddings = result.data.map(item => item.embedding);
            allEmbeddings.push(...batchEmbeddings);
            
        } catch (error) {
            console.error('獲取 embeddings 時發生錯誤:', error);
            throw error;
        }
    }
    
    return allEmbeddings;
}

// 修改 rerank 函數
async function rerankResults(query, texts) {
    if (!jinaApiKey) {
        throw new Error('Jina AI API Key 未設置');
    }

    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jinaApiKey}`
    };
    
    // 修改請求資料格式，直接使用文本陣列
    const data = {
        "model": "jina-reranker-v2-base-multilingual",
        "query": query,
        "top_n": 3,
        "documents": texts  // 直接傳入文本陣列
    };
    
    try {
        const response = await fetch("https://api.jina.ai/v1/rerank", {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API 請求失敗: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        
        // 檢查回應格式
        if (!result || !Array.isArray(result.results)) {
            console.error('Unexpected API response:', result);
            throw new Error('API 回應格式不正確');
        }
        
        // 根據相關性分數和文本多樣性進行過濾
        const filtered_results = [];
        const seen_content = new Set();
        
        for (const item of result.results) {
            const text = item.text;  // 直接使用 text 屬性
            const score = item.score; // 使用 score 屬性
            
            // 計算文本的特徵指紋
            const text_fingerprint = text.split(' ').sort().join(' ');
            
            // 如果內容不重複且相關性分數足夠高
            if (!seen_content.has(text_fingerprint) && score > 0.5) {
                filtered_results.push({
                    document: { text },
                    relevance_score: score
                });
                seen_content.add(text_fingerprint);
            }
        }
        
        // 如果沒有找到任何結果，使用原始文本
        if (filtered_results.length === 0) {
            return texts.slice(0, 3).map(text => ({
                document: { text },
                relevance_score: 1.0
            }));
        }
        
        return filtered_results.slice(0, 3); // 返回最終的 3 個結果
        
    } catch (error) {
        console.error('重新排序時發生錯誤:', error);
        // 如果 rerank 失敗，返回基於原始順序的結果
        return texts.slice(0, 3).map(text => ({
            document: { text },
            relevance_score: 1.0
        }));
    }
}

// 修改 handleQuestion 函數，加入 rerank 功能
async function handleQuestion(question) {
    try {
        // 獲取問題的 embedding
        const questionEmbedding = (await getEmbeddings([question]))[0];
        
        // 找到最相關的文本片段
        const similarities = contentEmbeddings.map((embedding, index) => ({
            index,
            similarity: cosineSimilarity(questionEmbedding, embedding)
        }));
        
        // 排序並獲取前15個最相關的片段用於rerank
        const topResults = similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 15);
        
        // 準備要重新排序的文本
        const textsToRerank = topResults.map(result => contentChunks[result.index]);
        
        // 使用 rerank 進行重新排序
        const rerankedResults = await rerankResults(question, textsToRerank);
        
        if (rerankedResults.length > 0) {
            // 組合重新排序後的相關文本
            const context = rerankedResults
                .map(result => result.document.text)
                .join('\n\n');
            
            // 使用 LLM 生成回答
            const systemPrompt = `你是一個專業的問答助手。請根據提供的上下文內容，以繁體中文回答用戶的問題。
            如果上下文中沒有足夠的資訊來回答問題，請誠實說明。
            回答應該簡潔明瞭，並且直接針對問題給出答案。
            #zh-TW`;

            const userPrompt = `根據以下內容以繁體中文回答問題：\n\n
            內容：\n
            ${context}\n\n
            問題：\n${question}\n\n
            請以繁體中文提供準確且相關的回答。
            #zh-TW`;

            const apiConfig = getApiConfig()[currentApi];
            const answer = await callLLMAPI(apiConfig, systemPrompt, userPrompt, 1024, "llama-3.2-90b-vision-preview");
            
            // 顯示回答
            document.getElementById('answerText').textContent = answer;
            document.getElementById('answerContainer').style.display = 'block';
        } else {
            document.getElementById('answerText').textContent = "無法找到相關的內容來回答您的問題。";
            document.getElementById('answerContainer').style.display = 'block';
        }
        
    } catch (error) {
        console.error('處理問題時發生錯誤:', error);
        document.getElementById('answerText').textContent = `錯誤：${error.message}`;
        document.getElementById('answerContainer').style.display = 'block';
    }
}

// 添加餘弦相似度計算函數
function cosineSimilarity(a, b) {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (normA * normB);
}
