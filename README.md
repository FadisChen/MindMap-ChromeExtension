# 心智圖生成器 Chrome 擴充功能 / Mind Map Generator Chrome Extension

[English Version](#english-version)

這是一個基於 Groq API 和 OpenAI API 的 Chrome 擴充功能，可以自動生成心智圖和文章摘要。

## 主要功能

1. 從網頁選取文字並生成心智圖
2. 上傳 Word、PDF、TXT 文件或圖片進行文字識別和心智圖生成
3. 自動生成文章摘要
4. 互動式心智圖顯示和編輯
5. 將心智圖和摘要一起下載為 SVG 格式
6. 支援手動輸入文字生成心智圖和摘要
7. 支援右鍵選單快速生成心智圖
8. 提供智慧問答功能，可針對文件內容進行提問

## 特色

- 支援 Groq API 和 OpenAI API 進行自然語言處理和圖像識別
- 支援繁體中文
- 互動式心智圖使用 Cytoscape.js 實現
- 可自定義 API 金鑰和模型選擇
- 支援多種文件格式: Word (.docx)、PDF、TXT、圖片 (JPG、PNG)
- 提供即時字數統計功能（可開關）
- 支援 Jina AI API 進行文本向量化和相似度搜尋
- 可自定義單次處理字數和重疊字數
- 可調整 API 請求延遲時間
- 支援心智圖節點拖曳和自動布局
- 提供心智圖編輯模式，可直接修改 Mermaid 語法
- 支援心智圖自動優化功能

## 安裝方式

1. 下載此專案的 ZIP 檔案並解壓縮
2. 在 Chrome 瀏覽器中前往 `chrome://extensions/`
3. 開啟右上角的「開發人員模式」
4. 點擊「載入未封裝項目」，選擇解壓縮後的資料夾

## 使用說明

1. 點擊擴充功能圖示開啟側邊欄
2. 在設定中選擇 API 類型（Groq 或 OpenAI），並輸入相應的 API 金鑰和模型名稱
3. 使用「擷取內容」按鈕選取網頁文字，或使用「上傳檔案」按鈕上傳文件，或直接輸入文字
4. 等待心智圖和摘要生成
5. 使用互動式介面查看和編輯心智圖
6. 點擊「下載」按鈕將心智圖和摘要一起儲存為 SVG 檔案
7. 可使用問答功能針對文件內容進行提問
8. 可透過右鍵選單直接選取文字生成心智圖

## 進階設定

- 可在設定中調整單次處理字數（預設 5000 字）
- 可設定文本重疊字數（預設 200 字）以確保文本連貫性
- 可調整 API 請求延遲時間（預設 3 秒）
- 可設定 Jina AI API 金鑰以啟用智慧問答功能
- 支援自定義 Groq 和 OpenAI 的模型選擇
- 可選擇是否啟用智慧問答功能
- 可開關字數統計功能

## 注意事項

- 使用前請確保已設定有效的 API 金鑰
- 大型文件處理可能需要較長時間，請耐心等待
- 圖片識別功能僅支援 JPG 和 PNG 格式
- 智慧問答功能需要設定有效的 Jina AI API 金鑰並啟用該功能才能使用

---

# English Version

This is a Chrome extension based on the Groq API and OpenAI API that automatically generates mind maps and article summaries.

## Main Features

1. Generate mind maps from selected text on web pages
2. Upload Word, PDF, TXT documents, or images for text recognition and mind map generation
3. Automatic article summary generation
4. Interactive mind map display and editing
5. Download mind maps with summaries in SVG format
6. Support manual text input for mind map and summary generation
7. Support right-click menu to quickly generate mind maps
8. Provide intelligent question-answering functionality, which can ask questions about the content of the file

## Highlights

- Supports both Groq API and OpenAI API for natural language processing and image recognition
- Supports Traditional Chinese
- Interactive mind maps implemented using Cytoscape.js
- Customizable API key and model selection
- Supports multiple file formats: Word (.docx), PDF, TXT, images (JPG, PNG)
- Provides real-time character count feature
- Supports Jina AI API for text vectorization and similarity search
- Customizable single-processing character count and overlap character count
- Adjustable API request delay time
- Supports mind map node dragging and automatic layout
- Provides mind map editing mode, which can directly modify Mermaid syntax
- Supports mind map optimization functionality

## Installation

1. Download the ZIP file of this project and extract it
2. Go to `chrome://extensions/` in your Chrome browser
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extracted folder

## Usage Instructions

1. Click the extension icon to open the popup window
2. In settings, choose the API type (Groq or OpenAI) and enter the corresponding API key and model name
3. Use the "Capture Content" button to select text from web pages, use the "Upload File" button to upload documents, or directly input text
4. Wait for the mind map and summary to generate
5. Use the interactive interface to view and edit the mind map
6. Click the "Download" button to save the mind map and summary together as an SVG file
7. Use the question-answering functionality to ask questions about the content of the file
8. Use the right-click menu to directly select text to generate a mind map

## Advanced Settings

- Adjust the single-processing character count (default 5000 characters) in the settings
- Set the text overlap character count (default 200 characters) to ensure text continuity
- Adjust the API request delay time (default 3 seconds)
- Set the Jina AI API key to enable the intelligent question-answering functionality
- Supports custom Groq and OpenAI model selection
- Choose whether to enable the intelligent question-answering functionality

## Notes

- Ensure you have set a valid API key before use
- Processing large documents may take longer, please be patient
- Image recognition feature only supports JPG and PNG formats
- When capturing web content, you can press the ESC key to cancel the operation
- The intelligent question-answering functionality requires a valid Jina AI API key to be enabled to use
