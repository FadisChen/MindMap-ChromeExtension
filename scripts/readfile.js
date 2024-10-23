const dropZone = document.getElementById('drop-zone');
const output = document.getElementById('output');
const charCount = document.getElementById('charCount');

// 添加錯誤處理
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global error:', message, 'at', source, lineno, colno);
    output.value = '發生錯誤: ' + message;
};

// 確保 PDF.js 已正確加載
if (typeof pdfjsLib === 'undefined') {
    console.error('PDF.js library not loaded');
    output.value = 'PDF.js 庫未正確加載';
} else {
    console.log('PDF.js library loaded successfully');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'scripts/pdf.worker.min.js';
}

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    
    console.log('File dropped:', file.name, 'Type:', file.type);
    output.value = '正在處理文件: ' + file.name;

    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        handleWordFile(file);
    } else if (file.type === 'application/pdf') {
        handlePdfFile(file);
    } else if (file.type.startsWith('image/')) {
        handleImageFile(file);
    } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        handleTxtFile(file);
    } else {
        output.value = '請上傳 Word (.docx)、PDF、TXT 文檔 或 jpg、png 圖片。';
    }
});

function handleWordFile(file) {
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
        const arrayBuffer = loadEvent.target.result;
        mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
            .then(result => {
                const text = stripHtmlTags(result.value);
                output.value = text;
                updateCharCount(text);
            })
            .catch(error => {
                console.error('Word 轉換錯誤:', error);
                output.value = 'Word 轉換過程中發生錯誤，請稍後再試。';
            });
    };
    reader.readAsArrayBuffer(file);
}

function handlePdfFile(file) {
    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
        const arrayBuffer = loadEvent.target.result;
        try {
            console.log('Starting PDF processing');
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            console.log('PDF loaded, pages:', pdf.numPages);
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                console.log('Processing page', i);
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(' ') + '\n\n';
            }
            output.value = text;
            updateCharCount(text);
            console.log('PDF processing completed');
        } catch (error) {
            console.error('PDF 轉換錯誤:', error);
            output.value = 'PDF 轉換過程中發生錯誤，請稍後再試。錯誤詳情: ' + error.message;
        }
    };
    reader.readAsArrayBuffer(file);
}

function handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
        const base64Image = loadEvent.target.result.split(',')[1];
        sendToGroqAPI(base64Image);
    };
    reader.readAsDataURL(file);
}

function handleTxtFile(file) {
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
        const text = loadEvent.target.result;
        output.value = text;
        updateCharCount(text);
    };
    reader.readAsText(file);
}

function sendToGroqAPI(base64Image) {
    chrome.storage.local.get(['groqApiKey'], function(result) {
        const apiKey = result.groqApiKey;
        if (!apiKey) {
            output.value = '錯誤：API Key 未設置。請在擴展設置中設置 API Key。';
            return;
        }

        const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

        const data = {
            model: "llama-3.2-90b-vision-preview",
            messages: [
                {
                    role: "user",
                    content: [
                        {type: "text", text: "請輸出圖片裡的文字(包含中文、英文、數字等)，不要解釋與說明。圖片內容裡的文字是："},
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`,
                            },
                        },
                    ],
                }
            ],
        };

        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            const result = data.choices[0].message.content.replace("The text in the image includes the following:", "");
            output.value = result;
            updateCharCount(result);
        })
        .catch(error => {
            console.error('API 請求錯誤:', error);
            output.value = '圖片處理過程中發生錯誤，請稍後再試。';
        });
    });
}

function stripHtmlTags(html) {
    let tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

function updateCharCount(text) {
    chrome.storage.local.get(['maxTokens', 'overlapTokens'], function(result) {
        const maxTokens = result.maxTokens || 5000;
        const overlapTokens = result.overlapTokens || 200;
        const cleanText = stripHtmlTags(text);
        const charLength = cleanText.length;
        const apiCalls = Math.ceil(charLength / maxTokens);
        charCount.textContent = `${charLength} 字 / ${apiCalls} 次`;
    });
}

// 防止整個文檔的拖放行為
document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
});

// 監聽 output 的變化
output.addEventListener('input', function() {
    updateCharCount(this.value);
});
