// ==UserScript==
// @name         Gemini Prompt Panel
// @namespace    https://github.com/SysAdminDoc/Gemini-Prompt-Panel
// @version      28.0
// @description  Adds group editing, preset themes, and fixes for sorting and saving.
// @author       Matthew Parker
// @match        https://gemini.google.com/*
// @icon         https://upload.wikimedia.org/wikipedia/commons/1/1d/Google_Gemini_icon_2025.svg
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      api.github.com
// @connect      gist.githubusercontent.com
// @run-at       document-idle
// @license      MIT
// @updateURL    https://github.com/SysAdminDoc/Gemini-Prompt-Panel/raw/refs/heads/main/Gemini%20Prompt%20Panel.user.js
// @downloadURL  https://github.com/SysAdminDoc/Gemini-Prompt-Panel/raw/refs/heads/main/Gemini%20Prompt%20Panel.user.js
// ==/UserScript==

(function() {
    'use strict';

    console.log('Gemini Prompt Panel v28.0 (Final Fixes & Features) loaded');

    // --- CONFIG & KEYS ---
    const DEFAULT_PROMPTS = {
      "Content Creation": [
        {"id": "cc-1", "name":"Brainstorm Ideas","text":"Brainstorm 5 unique ideas for a blog post about...","tags":"writing,blogging,ideas", "pinned": true, "autoSend":false, "usageCount": 0, "lastUsed": null},
        {"id": "cc-2", "name":"Write Ad Copy","text":"Write a compelling ad copy for the following product:","tags":"marketing,advertising", "pinned": false, "autoSend":false, "usageCount": 0, "lastUsed": null}
      ],
      "Code & Tech": [
        {"id": "ct-1", "name":"Explain Code","text":"Explain this code snippet, its purpose, and how it works:\n\n","tags":"code,refactor,explain", "pinned": false, "autoSend":false, "usageCount": 0, "lastUsed": null},
        {"id": "ct-2", "name":"Refactor Code","text":"Refactor the following code to improve its readability and efficiency. Add comments explaining the changes.","tags":"code,development", "pinned": false, "autoSend":true, "usageCount": 0, "lastUsed": null}
      ]
    };
    const GM_PROMPTS_KEY = 'gemini_custom_prompts_v6';
    const GM_SETTINGS_KEY = 'gemini_panel_settings_v17'; // Version bump
    const GM_HISTORY_KEY = 'gemini_prompt_history_v1';

    // --- ICONS (SVG Paths) ---
    function makeIcon(svgPath, size = 20) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        svg.style.fill = 'currentColor';
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', svgPath);
        svg.appendChild(path);
        return svg;
    }
    const icons = {
        plus: makeIcon('M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z', 18),
        unlocked: makeIcon('M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z', 18),
        locked: makeIcon('M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h2V6c0-1.65 1.35-3 3-3s3 1.35 3 3v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z', 18),
        settings: makeIcon('M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84 c-0.24,0-0.44,0.17-0.48,0.41L9.22,5.25C8.63,5.5,8.1,5.82,7.6,6.2L5.21,5.24C4.99,5.16,4.74,5.23,4.62,5.45L2.7,8.77 c-0.11,0.2-0.06,0.47,0.12,0.61l2.03,1.58C4.82,11.36,4.8,11.68,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.38,2.44 c0.04,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.48-0.41l0.38-2.44c0.59-0.24,1.12-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0.01,0.59-0.22l1.92-3.32c0.11-0.2,0.06-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z', 18),
        trash: makeIcon('M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z', 18),
        edit: makeIcon('M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z', 16),
        arrowLeft: makeIcon('M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z', 18),
        arrowRight: makeIcon('M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z', 18),
        chevronDown: makeIcon('M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z', 18),
        star: makeIcon('M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z', 18),
        starOutline: makeIcon('M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z', 18),
        pin: makeIcon('M16 9V4h-2v5h-2V4H9v5H7V4H5v5c0 1.66 1.34 3 3 3v7l-1.5 1.5h9L13 19v-7c1.66 0 3-1.34 3-3z', 16),
        pinOutline: makeIcon('M14 4v5c0 .55.45 1 1 1h1V4h-2zm-4 0v6h2V4H10zM7 9h2V4H7v5c0 .55.45 1 1 1h1V4H8c-1.66 0-3 1.34-3 3v5l-1.5 1.5h9L13 19v-7c1.66 0 3-1.34 3-3V4h-2v5c0 .55-.45 1-1 1h-1V4h-2z', 16),
        navUp: makeIcon('M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z'),
        navDown: makeIcon('M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z'),
        navToTop: makeIcon('M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14l-6-6zM12 2L6 8l1.41 1.41L12 4.83l4.59 4.58L18 8l-6-6z'),
        navToBottom: makeIcon('M12 16l-6-6 1.41-1.41L12 13.17l4.59-4.58L18 10l-6 6zm0 6l-6-6 1.41-1.41L12 19.17l4.59-4.58L18 14l-6 6z'),
        navInwardLeft: makeIcon('M11.67 3.87L9.9 2.1 0 12l9.9 9.9 1.77-1.77L3.54 12z'),
        navInwardRight: makeIcon('M5.88 4.12L13.76 12l-7.88 7.88L8 22l10-10L8 2z'),
        close: makeIcon('M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z', 18),
        importExport: makeIcon('M9 3L5 7h3v7h2V7h3l-4-4zM16 17v-7h-2v7H9l4 4 4-4h-3z', 18),
        sparkle: makeIcon('M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12z', 16),
        sync: makeIcon('M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z', 18),
        chart: makeIcon('M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z', 18),
        palette: makeIcon('M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4c-.83 0-1.5-.67-1.5-1.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z', 18),
        history: makeIcon('M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.25 2.52.75-1.23-3.5-2.07V8H12z', 18),
        panelIcon: makeIcon('M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 16H3V5h9v14zm2 0h7V5h-7v14z', 22)
    };

    // --- CSS ---
    GM_addStyle(`
        :root {
            --panel-bg: #2a2a2e; --panel-text: #e0e0e0; --panel-header-bg: #3a3a3e; --panel-border: #4a4a4e;
            --input-bg: #3c3c41; --input-text: #f0f0f0; --input-border: #5a5a5e;
            --btn-green-grad-start: #28a745; --btn-green-grad-end: #218838; --btn-green-border: #1e7e34;
            --handle-color: #28a745; --favorite-color: #FFD700; --pin-color: #34c759; --ai-color: #8A2BE2;
            --modal-bg: rgba(0, 0, 0, 0.7); --modal-content-bg: #2c2c30;
            --nav-btn-size: 36px; --tag-bg: #555; --tag-text: #ddd;
        }
        /* Panel & Handle */
        .gemini-prompt-panel { position: fixed; top: var(--panel-top, 90px); z-index: 9999; background: var(--panel-bg); color: var(--panel-text); border: 1px solid var(--panel-border); border-radius: 10px; box-shadow: 0 8px 25px rgba(0,0,0,0.4); display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1); user-select: none; width: var(--panel-width, 320px); box-sizing: border-box; }
        .gemini-prompt-panel.left-side { left: 0; transform: translateX(-100%); }
        .gemini-prompt-panel.right-side{ right:0; transform: translateX(100%); }
        .gemini-prompt-panel.visible { transform: translateX(0); }
        .panel-handle { position: fixed; top: var(--panel-top, 90px); width: 8px; height: 100px; background: linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.15)); cursor: pointer; z-index: 9998; transition: all 0.2s; border-radius: 0 5px 5px 0; box-shadow: inset -1px 0 0 rgba(255,255,255,0.1); }
        .panel-handle::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--handle-color); border-radius: 0 2px 2px 0; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .panel-handle:hover::before { background: #34c759; width: 100%; }
        .panel-handle.right-side-handle { right: 0; left: auto; transform: scaleX(-1); }
        .gemini-resize-handle { position: absolute; top: 0; bottom: 0; width: 6px; cursor: ew-resize; z-index: 10; }
        .gemini-resize-handle.left-handle { left: -3px; }
        .gemini-resize-handle.right-handle { right: -3px; }
        .gemini-prompt-panel-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--panel-header-bg); cursor: grab; font-size: 14px; font-weight: bold; position: relative; border-bottom: 1px solid var(--panel-border); }
        .panel-title { position: absolute; left: 50%; transform: translateX(-50%); pointer-events: none; }
        .panel-header-controls { display:flex; gap:2px; align-items: center; }
        .panel-header-controls button { background: transparent; border: none; color: var(--panel-text); cursor: pointer; padding: 4px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s; }
        .panel-header-controls button:hover { background-color: rgba(255,255,255,0.1); }
        .gemini-prompt-panel-content { padding:12px; display:flex; flex-direction:column; gap:10px; flex-grow: 1; overflow: hidden; }
        .button-group { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .gemini-prompt-panel-button { border: 1px solid; color: white; padding: 8px 12px; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all .2s; box-shadow: 0 2px 5px rgba(0,0,0,0.2); text-shadow: 1px 1px 1px rgba(0,0,0,0.2); }
        .gemini-prompt-panel-button:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .copy-btn { background: linear-gradient(to bottom, var(--btn-green-grad-start), var(--btn-green-grad-end)); border-color: var(--btn-green-border); }
        .prompt-group-container { display: flex; flex-direction: column; overflow-y: auto; padding-right: 5px; margin-right: -5px; flex-grow: 1; }
        /* Prompt Buttons & Categories */
        .prompt-button-wrapper { display: flex; flex-direction: column; background: #3a3a3e; border: 1px solid var(--panel-border); border-radius: 6px; cursor: grab; transition: box-shadow .2s, transform .2s; }
        .prompt-button-wrapper.dragging { opacity: 0.5; background: #4a4a4e; }
        .prompt-button-wrapper.drag-over { border-bottom: 2px solid var(--pin-color); }
        .prompt-button { position:relative; display: flex; align-items: center; padding: 8px; gap: 8px; }
        .prompt-button .prompt-button-name { flex-grow: 1; text-align: left; font-weight: 500; font-size: 14px; }
        .prompt-button-controls { display: none; position: absolute; right: 4px; top: 50%; transform: translateY(-50%); gap: 2px; background: rgba(0,0,0,0.2); border-radius: 12px; padding: 2px; align-items: center; }
        .prompt-button-wrapper:hover .prompt-button-controls { display: flex; }
        .prompt-button-controls button { background: transparent; border: none; cursor: pointer; padding: 3px; border-radius: 50%; display:flex; align-items:center; color: var(--panel-text); }
        .prompt-button-controls button:hover { background-color: rgba(255,255,255,0.15); }
        .favorite-btn.favorited, .pin-btn.pinned { color: var(--favorite-color); }
        .pin-btn.pinned { color: var(--pin-color); }
        .ai-btn { color: var(--ai-color); }
        .prompt-tags-container { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 8px 8px; }
        .prompt-tag { background: var(--tag-bg); color: var(--tag-text); padding: 2px 6px; border-radius: 4px; font-size: 11px; }
        #custom-prompts-container { display:flex; flex-direction:column; max-height: none; }
        .search-add-container { padding: 0 0 10px; display: flex; flex-direction: column; gap: 8px; }
        #prompt-search-input { width: 100%; background: var(--input-bg); color: var(--input-text); border: 1px solid var(--input-border); border-radius: 4px; padding: 6px 8px; font-size: 13px; box-sizing: border-box; }
        #add-prompt-btn { border: none; color: white; position: relative; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08); background: linear-gradient(90deg, #4285F4, #DB4437, #F4B400, #0F9D58, #4285F4); background-size: 200% 100%; animation: google-gradient-animation 4s linear infinite; transition: transform 0.15s ease, box-shadow 0.15s ease; }
        @keyframes google-gradient-animation { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        #add-prompt-btn::after { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: linear-gradient(to right, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.35) 50%, rgba(255, 255, 255, 0) 100%); transform: translateX(-150%); transition: transform 0.6s ease; pointer-events: none; }
        #add-prompt-btn:hover::after { transform: translateX(150%); }
        #add-prompt-btn:active { transform: translateY(1px); box-shadow: 0 2px 4px rgba(0,0,0,0.1), 0 1px 1px rgba(0,0,0,0.08); }
        #favorites-category .prompt-category-header { background: linear-gradient(to right, #e8b31a, #d4a017); color: #1a1a1a; font-weight: bold; }
        .prompt-category { border: 1px solid var(--panel-border); border-radius: 6px; margin-bottom: 10px; overflow: hidden; transition: all 0.2s; }
        .prompt-category-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: var(--panel-header-bg); cursor: pointer; font-weight: bold; font-size: 13px; }
        .category-header-title { flex-grow: 1; }
        .category-header-controls { display: flex; align-items: center; gap: 4px; }
        .category-header-controls button { padding: 2px; }
        .category-color-picker { width: 18px; height: 18px; border: none; padding: 0; background: none; border-radius: 50%; cursor: pointer; }
        .category-toggle-icon { transition: transform 0.2s; }
        .prompt-category.collapsed .category-toggle-icon { transform: rotate(-90deg); }
        .prompt-category-content { display: flex; flex-direction: column; gap: 8px; padding: 10px; max-height: 500px; transition: max-height 0.3s ease-out, padding 0.3s ease-out, opacity 0.3s ease-out; }
        .prompt-category.collapsed .prompt-category-content { max-height: 0; padding-top: 0; padding-bottom: 0; opacity: 0; }
        /* Post Navigator */
        .post-navigator { position: fixed; display: flex; flex-direction: column; gap: 5px; z-index: 9997; transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
        .post-navigator button { background: var(--panel-header-bg); color: var(--panel-text); border: 1px solid var(--panel-border); width: var(--nav-btn-size); height: var(--nav-btn-size); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.4); transition: all 0.2s, opacity 0.3s; opacity: 0; pointer-events: none; }
        .post-navigator button.visible { opacity: 1; pointer-events: auto; }
        .post-navigator button:hover { background: var(--panel-bg); filter: brightness(1.2); transform: scale(1.05); }
        .post-navigator button:active { transform: scale(0.95); }
        .post-navigator .main-nav-arrow { position: fixed; top: calc(var(--panel-top, 90px) + 20px); z-index: 9998; }
        .gemini-prompt-panel.left-side.visible ~ .post-navigator { left: calc(var(--panel-width, 320px) + 10px); }
        .gemini-prompt-panel.left-side:not(.visible) ~ .post-navigator { left: 10px; }
        .gemini-prompt-panel.right-side.visible ~ .post-navigator { right: calc(var(--panel-width, 320px) + 10px); }
        .gemini-prompt-panel.right-side:not(.visible) ~ .post-navigator { right: 10px; }
        .gemini-prompt-panel.left-side ~ .post-navigator .main-nav-arrow { left: calc(var(--panel-width, 320px) - (var(--nav-btn-size) / 2)); }
        .gemini-prompt-panel.left-side:not(.visible) ~ .post-navigator .main-nav-arrow { left: calc(var(--handle-width, 8px) - (var(--nav-btn-size) / 2)); }
        .gemini-prompt-panel.right-side ~ .post-navigator .main-nav-arrow { right: calc(var(--panel-width, 320px) - (var(--nav-btn-size) / 2)); }
        .gemini-prompt-panel.right-side:not(.visible) ~ .post-navigator .main-nav-arrow { right: calc(var(--handle-width, 8px) - (var(--nav-btn-size) / 2)); }
        /* Modals, Toast, Settings */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--modal-bg); z-index: 10000; display: none; align-items: center; justify-content: center; backdrop-filter: blur(2px); }
        .modal-content { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--modal-content-bg); color: var(--panel-text); padding: 20px; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); width: 90%; max-width: 600px; position: relative; display: flex; flex-direction: column; max-height: 90vh; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid var(--panel-border); padding-bottom: 10px; flex-shrink: 0; }
        .modal-title { font-size: 1.2em; font-weight: bold; }
        .modal-close-btn { background: none; border: none; color: var(--panel-text); cursor: pointer; padding: 5px; border-radius: 50%; display:flex; }
        .modal-close-btn:hover { background-color: rgba(255,255,255,0.1); }
        .modal-body { overflow-y: auto; padding-right: 10px; }
        .modal-body > form > .form-section { margin-bottom: 20px; }
        .form-section, .settings-section { display: flex; flex-direction: column; gap: 8px; }
        .form-row { display: flex; gap: 20px; align-items: center; margin-bottom: 15px; }
        .settings-section { flex-direction: row; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--panel-border); }
        .settings-section:last-of-type { border-bottom: none; }
        .settings-section .label-group { display: flex; flex-direction: column; gap: 2px; }
        .settings-section .label-group label { font-size: 14px; font-weight: 500; }
        .settings-section .label-group .description { font-size: 12px; color: #aaa; }
        .form-section label, .settings-section label, .form-row label { font-size: 14px; font-weight: 500; }
        .form-section input, .form-section textarea, .form-section select { width: 100%; background: var(--input-bg); color: var(--input-text); border: 1px solid var(--input-border); border-radius: 4px; padding: 8px; font-size: 14px; box-sizing: border-box; }
        .form-section textarea { min-height: 120px; resize: vertical; }
        .form-checkbox { display: flex; align-items: center; gap: 10px; font-size: 14px; }
        .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-switch label { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #555; transition: .4s; border-radius: 24px; }
        .toggle-switch label:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        .toggle-switch input:checked + label { background-color: var(--handle-color); }
        .toggle-switch input:checked + label:before { transform: translateX(20px); }
        .toast-notification { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #333; color: white; padding: 12px 20px; border-radius: 6px; z-index: 10001; opacity: 0; transition: opacity 0.3s, bottom 0.3s; pointer-events: none; }
        .toast-notification.show { opacity: 1; bottom: 40px; }
        /* AI Enhancer Modal */
        #ai-enhancer-modal .diff-container { border: 1px solid var(--panel-border); border-radius: 6px; padding: 10px; min-height: 150px; background: var(--input-bg); font-family: monospace; white-space: pre-wrap; }
        #ai-enhancer-modal .diff-container ins { background-color: #28a7454D; text-decoration: none; }
        #ai-enhancer-modal .diff-container del { background-color: #dc35454D; text-decoration: none; }
        /* Theme & Analytics */
        .color-picker-row { display: flex; align-items: center; gap: 10px; }
        .color-picker-row input[type="color"] { width: 40px; height: 24px; padding: 0; border: none; background: none; border-radius: 4px; cursor: pointer; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
        .stat-card { background: var(--panel-header-bg); padding: 15px; border-radius: 8px; }
        .stat-card h3 { margin: 0 0 10px; font-size: 1em; border-bottom: 1px solid var(--panel-border); padding-bottom: 5px;}
        .stat-card ul { margin: 0; padding: 0; list-style: none; }
        .stat-card li { display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.9em; }
        .stat-card li .stat-value { font-weight: bold; }
        /* Version History Modal */
        #history-list { list-style: none; padding: 0; margin: 0; }
        #history-list li { background: var(--input-bg); padding: 10px; border-radius: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
        #history-list li .history-text { white-space: pre-wrap; word-break: break-all; max-height: 60px; overflow: hidden; text-overflow: ellipsis; flex-grow: 1; margin-left: 10px; }
        /* Floating Mini Panel */
        #mini-panel-trigger { position: absolute; right: 50px; bottom: 10px; z-index: 1000; background: var(--panel-header-bg); border: 1px solid var(--panel-border); color: var(--panel-text); border-radius: 50%; width: 36px; height: 36px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .2s; }
        #mini-panel-trigger:hover { filter: brightness(1.2); }
        #floating-mini-panel { position: absolute; bottom: 60px; right: 10px; width: 300px; max-height: 40vh; z-index: 9999; background: var(--panel-bg); border: 1px solid var(--panel-border); border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); display: none; flex-direction: column; overflow: hidden; }
        #floating-mini-panel.visible { display: flex; }
        #floating-mini-panel .prompt-group-container { padding: 8px; }
    `);

    // --- STATE & SETTINGS ---
    let panel, handle, promptFormModal, toast, resizeHandle, navigator, settingsModal, importExportModal, aiEnhancerModal, analyticsModal, versionHistoryModal, floatingMiniPanel, miniPanelTrigger;
    let leftHeaderControls, rightHeaderControls, actionGroup;
    let lockButton, arrowLeftBtn, arrowRightBtn, settingsBtn, analyticsBtn;
    let copyResponseButton, copyCodeButton;
    let currentPrompts = {}, promptHistory = {}, isManuallyLocked = false, isFormActiveLock = false;
    let settings = {};
    const defaultSettings = {
        theme: 'dark', position: 'left', topOffset: '90px', panelWidth: 320, handleWidth: 8,
        collapsedCategories: [], favorites: [], initiallyCollapsed: false, copyButtonOrderSwapped: false,
        showTags: true, showPins: true, enableAIenhancer: true, geminiAPIKey: '', gistURL: '',
        enableMiniMode: true,
        groupColors: {},
        colors: {
            '--panel-bg': '#2a2a2e', '--panel-header-bg': '#3a3a3e', '--handle-color': '#28a745',
            '--favorite-color': '#FFD700', '--pin-color': '#34c759', '--ai-color': '#8A2BE2'
        }
    };
    const presetThemes = {
        dark: { ...defaultSettings.colors },
        light: {
            '--panel-bg': '#f0f0f0', '--panel-header-bg': '#e0e0e0', '--handle-color': '#007aff',
            '--favorite-color': '#ffab00', '--pin-color': '#34c759', '--ai-color': '#5856d6'
        },
        glass: {
            '--panel-bg': 'rgba(42, 42, 46, 0.8)', '--panel-header-bg': 'rgba(58, 58, 62, 0.8)', '--handle-color': '#00ffc8',
            '--favorite-color': '#FFD700', '--pin-color': '#34c759', '--ai-color': '#bf5af2'
        },
        hacker: {
            '--panel-bg': '#0a0a0a', '--panel-header-bg': '#1a1a1a', '--handle-color': '#00ff00',
            '--favorite-color': '#00ff00', '--pin-color': '#00ff00', '--ai-color': '#00ff00'
        }
    };

    // --- CORE HELPERS ---
    function showToast(message, duration = 2000) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), duration); }
    function hidePanel() { if (!isManuallyLocked && !isFormActiveLock && !panel.classList.contains('is-resizing')) panel.classList.remove('visible'); }
    function updateLockIcon() { if (lockButton) { while (lockButton.firstChild) lockButton.removeChild(lockButton.firstChild); lockButton.appendChild(((isManuallyLocked || isFormActiveLock) ? icons.locked : icons.unlocked).cloneNode(true)); } }
    function createButtonWithIcon(txt, ic) { const b = document.createElement('button'); b.className = 'gemini-prompt-panel-button'; if (ic) b.appendChild(ic.cloneNode(true)); b.appendChild(document.createTextNode(txt)); return b; }
    async function loadSettings() {
        let loadedSettings = await GM_getValue(GM_SETTINGS_KEY, defaultSettings);
        settings = { ...defaultSettings, ...loadedSettings };
        settings.colors = { ...defaultSettings.colors, ...(settings.colors || {}) };
        settings.groupColors = settings.groupColors || {};
    }
    async function saveSettings() { await GM_setValue(GM_SETTINGS_KEY, settings); }

    // --- THEME ---
    function applyTheme() {
        for (const [key, value] of Object.entries(settings.colors)) {
            document.documentElement.style.setProperty(key, value);
        }
    }

    // --- RENDER & UI ---
    async function applySettingsAndTheme() {
        applyTheme();
        const wasLockedAndVisible = panel.classList.contains('visible') && isManuallyLocked;
        panel.className = 'gemini-prompt-panel';
        if(wasLockedAndVisible) panel.classList.add('visible');
        const p = settings.position;
        panel.classList.add(p === 'left' ? 'left-side' : 'right-side');
        handle.classList.toggle('right-side-handle', p === 'right');
        resizeHandle.className = `gemini-resize-handle ${settings.position === 'right' ? 'left-handle' : 'right-handle'}`;
        navigator.style.top = settings.topOffset;
        panel.style.setProperty('--panel-width', `${settings.panelWidth}px`);
        panel.style.setProperty('--handle-width', `${settings.handleWidth}px`);
        handle.style.width = `${settings.handleWidth}px`;
        panel.style.setProperty('--panel-top', settings.topOffset);
        handle.style.top = settings.topOffset;
        updateHeaderLayout();
        renderActionButtons();
        updateNavigator();
        updateHandleHeight();
        renderAllPrompts();
    }

    function updateHeaderLayout() {
        while(leftHeaderControls.firstChild) leftHeaderControls.removeChild(leftHeaderControls.firstChild);
        while(rightHeaderControls.firstChild) rightHeaderControls.removeChild(rightHeaderControls.firstChild);
        if (settings.position === 'left') {
            leftHeaderControls.append(settingsBtn, analyticsBtn);
            rightHeaderControls.append(lockButton, arrowRightBtn);
        } else {
            leftHeaderControls.append(arrowLeftBtn, lockButton);
            rightHeaderControls.append(analyticsBtn, settingsBtn);
        }
    }

    function renderActionButtons() {
        while (actionGroup.firstChild) actionGroup.removeChild(actionGroup.firstChild);
        let isCodeFirst = (settings.position === 'right');
        if (settings.copyButtonOrderSwapped) isCodeFirst = !isCodeFirst;
        if (isCodeFirst) {
            actionGroup.append(copyCodeButton, copyResponseButton);
        } else {
            actionGroup.append(copyResponseButton, copyCodeButton);
        }
    }

    function updateHandleHeight() { if (!panel || !handle) return; setTimeout(() => { const panelHeight = panel.offsetHeight; if (panelHeight > 0) handle.style.height = `${panelHeight}px`; }, 100); }

    // --- PROMPT & CATEGORY MGMT ---
    function savePrompts() { GM_setValue(GM_PROMPTS_KEY, JSON.stringify(currentPrompts)); }
    async function loadAndDisplayPrompts(isSync = false) {
        if (!isSync) {
            let raw = await GM_getValue(GM_PROMPTS_KEY);
            try {
                let loadedPrompts = JSON.parse(raw);
                if (typeof loadedPrompts === 'object' && loadedPrompts !== null && Object.keys(loadedPrompts).length > 0) {
                    currentPrompts = loadedPrompts;
                } else { throw new Error("Invalid or empty format"); }
            } catch {
                currentPrompts = JSON.parse(JSON.stringify(DEFAULT_PROMPTS));
                // FIX: Save fallback prompts if they are loaded for the first time
                await savePrompts();
            }
        }
        Object.values(currentPrompts).flat().forEach((p, i) => {
            p.id = p.id || `prompt-${Date.now()}-${i}`;
            p.tags = p.tags ?? '';
            p.pinned = p.pinned ?? false;
            p.usageCount = p.usageCount || 0;
            p.lastUsed = p.lastUsed || null;
        });
        if (!settings.initiallyCollapsed) {
            settings.collapsedCategories = [];
            settings.initiallyCollapsed = true;
            await saveSettings();
        }
        renderAllPrompts();
        renderMiniPanel();
    }

    function renderAllPrompts() {
        const container = panel.querySelector('#custom-prompts-container');
        while (container.firstChild) container.removeChild(container.firstChild);

        const allPrompts = Object.values(currentPrompts).flat();
        const favoritePrompts = allPrompts.filter(p => settings.favorites.includes(p.id));

        if (favoritePrompts.length > 0) {
            const favCategoryDiv = createCategory("Favorites", favoritePrompts, true);
            favCategoryDiv.id = 'favorites-category';
            container.appendChild(favCategoryDiv);
        }

        Object.entries(currentPrompts).forEach(([categoryName, prompts]) => {
            if (categoryName === "Favorites") return;
            // FIX: Correct sorting logic for pinned prompts
            const sortedPrompts = [...prompts].sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
            if (sortedPrompts.length > 0) {
                const categoryDiv = createCategory(categoryName, sortedPrompts, true);
                container.appendChild(categoryDiv);
            }
        });
        updateHandleHeight();
    }

    function createCategory(categoryName, prompts, isCollapsible, isMini = false) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'prompt-category';
        categoryDiv.dataset.categoryName = categoryName;
        const header = document.createElement('div');
        header.className = 'prompt-category-header';

        const customColor = settings.groupColors[categoryName];
        if (customColor) {
            header.style.backgroundColor = customColor;
        }

        const titleSpan = document.createElement('span');
        titleSpan.className = 'category-header-title';
        titleSpan.textContent = categoryName;

        const controls = document.createElement('div');
        controls.className = 'category-header-controls';

        if (!isMini && categoryName !== "Favorites") {
            const colorPicker = document.createElement('input');
            colorPicker.type = 'color';
            colorPicker.className = 'category-color-picker';
            colorPicker.value = customColor || '#3a3a3e'; // Default to header bg
            colorPicker.addEventListener('input', (e) => {
                header.style.backgroundColor = e.target.value;
            });
            colorPicker.addEventListener('change', (e) => {
                settings.groupColors[categoryName] = e.target.value;
                saveSettings();
            });

            const editBtn = document.createElement('button');
            editBtn.title = "Rename Group";
            editBtn.appendChild(icons.edit.cloneNode(true));
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const newName = prompt("Enter new name for the group:", categoryName);
                if (newName && newName.trim() !== "" && newName !== categoryName) {
                    if (currentPrompts[newName]) {
                        showToast("A group with this name already exists.", 3000);
                        return;
                    }
                    // Rename key in prompts and groupColors
                    currentPrompts[newName] = currentPrompts[categoryName];
                    delete currentPrompts[categoryName];
                    if (settings.groupColors[categoryName]) {
                        settings.groupColors[newName] = settings.groupColors[categoryName];
                        delete settings.groupColors[categoryName];
                    }
                    Promise.all([savePrompts(), saveSettings()]).then(renderAllPrompts);
                }
            });
            controls.append(colorPicker, editBtn);
        }

        if (isCollapsible) {
            const icon = icons.chevronDown.cloneNode(true);
            icon.classList.add('category-toggle-icon');
            controls.appendChild(icon);
            if (!isMini && categoryName !== "Favorites" && settings.collapsedCategories.includes(categoryName)) {
                categoryDiv.classList.add('collapsed');
            }
            header.addEventListener('click', () => {
                categoryDiv.classList.toggle('collapsed');
                if (!isMini) {
                    const isCollapsed = categoryDiv.classList.contains('collapsed');
                    if (isCollapsed && !settings.collapsedCategories.includes(categoryName)) {
                        settings.collapsedCategories.push(categoryName);
                    } else if (!isCollapsed) {
                        settings.collapsedCategories = settings.collapsedCategories.filter(c => c !== categoryName);
                    }
                    saveSettings();
                    updateHandleHeight();
                }
            });
        }

        header.append(titleSpan, controls);
        const content = document.createElement('div');
        content.className = 'prompt-category-content';
        prompts.forEach(p => addPromptButtonToPanel(p, content, categoryName, isMini));
        categoryDiv.append(header, content);
        return categoryDiv;
    }

    function addPromptButtonToPanel(promptData, container, categoryName, isMini = false) {
        const wrapper = document.createElement('div');
        wrapper.className = 'prompt-button-wrapper';
        wrapper.dataset.promptId = promptData.id;

        const btn = document.createElement('div');
        btn.className = 'prompt-button';

        if (isMini) {
            btn.addEventListener('click', () => {
                sendPromptToGemini(promptData, promptData.autoSend);
                floatingMiniPanel.classList.remove('visible');
            });
        } else {
            wrapper.draggable = true;
            wrapper.addEventListener('dragstart', handleDragStart);
            wrapper.addEventListener('dragover', handleDragOver);
            wrapper.addEventListener('dragleave', handleDragLeave);
            wrapper.addEventListener('drop', handleDrop);
            wrapper.addEventListener('dragend', handleDragEnd);
            btn.addEventListener('click', (e) => {
                if (e.target.closest('.prompt-button-controls')) return;
                sendPromptToGemini(promptData, promptData.autoSend);
            });
        }

        const nameSpan = document.createElement('span');
        nameSpan.className = 'prompt-button-name';
        nameSpan.textContent = promptData.name;
        btn.appendChild(nameSpan);

        if (!isMini) {
            const controls = document.createElement('div');
            controls.className = 'prompt-button-controls';

            const historyBtn = document.createElement('button');
            historyBtn.title = "View History";
            historyBtn.appendChild(icons.history.cloneNode(true));
            historyBtn.addEventListener('click', () => showVersionHistory(promptData));
            controls.appendChild(historyBtn);

            if (settings.enableAIenhancer) {
                const aiBtn = document.createElement('button');
                aiBtn.title = "Enhance with AI";
                aiBtn.classList.add('ai-btn');
                aiBtn.appendChild(icons.sparkle.cloneNode(true));
                aiBtn.addEventListener('click', () => showAIEnhancer(promptData));
                controls.appendChild(aiBtn);
            }
            const pinBtn = document.createElement('button');
            pinBtn.title = "Pin to Top"; pinBtn.classList.add('pin-btn');
            const isPinned = promptData.pinned;
            pinBtn.appendChild((isPinned ? icons.pin : icons.pinOutline).cloneNode(true));
            if(isPinned) pinBtn.classList.add('pinned');
            pinBtn.addEventListener('click', () => { promptData.pinned = !promptData.pinned; savePrompts().then(renderAllPrompts); });
            const favoriteBtn = document.createElement('button');
            favoriteBtn.title = "Favorite"; favoriteBtn.classList.add('favorite-btn');
            const isFavorited = settings.favorites.includes(promptData.id);
            favoriteBtn.appendChild((isFavorited ? icons.star : icons.starOutline).cloneNode(true));
            if(isFavorited) favoriteBtn.classList.add('favorited');
            favoriteBtn.addEventListener('click', () => {
                if (settings.favorites.includes(promptData.id)) {
                    settings.favorites = settings.favorites.filter(id => id !== promptData.id);
                } else {
                    settings.favorites.push(promptData.id);
                }
                saveSettings().then(renderAllPrompts);
            });
            const editBtn = document.createElement('button');
            editBtn.title = "Edit"; editBtn.appendChild(icons.edit.cloneNode(true));
            editBtn.addEventListener('click', () => {
                let originalCategory = findPromptCategory(promptData.id);
                showPromptForm(promptData, originalCategory);
            });
            const deleteBtn = document.createElement('button');
            deleteBtn.title = "Delete"; deleteBtn.appendChild(icons.trash.cloneNode(true));
            deleteBtn.addEventListener('click', () => {
                if (confirm(`Are you sure you want to delete the prompt "${promptData.name}"? This will also delete its version history.`)) {
                    Object.keys(currentPrompts).forEach(catName => {
                        currentPrompts[catName] = currentPrompts[catName].filter(p => p.id !== promptData.id);
                        if (currentPrompts[catName].length === 0 && catName !== "Favorites") {
                            delete currentPrompts[catName];
                        }
                    });
                    delete promptHistory[promptData.id];
                    settings.favorites = settings.favorites.filter(id => id !== promptData.id);
                    Promise.all([savePrompts(), saveSettings(), saveHistory()]).then(() => {
                        renderAllPrompts();
                        showToast('Prompt deleted.');
                    });
                }
            });
            controls.append(pinBtn, favoriteBtn, editBtn, deleteBtn);
            btn.appendChild(controls);
        }

        wrapper.appendChild(btn);

        if (!isMini && settings.showTags && promptData.tags) {
            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'prompt-tags-container';
            promptData.tags.split(',').forEach(tag => {
                if(tag.trim()){
                    const tagEl = document.createElement('span');
                    tagEl.className = 'prompt-tag';
                    tagEl.textContent = tag.trim();
                    tagsContainer.appendChild(tagEl);
                }
            });
            if(tagsContainer.hasChildNodes()) wrapper.appendChild(tagsContainer);
        }

        container.appendChild(wrapper);
    }

    function findPromptCategory(promptId) {
        for (const cat in currentPrompts) {
            if (currentPrompts[cat].some(p => p.id === promptId)) {
                return cat;
            }
        }
        return null;
    }

    // --- DRAG & DROP LOGIC ---
    let draggedItem = null;
    function handleDragStart(e) {
        draggedItem = this;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
        setTimeout(() => this.classList.add('dragging'), 0);
    }
    function handleDragOver(e) {
        e.preventDefault();
        if (this !== draggedItem && this.closest('.prompt-category-content')) {
            this.classList.add('drag-over');
        }
        return false;
    }
    function handleDragLeave(e) { this.classList.remove('drag-over'); }
    function handleDrop(e) {
        e.stopPropagation();
        if (draggedItem !== this) {
            const sourceCategoryName = findPromptCategory(draggedItem.dataset.promptId);
            const targetCategoryName = findPromptCategory(this.dataset.promptId);

            if (sourceCategoryName === targetCategoryName && sourceCategoryName !== null) {
                const categoryPrompts = currentPrompts[sourceCategoryName];
                const sourceIndex = categoryPrompts.findIndex(p => p.id === draggedItem.dataset.promptId);
                const targetIndex = categoryPrompts.findIndex(p => p.id === this.dataset.promptId);

                if (sourceIndex > -1 && targetIndex > -1) {
                    const [removed] = categoryPrompts.splice(sourceIndex, 1);
                    categoryPrompts.splice(targetIndex, 0, removed);
                    savePrompts().then(renderAllPrompts);
                }
            } else {
                showToast("Can only reorder prompts within the same category.", 2500);
            }
        }
        return false;
    }
    function handleDragEnd(e) {
        document.querySelectorAll('.prompt-button-wrapper').forEach(item => {
            item.classList.remove('dragging', 'drag-over');
        });
        draggedItem = null;
    }

    function handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase();
        const isMini = e.target.closest('#floating-mini-panel');
        const container = isMini ? floatingMiniPanel : panel;

        container.querySelectorAll('.prompt-button-wrapper').forEach(wrapper => {
            const promptId = wrapper.dataset.promptId;
            const promptCategory = findPromptCategory(promptId);
            if(!promptCategory) return;

            const promptData = currentPrompts[promptCategory].find(p => p.id === promptId);
            if(!promptData) return;

            const promptName = promptData.name.toLowerCase();
            const promptText = promptData.text.toLowerCase();
            const promptTags = promptData.tags.toLowerCase();

            const isVisible = promptName.includes(searchTerm) || promptText.includes(searchTerm) || promptTags.includes(searchTerm);
            wrapper.style.display = isVisible ? '' : 'none';
        });
    }

    // --- MODAL BUILDERS & POPULATORS ---
    function buildSettingsModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        const title = document.createElement('h2');
        title.className = 'modal-title';
        title.textContent = 'Settings';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close-btn';
        closeBtn.appendChild(icons.close.cloneNode(true));
        closeBtn.addEventListener('click', () => modal.style.display = 'none');
        modalHeader.append(title, closeBtn);

        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';

        const form = document.createElement('form');
        form.addEventListener('submit', e => e.preventDefault());
        modalBody.appendChild(form);

        modalContent.append(modalHeader, modalBody);
        modal.appendChild(modalContent);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
        return modal;
    }

    function populateSettingsModal(form) {
        const createSettingRow = (id, labelText, descriptionText, controlElement) => {
            const section = document.createElement('div');
            section.className = 'settings-section';
            const labelGroup = document.createElement('div');
            labelGroup.className = 'label-group';
            const label = document.createElement('label');
            label.textContent = labelText;
            label.htmlFor = id;
            if (descriptionText) {
                const description = document.createElement('span');
                description.className = 'description';
                description.textContent = descriptionText;
                labelGroup.append(label, description);
            } else {
                 labelGroup.append(label);
            }
            section.append(labelGroup, controlElement);
            return section;
        };

        const createToggle = (id, checked, onChange) => {
            const container = document.createElement('div');
            container.className = 'toggle-switch';
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.id = id;
            input.checked = checked;
            input.addEventListener('change', onChange);
            const label = document.createElement('label');
            label.htmlFor = id;
            container.append(input, label);
            return container;
        };

        const createColorPicker = (id, label, cssVar) => {
            const row = document.createElement('div');
            row.className = 'color-picker-row';
            const labelEl = document.createElement('label');
            labelEl.htmlFor = id;
            labelEl.textContent = label;
            const picker = document.createElement('input');
            picker.type = 'color';
            picker.id = id;
            picker.value = settings.colors[cssVar];
            picker.addEventListener('input', (e) => {
                settings.colors[cssVar] = e.target.value;
                document.documentElement.style.setProperty(cssVar, e.target.value);
            });
             picker.addEventListener('change', () => saveSettings());
            row.append(labelEl, picker);
            return row;
        };

        // UI Settings
        form.appendChild(createSettingRow('mini-mode-toggle', "Enable Floating Mini-Mode", "Show a quick-access icon in the chat input.",
            createToggle('mini-mode-toggle', settings.enableMiniMode, (e) => {
                settings.enableMiniMode = e.target.checked;
                saveSettings();
                miniPanelTrigger.style.display = settings.enableMiniMode ? 'flex' : 'none';
            })
        ));
        form.appendChild(createSettingRow('copy-buttons-swap-toggle', "Swap 'Copy' Button Order", "Reverse the order of 'Copy Response' and 'Copy Code' buttons.",
            createToggle('copy-buttons-swap-toggle', settings.copyButtonOrderSwapped, (e) => {
                settings.copyButtonOrderSwapped = e.target.checked;
                saveSettings();
                renderActionButtons();
            })
        ));
        form.appendChild(createSettingRow('show-tags-toggle', "Show Prompt Tags", "Display tags underneath each prompt.",
            createToggle('show-tags-toggle', settings.showTags, (e) => {
                settings.showTags = e.target.checked;
                saveSettings().then(renderAllPrompts);
            })
        ));

        // AI Settings
        form.appendChild(createSettingRow('ai-enhancer-toggle', "Enable AI Prompt Enhancer", "Show the AI enhancement button on prompts.",
            createToggle('ai-enhancer-toggle', settings.enableAIenhancer, (e) => {
                settings.enableAIenhancer = e.target.checked;
                saveSettings().then(renderAllPrompts);
            })
        ));
        const apiKeySection = document.createElement('div');
        apiKeySection.className = 'form-section';
        const apiKeyLabel = document.createElement('label');
        apiKeyLabel.textContent = 'Google AI API Key';
        apiKeyLabel.htmlFor = 'gemini-api-key-input';
        const apiKeyInput = document.createElement('input');
        apiKeyInput.type = 'password';
        apiKeyInput.id = 'gemini-api-key-input';
        apiKeyInput.placeholder = 'Enter your API key';
        apiKeyInput.value = settings.geminiAPIKey;
        apiKeyInput.addEventListener('change', (e) => {
            settings.geminiAPIKey = e.target.value;
            saveSettings();
        });
        apiKeySection.append(apiKeyLabel, apiKeyInput);
        form.appendChild(apiKeySection);

        // Theme Section
        const themeSection = document.createElement('div');
        themeSection.className = 'form-section';
        const themeTitle = document.createElement('h3');
        themeTitle.textContent = 'Theme';
        themeTitle.style.marginBottom = '10px';

        const presetSelector = document.createElement('select');
        presetSelector.style.marginBottom = '15px';
        const presets = { 'custom': 'Custom', 'dark': 'Dark (Default)', 'light': 'Light', 'glass': 'Glass', 'hacker': 'Hacker Green' };
        for (const [key, value] of Object.entries(presets)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = value;
            presetSelector.appendChild(option);
        }
        presetSelector.addEventListener('change', (e) => {
            const themeName = e.target.value;
            if (presetThemes[themeName]) {
                settings.colors = { ...presetThemes[themeName] };
                applyTheme();
                saveSettings();
                // Refresh the color pickers
                const parentForm = presetSelector.closest('form');
                while(parentForm.firstChild) parentForm.removeChild(parentForm.firstChild);
                populateSettingsModal(parentForm);
            }
        });

        const colorGrid = document.createElement('div');
        colorGrid.style.display = 'grid';
        colorGrid.style.gridTemplateColumns = '1fr 1fr';
        colorGrid.style.gap = '10px';
        colorGrid.appendChild(createColorPicker('panel-bg-picker', 'Panel BG', '--panel-bg'));
        colorGrid.appendChild(createColorPicker('header-bg-picker', 'Header BG', '--panel-header-bg'));
        colorGrid.appendChild(createColorPicker('handle-color-picker', 'Handle', '--handle-color'));
        colorGrid.appendChild(createColorPicker('favorite-color-picker', 'Favorite', '--favorite-color'));
        colorGrid.appendChild(createColorPicker('pin-color-picker', 'Pin', '--pin-color'));
        colorGrid.appendChild(createColorPicker('ai-color-picker', 'AI', '--ai-color'));
        themeSection.append(themeTitle, presetSelector, colorGrid);
        form.appendChild(themeSection);

        // Sync Settings
        const gistUrlSection = document.createElement('div');
        gistUrlSection.className = 'form-section';
        const gistUrlLabel = document.createElement('label');
        gistUrlLabel.textContent = 'GitHub Gist Sync URL';
        gistUrlLabel.htmlFor = 'gist-url-input';
        const gistUrlInput = document.createElement('input');
        gistUrlInput.type = 'url';
        gistUrlInput.id = 'gist-url-input';
        gistUrlInput.placeholder = 'https://gist.github.com/...';
        gistUrlInput.value = settings.gistURL;
        gistUrlInput.addEventListener('change', (e) => {
            settings.gistURL = e.target.value;
            saveSettings();
        });
        const syncBtn = createButtonWithIcon('Sync Now', icons.sync.cloneNode(true));
        syncBtn.addEventListener('click', () => syncFromGist(true));
        gistUrlSection.append(gistUrlLabel, gistUrlInput, syncBtn);
        form.appendChild(gistUrlSection);

        // Import/Export Button
        const importExportButton = createButtonWithIcon('Local Import / Export', icons.importExport.cloneNode(true));
        importExportButton.classList.add('copy-btn');
        importExportButton.style.width = '100%';
        importExportButton.style.marginTop = '20px';
        importExportButton.addEventListener('click', () => showImportExportModal());
        form.appendChild(importExportButton);
    }

    function buildAnalyticsModal() {
        const modal = document.createElement('div');
        modal.id = 'analytics-modal';
        modal.className = 'modal-overlay';
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        const title = document.createElement('h2');
        title.className = 'modal-title';
        title.textContent = 'Prompt Analytics';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close-btn';
        closeBtn.appendChild(icons.close.cloneNode(true));
        closeBtn.addEventListener('click', () => modal.style.display = 'none');
        modalHeader.append(title, closeBtn);

        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        modalBody.id = 'analytics-body';

        modalContent.append(modalHeader, modalBody);
        modal.appendChild(modalContent);
        modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
        return modal;
    }

    function populateAnalytics() {
        const body = analyticsModal.querySelector('#analytics-body');
        while (body.firstChild) body.removeChild(body.firstChild);

        const allPrompts = Object.values(currentPrompts).flat();

        const createCard = (title) => {
            const card = document.createElement('div');
            card.className = 'stat-card';
            const h3 = document.createElement('h3');
            h3.textContent = title;
            const ul = document.createElement('ul');
            card.append(h3, ul);
            return { card, ul };
        };

        const createListItem = (label, value) => {
            const li = document.createElement('li');
            const labelSpan = document.createElement('span');
            labelSpan.textContent = label;
            const valueSpan = document.createElement('span');
            valueSpan.className = 'stat-value';
            valueSpan.textContent = value;
            li.append(labelSpan, valueSpan);
            return li;
        };

        const grid = document.createElement('div');
        grid.className = 'stats-grid';

        const { card: generalCard, ul: generalList } = createCard('Overall Stats');
        generalList.appendChild(createListItem('Total Prompts', allPrompts.length));
        generalList.appendChild(createListItem('Total Categories', Object.keys(currentPrompts).length));
        const totalUsage = allPrompts.reduce((sum, p) => sum + p.usageCount, 0);
        generalList.appendChild(createListItem('Total Uses', totalUsage));
        grid.appendChild(generalCard);

        const { card: mostUsedCard, ul: mostUsedList } = createCard('Most Used Prompts');
        [...allPrompts]
            .filter(p => p.usageCount > 0)
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, 5)
            .forEach(p => mostUsedList.appendChild(createListItem(p.name, p.usageCount)));
        grid.appendChild(mostUsedCard);

        const { card: tagsCard, ul: tagsList } = createCard('Most Used Tags');
        const tagCounts = allPrompts.reduce((acc, p) => {
            p.tags.split(',').forEach(tag => {
                const t = tag.trim();
                if (t) acc[t] = (acc[t] || 0) + 1;
            });
            return acc;
        }, {});
        Object.entries(tagCounts)
            .sort(([,a],[,b]) => b-a)
            .slice(0, 5)
            .forEach(([tag, count]) => tagsList.appendChild(createListItem(tag, count)));
        grid.appendChild(tagsCard);

        const { card: categoryCard, ul: categoryList } = createCard('Category Distribution');
         Object.entries(currentPrompts)
            .forEach(([name, prompts]) => categoryList.appendChild(createListItem(name, prompts.length)));
        grid.appendChild(categoryCard);

        body.appendChild(grid);
    }

    function buildVersionHistoryModal() {
        const modal = document.createElement('div');
        modal.id = 'version-history-modal';
        modal.className = 'modal-overlay';
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        const title = document.createElement('h2');
        title.className = 'modal-title';
        title.id = 'history-modal-title';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close-btn';
        closeBtn.appendChild(icons.close.cloneNode(true));
        closeBtn.addEventListener('click', () => modal.style.display = 'none');
        modalHeader.append(title, closeBtn);

        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        const list = document.createElement('ul');
        list.id = 'history-list';
        modalBody.appendChild(list);

        modalContent.append(modalHeader, modalBody);
        modal.appendChild(modalContent);
        modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
        return modal;
    }

    function buildPromptFormModal() {
        const modal = document.createElement('div');
        modal.id = 'prompt-form-modal';
        modal.className = 'modal-overlay';
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        const title = document.createElement('h2');
        title.className = 'modal-title';
        title.id = 'prompt-form-title';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close-btn';
        closeBtn.title = 'Close';
        closeBtn.appendChild(icons.close.cloneNode(true));
        modalHeader.append(title, closeBtn);
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        const form = document.createElement('form');
        form.id = 'prompt-form';
        const idInput = document.createElement('input');
        idInput.type = 'hidden';
        idInput.id = 'prompt-id-input';
        form.appendChild(idInput);
        const nameSection = document.createElement('div');
        nameSection.className = 'form-section';
        const nameLabel = document.createElement('label');
        nameLabel.htmlFor = 'prompt-name-input';
        nameLabel.textContent = 'Prompt Name';
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'prompt-name-input';
        nameInput.required = true;
        nameSection.append(nameLabel, nameInput);
        form.appendChild(nameSection);
        const textSection = document.createElement('div');
        textSection.className = 'form-section';
        const textLabel = document.createElement('label');
        textLabel.htmlFor = 'prompt-text-input';
        textLabel.textContent = 'Prompt Text';
        const textInput = document.createElement('textarea');
        textInput.id = 'prompt-text-input';
        textInput.required = true;
        textSection.append(textLabel, textInput);
        form.appendChild(textSection);
        const tagsSection = document.createElement('div');
        tagsSection.className = 'form-section';
        const tagsLabel = document.createElement('label');
        tagsLabel.htmlFor = 'prompt-tags-input';
        tagsLabel.textContent = 'Tags (comma-separated)';
        const tagsInput = document.createElement('input');
        tagsInput.type = 'text';
        tagsInput.id = 'prompt-tags-input';
        tagsSection.append(tagsLabel, tagsInput);
        form.appendChild(tagsSection);
        const catSection = document.createElement('div');
        catSection.className = 'form-section';
        const catLabel = document.createElement('label');
        catLabel.htmlFor = 'prompt-category-select';
        catLabel.textContent = 'Prompt Group';
        const catSelect = document.createElement('select');
        catSelect.id = 'prompt-category-select';
        const newCatInput = document.createElement('input');
        newCatInput.type = 'text';
        newCatInput.id = 'prompt-new-category-input';
        newCatInput.placeholder = 'New group name...';
        newCatInput.style.display = 'none';
        newCatInput.style.marginTop = '8px';
        catSelect.addEventListener('change', () => {
            newCatInput.style.display = catSelect.value === '__createnew__' ? 'block' : 'none';
        });
        catSection.append(catLabel, catSelect, newCatInput);
        form.appendChild(catSection);
        const togglesRow = document.createElement('div');
        togglesRow.className = 'form-row';
        const autoSendSection = document.createElement('div');
        autoSendSection.className = 'form-checkbox';
        const autoSendCheck = document.createElement('input');
        autoSendCheck.type = 'checkbox';
        autoSendCheck.id = 'prompt-autosend-checkbox';
        const autoSendLabel = document.createElement('label');
        autoSendLabel.htmlFor = 'prompt-autosend-checkbox';
        autoSendLabel.textContent = 'Auto-Send';
        autoSendSection.append(autoSendCheck, autoSendLabel);
        const favoriteSection = document.createElement('div');
        favoriteSection.className = 'form-checkbox';
        const favoriteCheck = document.createElement('input');
        favoriteCheck.type = 'checkbox';
        favoriteCheck.id = 'prompt-favorite-checkbox';
        const favoriteLabel = document.createElement('label');
        favoriteLabel.htmlFor = 'prompt-favorite-checkbox';
        favoriteLabel.textContent = 'Favorite';
        favoriteSection.append(favoriteCheck, favoriteLabel);
        const pinSection = document.createElement('div');
        pinSection.className = 'form-checkbox';
        const pinCheck = document.createElement('input');
        pinCheck.type = 'checkbox';
        pinCheck.id = 'prompt-pin-checkbox';
        const pinLabel = document.createElement('label');
        pinLabel.htmlFor = 'prompt-pin-checkbox';
        pinLabel.textContent = 'Pin to Top';
        pinSection.append(pinCheck, pinLabel);
        togglesRow.append(autoSendSection, favoriteSection, pinSection);
        form.appendChild(togglesRow);
        const btnGroup = document.createElement('div');
        btnGroup.className = 'button-group';
        btnGroup.style.marginTop = '20px';
        const saveBtn = document.createElement('button');
        saveBtn.type = 'submit';
        saveBtn.className = 'gemini-prompt-panel-button copy-btn';
        saveBtn.id = 'save-prompt-btn';
        saveBtn.textContent = 'Save Prompt';
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'gemini-prompt-panel-button';
        cancelBtn.id = 'cancel-prompt-btn';
        cancelBtn.textContent = 'Cancel';
        btnGroup.append(saveBtn, cancelBtn);
        form.appendChild(btnGroup);
        modalBody.appendChild(form);
        modalContent.append(modalHeader, modalBody);
        modal.appendChild(modalContent);
        return modal;
    }

    function buildImportExportModal() {
        const modal = document.createElement('div');
        modal.id = 'import-export-modal';
        modal.className = 'modal-overlay';
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        const title = document.createElement('h2');
        title.className = 'modal-title';
        title.textContent = 'Import / Export Prompts';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close-btn';
        closeBtn.appendChild(icons.close.cloneNode(true));
        closeBtn.addEventListener('click', () => modal.style.display = 'none');
        modalHeader.append(title, closeBtn);
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        const exportSection = document.createElement('div');
        exportSection.className = 'form-section';
        const exportLabel = document.createElement('label');
        exportLabel.textContent = 'Export Prompts';
        const exportBtn = createButtonWithIcon('Export to JSON', null);
        exportBtn.classList.add('copy-btn');
        exportBtn.addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentPrompts, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "gemini_prompts_export.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            showToast('Exporting prompts...');
        });
        exportSection.append(exportLabel, exportBtn);
        const importSection = document.createElement('div');
        importSection.className = 'form-section';
        const importLabel = document.createElement('label');
        importLabel.htmlFor = 'import-textarea';
        importLabel.textContent = 'Import Prompts from JSON';
        const importTextarea = document.createElement('textarea');
        importTextarea.id = 'import-textarea';
        importTextarea.placeholder = 'Paste your exported JSON here...';
        importTextarea.style.minHeight = '150px';
        const importBtn = createButtonWithIcon('Import and Merge', null);
        importBtn.addEventListener('click', () => {
            try {
                const importedData = JSON.parse(importTextarea.value);
                if (typeof importedData !== 'object' || importedData === null) {
                    throw new Error('Invalid JSON format.');
                }
                for (const category in importedData) {
                    if (currentPrompts[category]) {
                        currentPrompts[category].push(...importedData[category]);
                    } else {
                        currentPrompts[category] = importedData[category];
                    }
                }
                savePrompts().then(() => {
                    renderAllPrompts();
                    showToast('Prompts imported successfully!');
                    modal.style.display = 'none';
                });
            } catch (error) {
                showToast('Error importing: ' + error.message, 3000);
            }
        });
        importSection.append(importLabel, importTextarea, importBtn);
        modalBody.append(exportSection, importSection);
        modalContent.append(modalHeader, modalBody);
        modal.appendChild(modalContent);
        modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
        return modal;
    }

    function buildAIEnhancerModal() {
        const modal = document.createElement('div');
        modal.id = 'ai-enhancer-modal';
        modal.className = 'modal-overlay';
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        const title = document.createElement('h2');
        title.className = 'modal-title';
        title.textContent = 'AI Prompt Enhancer';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close-btn';
        closeBtn.appendChild(icons.close.cloneNode(true));
        modalHeader.append(title, closeBtn);
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        const diffContainer = document.createElement('div');
        diffContainer.className = 'diff-container';
        diffContainer.textContent = 'Click "Enhance" to see the result...';
        const btnGroup = document.createElement('div');
        btnGroup.className = 'button-group';
        btnGroup.style.marginTop = '20px';
        const enhanceBtn = createButtonWithIcon('Enhance', icons.sparkle.cloneNode(true));
        const replaceBtn = createButtonWithIcon('Accept & Replace', null);
        replaceBtn.disabled = true;
        btnGroup.append(enhanceBtn, replaceBtn);
        modalBody.append(diffContainer, btnGroup);
        modalContent.append(modalHeader, modalBody);
        modal.appendChild(modalContent);
        closeBtn.addEventListener('click', () => modal.style.display = 'none');
        modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
        return modal;
    }

    function showPromptForm(promptToEdit = null, categoryName = '') {
        isFormActiveLock = true; updateLockIcon();
        const form = promptFormModal.querySelector('#prompt-form');
        form.reset();
        const title = promptFormModal.querySelector('#prompt-form-title');
        const idInput = promptFormModal.querySelector('#prompt-id-input');
        const nameInput = promptFormModal.querySelector('#prompt-name-input');
        const textInput = promptFormModal.querySelector('#prompt-text-input');
        const tagsInput = promptFormModal.querySelector('#prompt-tags-input');
        const categorySelect = promptFormModal.querySelector('#prompt-category-select');
        const newCategoryInput = promptFormModal.querySelector('#prompt-new-category-input');
        const autoSendInput = promptFormModal.querySelector('#prompt-autosend-checkbox');
        const favoriteInput = promptFormModal.querySelector('#prompt-favorite-checkbox');
        const pinInput = promptFormModal.querySelector('#prompt-pin-checkbox');
        while (categorySelect.firstChild) categorySelect.removeChild(categorySelect.firstChild);
        Object.keys(currentPrompts).filter(c => c !== "Favorites").forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categorySelect.appendChild(option);
        });
        const newOption = document.createElement('option');
        newOption.value = '__createnew__';
        newOption.textContent = '--- Create New Group ---';
        categorySelect.appendChild(newOption);
        newCategoryInput.style.display = 'none';
        if (promptToEdit) {
            title.textContent = 'Edit Prompt';
            idInput.value = promptToEdit.id;
            nameInput.value = promptToEdit.name;
            textInput.value = promptToEdit.text;
            tagsInput.value = promptToEdit.tags || '';
            categorySelect.value = categoryName;
            autoSendInput.checked = promptToEdit.autoSend;
            favoriteInput.checked = settings.favorites.includes(promptToEdit.id);
            pinInput.checked = promptToEdit.pinned;
        } else {
            title.textContent = 'Add New Prompt';
            idInput.value = '';
            categorySelect.value = categoryName || Object.keys(currentPrompts).filter(c => c !== "Favorites")[0] || '__createnew__';
            if (categorySelect.value === '__createnew__') newCategoryInput.style.display = 'block';
            favoriteInput.checked = false;
            pinInput.checked = false;
        }
        const closeForm = () => { promptFormModal.style.display = 'none'; isFormActiveLock = false; updateLockIcon(); };
        form.onsubmit = (e) => {
            e.preventDefault();
            const id = idInput.value || `prompt-${Date.now()}`;
            const newName = nameInput.value.trim();
            const newText = textInput.value.trim();

            if (promptToEdit && promptToEdit.text !== newText) {
                addHistoryEntry(id, promptToEdit.text);
            }

            const newPrompt = { id, name: newName, text: newText, tags: tagsInput.value.trim(), autoSend: autoSendInput.checked, pinned: pinInput.checked, usageCount: promptToEdit ? promptToEdit.usageCount : 0, lastUsed: promptToEdit ? promptToEdit.lastUsed : null };
            let targetCategory = (categorySelect.value === '__createnew__') ? newCategoryInput.value.trim() : categorySelect.value;
            if (!newPrompt.name || !newPrompt.text || !targetCategory) { showToast("Name, Text, and Group are required.", 2500); return; }
            if (targetCategory === "Favorites") { showToast("Cannot add prompts directly to Favorites.", 2500); return; }
            if (promptToEdit && categoryName && categoryName !== targetCategory) {
                currentPrompts[categoryName] = currentPrompts[categoryName].filter(p => p.id !== id);
                if (currentPrompts[categoryName].length === 0) delete currentPrompts[categoryName];
            }
            if (!currentPrompts[targetCategory]) currentPrompts[targetCategory] = [];
            const existingPromptIndex = currentPrompts[targetCategory].findIndex(p => p.id === id);
            if (existingPromptIndex > -1) {
                currentPrompts[targetCategory][existingPromptIndex] = newPrompt;
            } else {
                currentPrompts[targetCategory].push(newPrompt);
            }
            const isFavorited = favoriteInput.checked;
            const wasFavorited = settings.favorites.includes(id);
            if(isFavorited && !wasFavorited) settings.favorites.push(id);
            if(!isFavorited && wasFavorited) settings.favorites = settings.favorites.filter(favId => favId !== id);
            Promise.all([savePrompts(), saveSettings()]).then(() => {
                renderAllPrompts();
                showToast(promptToEdit ? 'Prompt updated!' : 'Prompt added!');
                closeForm();
            });
        };
        promptFormModal.querySelector('#cancel-prompt-btn').onclick = closeForm;
        promptFormModal.querySelector('.modal-close-btn').onclick = closeForm;
        promptFormModal.addEventListener('click', e => { if (e.target === promptFormModal) closeForm(); });
        promptFormModal.style.display = 'flex';
        nameInput.focus();
    }

    function showImportExportModal() { importExportModal.style.display = 'flex'; }

    // --- AI & SYNC FEATURES ---
    async function showAIEnhancer(promptData) {
        if (!settings.geminiAPIKey) {
            showToast("Please set your Gemini API key in Settings.", 3000);
            return;
        }
        aiEnhancerModal.style.display = 'flex';
        const diffContainer = aiEnhancerModal.querySelector('.diff-container');
        const enhanceBtn = aiEnhancerModal.querySelector('.gemini-prompt-panel-button:first-of-type');
        const replaceBtn = aiEnhancerModal.querySelector('.gemini-prompt-panel-button:last-of-type');

        diffContainer.textContent = 'Original:\n' + promptData.text;
        replaceBtn.disabled = true;
        let enhancedText = '';

        enhanceBtn.onclick = async () => {
            enhanceBtn.disabled = true;
            enhanceBtn.textContent = 'Enhancing...';
            try {
                const result = await callGeminiAPI(`Rewrite the following prompt to be clearer, more effective, and more detailed. Keep the core intent but improve the structure and wording. Do not add any explanatory text before or after the rewritten prompt itself.\n\nORIGINAL PROMPT:\n"""\n${promptData.text}\n"""\n\nREWRITTEN PROMPT:`);
                enhancedText = result;
                while (diffContainer.firstChild) diffContainer.removeChild(diffContainer.firstChild);
                const del = document.createElement('del');
                del.textContent = `--- Original\n${promptData.text}`;
                const ins = document.createElement('ins');
                ins.textContent = `+++ Enhanced\n${enhancedText}`;
                diffContainer.append(del, document.createElement('br'), ins);
                replaceBtn.disabled = false;
            } catch (error) {
                showToast('AI enhancement failed: ' + error.message, 3000);
                diffContainer.textContent = 'Error: ' + error.message;
            } finally {
                enhanceBtn.disabled = false;
                enhanceBtn.textContent = 'Re-Enhance';
            }
        };

        replaceBtn.onclick = () => {
            if (enhancedText) {
                addHistoryEntry(promptData.id, promptData.text);
                promptData.text = enhancedText;
                savePrompts().then(() => {
                    renderAllPrompts();
                    showToast('Prompt updated with AI enhancement!');
                    aiEnhancerModal.style.display = 'none';
                });
            }
        };
    }

    async function callGeminiAPI(prompt) {
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${settings.geminiAPIKey}`;
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error.message);
        }
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    async function syncFromGist(isManual = false) {
        if (!settings.gistURL) {
            if (isManual) showToast("Please provide a Gist URL in settings.", 2500);
            return;
        }
        const gistIdMatch = settings.gistURL.match(/gist\.github\.com\/[a-zA-Z0-9_-]+\/([a-f0-9]+)/);
        if (!gistIdMatch) {
            if (isManual) showToast("Invalid Gist URL format.", 2500);
            return;
        }
        const gistId = gistIdMatch[1];
        if (isManual) showToast("Syncing from Gist...", 2000);

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: `https://api.github.com/gists/${gistId}`,
                onload: function(response) {
                    try {
                        const gistData = JSON.parse(response.responseText);
                        const file = Object.values(gistData.files)[0];
                        if (file && file.content) {
                            const newPrompts = JSON.parse(file.content);
                            const doSync = isManual ? confirm("Gist data found. Replace all current prompts with the synced data? This cannot be undone.") : true;
                            if (doSync) {
                                currentPrompts = newPrompts;
                                savePrompts();
                                loadAndDisplayPrompts(true);
                                if (isManual) showToast("Sync successful!", 2000);
                                resolve();
                            } else {
                                reject(new Error("Sync cancelled by user."));
                            }
                        } else {
                            throw new Error("No content found in Gist file.");
                        }
                    } catch (e) {
                        if (isManual) showToast("Failed to parse Gist content: " + e.message, 3000);
                        reject(e);
                    }
                },
                onerror: function(response) {
                    if (isManual) showToast("Error fetching Gist: " + response.statusText, 3000);
                    reject(new Error(response.statusText));
                }
            });
        });
    }

    // --- VERSION HISTORY ---
    async function loadHistory() {
        promptHistory = await GM_getValue(GM_HISTORY_KEY, {});
    }
    async function saveHistory() {
        await GM_setValue(GM_HISTORY_KEY, promptHistory);
    }
    function addHistoryEntry(promptId, oldText) {
        if (!promptHistory[promptId]) {
            promptHistory[promptId] = [];
        }
        promptHistory[promptId].unshift({ timestamp: Date.now(), text: oldText });
        if (promptHistory[promptId].length > 10) {
            promptHistory[promptId].pop();
        }
        saveHistory();
    }
    function showVersionHistory(promptData) {
        versionHistoryModal.style.display = 'flex';
        const title = versionHistoryModal.querySelector('#history-modal-title');
        title.textContent = `History for "${promptData.name}"`;
        const list = versionHistoryModal.querySelector('#history-list');
        while (list.firstChild) list.removeChild(list.firstChild);

        const history = promptHistory[promptData.id] || [];
        if (history.length === 0) {
            const noHistory = document.createElement('li');
            noHistory.textContent = 'No previous versions found.';
            list.appendChild(noHistory);
            return;
        }

        history.forEach(entry => {
            const li = document.createElement('li');
            const dateSpan = document.createElement('span');
            dateSpan.textContent = new Date(entry.timestamp).toLocaleString();
            const textSpan = document.createElement('span');
            textSpan.className = 'history-text';
            textSpan.textContent = entry.text;
            const restoreBtn = createButtonWithIcon('Restore', null);
            restoreBtn.style.flexShrink = '0';
            restoreBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to restore this version? The current text will be added to history.')) {
                    addHistoryEntry(promptData.id, promptData.text);
                    promptData.text = entry.text;
                    savePrompts().then(() => {
                        renderAllPrompts();
                        versionHistoryModal.style.display = 'none';
                        showToast('Prompt restored!');
                    });
                }
            });
            li.append(dateSpan, textSpan, restoreBtn);
            list.appendChild(li);
        });
    }

    // --- MINI PANEL ---
    function renderMiniPanel() {
        if (!floatingMiniPanel) return;
        const container = floatingMiniPanel.querySelector('.prompt-group-container');
        while (container.firstChild) container.removeChild(container.firstChild);

        const searchInput = document.createElement('input');
        searchInput.type = 'search';
        searchInput.placeholder = 'Search prompts...';
        searchInput.id = 'mini-prompt-search-input';
        searchInput.addEventListener('input', handleSearch);
        container.appendChild(searchInput);

        const allPrompts = Object.values(currentPrompts).flat();
        const favoritePrompts = allPrompts.filter(p => settings.favorites.includes(p.id));

        if (favoritePrompts.length > 0) {
            container.appendChild(createCategory("Favorites", favoritePrompts, true, true));
        }
        Object.entries(currentPrompts).forEach(([categoryName, prompts]) => {
            if (categoryName === "Favorites") return;
            container.appendChild(createCategory(categoryName, prompts, true, true));
        });
    }

    // --- NAVIGATION ---
    function updateNavigator() {
        if (!navigator) return;
        const posts = Array.from(document.querySelectorAll('response-container, rich-content-renderer'));
        const scrollY = window.scrollY;
        const pageHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const canScrollUp = scrollY > 50;
        const canScrollDown = scrollY < pageHeight - viewportHeight - 50;
        navigator.querySelector('#nav-to-top').classList.toggle('visible', canScrollUp);
        navigator.querySelector('#nav-to-bottom').classList.toggle('visible', canScrollDown);
        const upPost = posts.slice().reverse().find(p => p.offsetTop < scrollY - 50);
        const downPost = posts.find(p => p.offsetTop > scrollY + viewportHeight / 2);
        navigator.querySelector('#nav-up').classList.toggle('visible', !!upPost);
        navigator.querySelector('#nav-down').classList.toggle('visible', !!downPost);
        const mainNavArrow = navigator.querySelector('.main-nav-arrow');
        const mainNavIcon = mainNavArrow.firstChild;
        while(mainNavIcon.firstChild) mainNavIcon.removeChild(mainNavIcon.firstChild);
        mainNavIcon.appendChild(settings.position === 'left' ? icons.navInwardRight.cloneNode(true) : icons.navInwardLeft.cloneNode(true));
        mainNavArrow.classList.toggle('visible', posts.length > 0);
    }
    function navigatePosts(direction) {
        const posts = Array.from(document.querySelectorAll('response-container, rich-content-renderer'));
        const scrollY = window.scrollY;
        let targetPost = null;
        if (direction === 'up') {
            targetPost = posts.slice().reverse().find(p => p.offsetTop < scrollY - 10);
        } else {
            targetPost = posts.find(p => p.offsetTop > scrollY + 10);
        }
        if (targetPost) targetPost.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // --- MAIN PANEL CREATION ---
    async function createAndAppendPanel() {
        if (document.getElementById('gemini-prompt-panel-main')) return;
        await loadSettings();
        await loadHistory();
        applyTheme();

        promptFormModal = buildPromptFormModal();
        settingsModal = buildSettingsModal();
        importExportModal = buildImportExportModal();
        aiEnhancerModal = buildAIEnhancerModal();
        analyticsModal = buildAnalyticsModal();
        versionHistoryModal = buildVersionHistoryModal();
        toast = document.createElement('div'); toast.className = 'toast-notification';
        handle = document.createElement('div'); handle.className = 'panel-handle';
        panel = document.createElement('div'); panel.id = 'gemini-prompt-panel-main';

        // FIX: Create and append resize handle during initial panel creation
        resizeHandle = document.createElement('div');
        panel.appendChild(resizeHandle);

        const hdr = document.createElement('div'); hdr.className = 'gemini-prompt-panel-header';
        leftHeaderControls = document.createElement('div'); leftHeaderControls.className = 'panel-header-controls';
        const titleSpan = document.createElement('span'); titleSpan.className = 'panel-title'; titleSpan.textContent = 'Prompt Panel';
        rightHeaderControls = document.createElement('div'); rightHeaderControls.className = 'panel-header-controls';
        settingsBtn = document.createElement('button'); settingsBtn.title = "Settings";
        analyticsBtn = document.createElement('button'); analyticsBtn.title = "Analytics";
        arrowLeftBtn = document.createElement('button'); arrowLeftBtn.title = "Move to Left";
        arrowRightBtn = document.createElement('button'); arrowRightBtn.title = "Move to Right";
        lockButton = document.createElement('button'); lockButton.title = "Lock Panel";
        const content = document.createElement('div'); content.className = 'gemini-prompt-panel-content';
        actionGroup = document.createElement('div'); actionGroup.className = 'button-group';
        copyResponseButton = createButtonWithIcon('Copy Response', null);
        copyCodeButton = createButtonWithIcon('Copy Code', null);
        const searchInput = document.createElement('input'); searchInput.type = 'search'; searchInput.id = 'prompt-search-input';
        const addBtn = createButtonWithIcon('Add New Prompt', icons.plus.cloneNode(true)); addBtn.id = 'add-prompt-btn';
        const searchAddContainer = document.createElement('div'); searchAddContainer.className = 'search-add-container';
        const promptGroup = document.createElement('div'); promptGroup.className = 'prompt-group-container';
        const cont = document.createElement('div'); cont.id = 'custom-prompts-container';
        navigator = document.createElement('div'); navigator.className = 'post-navigator';
        const navToTop = document.createElement('button'); navToTop.id = 'nav-to-top'; navToTop.title = 'Scroll to Top';
        const navUp = document.createElement('button'); navUp.id = 'nav-up'; navUp.title = 'Previous Post';
        const navDown = document.createElement('button'); navDown.id = 'nav-down'; navDown.title = 'Next Post';
        const navToBottom = document.createElement('button'); navToBottom.id = 'nav-to-bottom'; navToBottom.title = 'Scroll to Bottom';
        const mainNavArrow = document.createElement('button'); mainNavArrow.className = 'main-nav-arrow'; mainNavArrow.title = 'Toggle Panel';
        const mainNavIconContainer = document.createElement('div');

        settingsBtn.appendChild(icons.settings.cloneNode(true));
        analyticsBtn.appendChild(icons.chart.cloneNode(true));
        arrowLeftBtn.appendChild(icons.arrowLeft.cloneNode(true));
        arrowRightBtn.appendChild(icons.arrowRight.cloneNode(true));
        updateLockIcon();
        hdr.append(leftHeaderControls, titleSpan, rightHeaderControls);
        panel.appendChild(hdr);
        copyResponseButton.classList.add('copy-btn');
        copyCodeButton.classList.add('copy-btn');
        searchInput.placeholder = 'Search prompts...';
        searchAddContainer.append(searchInput, addBtn);
        promptGroup.appendChild(cont);
        content.append(actionGroup, searchAddContainer, promptGroup);
        panel.appendChild(content);
        navToTop.appendChild(icons.navToTop.cloneNode(true));
        navUp.appendChild(icons.navUp.cloneNode(true));
        navDown.appendChild(icons.navDown.cloneNode(true));
        navToBottom.appendChild(icons.navToBottom.cloneNode(true));
        mainNavArrow.appendChild(mainNavIconContainer);
        navigator.append(navToTop, navUp, navDown, navToBottom, mainNavArrow);
        document.body.append(panel, handle, toast, promptFormModal, settingsModal, importExportModal, aiEnhancerModal, analyticsModal, versionHistoryModal, navigator);

        handle.addEventListener('mouseenter', () => { panel.classList.add('visible'); updateHandleHeight(); });
        handle.addEventListener('mouseleave', hidePanel);
        panel.addEventListener('mouseenter', () => panel.classList.add('visible'));
        panel.addEventListener('mouseleave', hidePanel);

        settingsBtn.addEventListener('click', () => {
             const settingsForm = settingsModal.querySelector('.modal-body > form');
             while(settingsForm.firstChild) settingsForm.removeChild(settingsForm.firstChild);
             populateSettingsModal(settingsForm);
             settingsModal.style.display = 'flex';
        });

        analyticsBtn.addEventListener('click', () => {
            populateAnalytics();
            analyticsModal.style.display = 'flex';
        });
        arrowLeftBtn.addEventListener('click', () => { settings.position = 'left'; saveSettings(); applySettingsAndTheme(); });
        arrowRightBtn.addEventListener('click', () => { settings.position = 'right'; saveSettings(); applySettingsAndTheme(); });
        lockButton.addEventListener('click', () => { isManuallyLocked = !isManuallyLocked; updateLockIcon(); if (isManuallyLocked) panel.classList.add('visible'); });
        copyResponseButton.addEventListener('click', () => copyLastResponse(false));
        copyCodeButton.addEventListener('click', () => copyLastResponse(true));
        searchInput.addEventListener('input', handleSearch);
        addBtn.addEventListener('click', () => showPromptForm(null, ''));
        navToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        navToBottom.addEventListener('click', () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
        navUp.addEventListener('click', () => navigatePosts('up'));
        navDown.addEventListener('click', () => navigatePosts('down'));
        mainNavArrow.addEventListener('click', () => panel.classList.toggle('visible'));
        window.addEventListener('scroll', updateNavigator, { passive: true });
        window.addEventListener('resize', updateNavigator);
        hdr.addEventListener('mousedown', e => {
            if (e.target.closest('.panel-header-controls')) return;
            const startY = e.clientY; const startTop = panel.offsetTop;
            document.body.style.userSelect = 'none';
            function onMove(ev) {
                let newTop = startTop + (ev.clientY - startY);
                newTop = Math.max(0, Math.min(newTop, window.innerHeight - panel.offsetHeight));
                settings.topOffset = newTop + 'px';
                panel.style.top = settings.topOffset; handle.style.top = settings.topOffset; navigator.style.top = settings.topOffset;
            }
            function onUp() {
                document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
                document.body.style.userSelect = ''; saveSettings();
            }
            document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
        });

        initResizeFunctionality();
        if (settings.gistURL) {
            await syncFromGist().catch(() => loadAndDisplayPrompts());
        } else {
            await loadAndDisplayPrompts();
        }
        applySettingsAndTheme();
        updateNavigator();
    }

    // --- ACTIONS & CLIPBOARD ---
    function copyLastResponse(codeOnly = false) {
        const lastResponse = Array.from(document.querySelectorAll('response-container')).pop();
        if (!lastResponse) { showToast('No response found to copy.'); return; }
        let textToCopy = '';
        if(codeOnly) {
            const codeBlocks = Array.from(lastResponse.querySelectorAll('code-block .code-container'));
            if(codeBlocks.length === 0) { showToast('No code blocks found.'); return; }
            textToCopy = codeBlocks.map(block => Array.from(block.querySelectorAll('.line-content')).map(line => line.textContent).join('\n')).join('\n\n---\n\n');
        } else {
            const renderer = lastResponse.querySelector('rich-content-renderer');
            if(renderer) textToCopy = renderer.innerText;
        }
        if(!textToCopy) { showToast('Nothing to copy.'); return; }
        navigator.clipboard.writeText(textToCopy).then(() => {
            showToast(codeOnly ? 'Code copied!' : 'Response copied!');
        }).catch(err => { console.error('Copy failed:', err); showToast('Failed to copy.'); });
    }
    function sendPromptToGemini(promptData, autoSend = false) {
        const editor = document.querySelector('div.ql-editor');
        if (editor) {
            promptData.usageCount = (promptData.usageCount || 0) + 1;
            promptData.lastUsed = Date.now();
            savePrompts();

            editor.focus();
            document.execCommand('selectAll', false, null);
            document.execCommand('insertText', false, promptData.text);
            if (autoSend) {
                setTimeout(() => {
                    const sendButton = document.querySelector('button[data-testid="send-button"]');
                    if (sendButton && !sendButton.disabled) sendButton.click();
                }, 150);
            }
        } else { showToast('Error: Prompt input not found.'); }
    }

    function initResizeFunctionality() {
        let startX, startWidth;
        const onMouseMove = (e) => {
            const newWidth = startWidth + (settings.position === 'left' ? e.clientX - startX : startX - e.clientX);
            if (newWidth > 240 && newWidth < 800) {
                settings.panelWidth = newWidth;
                panel.style.setProperty('--panel-width', `${newWidth}px`);
            }
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            panel.classList.remove('is-resizing'); document.body.style.cursor = 'default';
            saveSettings();
            applySettingsAndTheme();
        };
        resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault(); startX = e.clientX; startWidth = panel.offsetWidth;
            panel.classList.add('is-resizing'); document.body.style.cursor = 'ew-resize';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    // --- BOOTSTRAP ---
    function init() {
        const checkInterval = setInterval(() => {
            const chatInterface = document.querySelector('main .chat-history');
            const promptInputArea = document.querySelector('main rich-textarea');
            if (chatInterface && promptInputArea) {
                clearInterval(checkInterval);
                createAndAppendPanel();

                floatingMiniPanel = document.createElement('div');
                floatingMiniPanel.id = 'floating-mini-panel';
                const miniPanelContent = document.createElement('div');
                miniPanelContent.className = 'prompt-group-container';
                floatingMiniPanel.appendChild(miniPanelContent);

                miniPanelTrigger = document.createElement('button');
                miniPanelTrigger.id = 'mini-panel-trigger';
                miniPanelTrigger.title = 'Open Quick Prompts';
                miniPanelTrigger.appendChild(icons.panelIcon.cloneNode(true));
                miniPanelTrigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    floatingMiniPanel.classList.toggle('visible');
                });

                promptInputArea.style.position = 'relative';
                promptInputArea.append(miniPanelTrigger, floatingMiniPanel);
                miniPanelTrigger.style.display = settings.enableMiniMode ? 'flex' : 'none';
                renderMiniPanel();

                document.addEventListener('click', (e) => {
                    if (!floatingMiniPanel.contains(e.target) && !miniPanelTrigger.contains(e.target)) {
                        floatingMiniPanel.classList.remove('visible');
                    }
                });

                const chatObserver = new MutationObserver(() => updateNavigator());
                chatObserver.observe(chatInterface, { childList: true, subtree: true });
            }
        }, 500);
    }
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})();
