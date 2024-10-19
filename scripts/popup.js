let apiKey = '';
let model = 'gemma2-9b-it';
let scale = 1;
let isDragging = false;
let startX, startY;

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
        document.getElementById('clearButton').click();
        // 確保 content 是乾淨的文本
        content = stripHtmlTags(content);
        
        if (!apiKey) {
            //throw new Error("API Key 未設置");
            document.getElementById('mindmapContainer').innerHTML = `
            <div style="color: red; padding: 10px; text-align: center;">
                錯誤：API Key 未設置。
            </div>`;
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
            currentMindmap = convertToFullWidth(currentMindmap);
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
            const userPrompt = "請為以下內容<context>生繁體中文摘要：\n\n<context>\n\n" + segment + "\n\n</context>\n\n#zh-TW";

            if (i > 0) {
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
                                // 逐字顯示摘要，每個字間隔0.07秒
                                for (let char of parsed.choices[0].delta.content) {
                                    displayedSummary += char;
                                    document.getElementById('summaryText').textContent = allSummaries.join("\n\n") + (allSummaries.length > 0 ? "\n\n" : "") + displayedSummary;
                                    document.getElementById('summaryContainer').style.display = 'block';
                                    await delay(70);
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

function renderMindmap(mermaidCode) {
    if (mermaidCode === '') {
        return;
    }

    const mindmapContainer = document.getElementById('mindmapContainer');
    mindmapContainer.innerHTML = '';
    mermaid.render('mindmap', mermaidCode).then(result => {
        mindmapContainer.innerHTML = result.svg;
        applyZoom();
    }).catch(error => {
        //console.error('Error rendering mindmap:', error);
        mindmapContainer.innerHTML = '<p>Error rendering mindmap. Please check the Mermaid syntax.</p>';
    });
}

function downloadMindmap() {
    const svg = document.querySelector('#mindmapContainer svg');
    if (!svg) {
        //console.error('No SVG found');
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

//去除str裡的雙引號，將括號內的括號轉全形
function convertToFullWidth(str) {
    str = str.replace(/"/g, '');
    const brackets = {
        '[': '［',
        ']': '］',
        '(': '（',
        ')': '）',
        '{': '｛',
        '}': '｝'
    };

    function convert(s) {
        const stack = [];
        const result = s.split('');

        for (let i = 0; i < s.length; i++) {
            if (['[', '(', '{'].includes(s[i])) {
                stack.push({ char: s[i], index: i });
            } else if ([']', ')', '}'].includes(s[i])) {
                if (stack.length > 0) {
                    const open = stack.pop();
                    if (stack.length > 0) {
                        result[open.index] = brackets[open.char];
                        result[i] = brackets[s[i]];
                    }
                }
            }
        }

        return result.join('');
    }

    return convert(str);
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
