// Gemini Prompt Panel - UI Module (ui.js)
// Responsibilities: DOM creation, styling, and UI component rendering.

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
    // --- START: VEO MODULE ADDITION (New Icon) ---
    video: makeIcon('M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z', 18),
    // --- END: VEO MODULE ADDITION ---
    plus: makeIcon('M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z', 18),
    unlocked: makeIcon('M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z', 18),
    locked: makeIcon('M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h2V6c0-1.65 1.35-3 3-3s3 1.35 3 3v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z', 18),
    settings: makeIcon('M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84 c-0.24,0-0.44,0.17-0.48,0.41L9.22,5.25C8.63,5.5,8.1,5.82,7.6,6.2L5.21,5.24C4.99,5.16,4.74,5.23,4.62,5.45L2.7,8.77 c-0.11,0.2-0.06,0.47,0.12,0.61l2.03,1.58C4.82,11.36,4.8,11.68,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.38,2.44 c0.04,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.48,0.41l0.38-2.44c0.59-0.24,1.12-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0.01,0.59-0.22l1.92-3.32c0.11-0.2,0.06-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z', 18),
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
    arrowUp: makeIcon('M7 14l5-5 5 5z'),
    arrowDown: makeIcon('M7 10l5 5 5-5z'),
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
    panelIcon: makeIcon('M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 16H3V5h9v14zm2 0h7V5h-7v14z', 22),
    uploadFile: makeIcon('M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z'),
    webLink: makeIcon('M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z'),
    dragHandle: makeIcon('M20 9H4v2h16V9zM4 15h16v-2H4v2z')
};

// --- CSS ---
const FULL_WIDTH_CSS = `
    html, html > user-query { max-width: none !important; }
    div.conversation-container { max-width: none !important; }
    div.input-area-container ~ hallucination-disclaimer { display: none !important; }
    div.input-area-container { padding-bottom: 0.5rem !important; }
    div.avatar-gutter { display: none !important; }
`;
function applyStyles() {
    GM_addStyle(`
        :root {
            --panel-font: Verdana, sans-serif;
            --base-font-size: 14px;
            --panel-padding: 12px;
            --panel-gap: 10px;
            --btn-padding: 8px 12px;
            --panel-bg: #2a2a2e; --panel-text: #e0e0e0; --panel-header-bg: #3a3a3e; --panel-border: #4a4a4e;
            --input-bg: #3c3c41; --input-text: #f0f0f0; --input-border: #5a5a5e;
            --btn-green-grad-start: #28a745; --btn-green-grad-end: #218838; --btn-green-border: #1e7e34;
            --handle-color: #28a745; --handle-hover-color: #34c759; --favorite-color: #FFD700; --pin-color: #34c759; --ai-color: #8A2BE2;
            --modal-bg: rgba(0, 0, 0, 0.7); --modal-content-bg: #2c2c30;
            --nav-btn-size: 36px; --tag-bg: #555; --tag-text: #ddd;
        }
        /* Panel & Handle */
        .gemini-prompt-panel { font-size: var(--base-font-size); position: fixed; top: var(--panel-top, 90px); z-index: 9999; background: var(--panel-bg); color: var(--panel-text); border: 1px solid var(--panel-border); border-radius: 10px; box-shadow: 0 8px 25px rgba(0,0,0,0.4); display: flex; flex-direction: column; font-family: var(--panel-font); transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1); user-select: none; width: var(--panel-width, 320px); box-sizing: border-box; max-height: 85vh; }
        .gemini-prompt-panel.glass-theme { backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
        .gemini-prompt-panel.left-side { left: 0; transform: translateX(-100%); }
        .gemini-prompt-panel.right-side{ right:0; transform: translateX(100%); }
        .gemini-prompt-panel.visible { transform: translateX(0); }
        .panel-handle { position: fixed; top: var(--panel-top, 90px); width: 8px; height: 100px; background: linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.15)); cursor: pointer; z-index: 9998; transition: all 0.2s; border-radius: 0 5px 5px 0; box-shadow: inset -1px 0 0 rgba(255,255,255,0.1); }
        .panel-handle::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--handle-color); border-radius: 0 2px 2px 0; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .panel-handle:hover::before { background: var(--handle-hover-color); width: 100%; }
        .panel-handle.right-side-handle { right: 0; left: auto; transform: scaleX(-1); }
        .panel-handle.edge { top: 0 !important; height: 100vh; background: var(--handle-color); opacity: 0.5; transition: opacity 0.2s ease-in-out, background-color 0.2s ease-in-out; border-radius: 0; box-shadow: none; }
        .panel-handle.edge:hover { opacity: 1; background-color: var(--handle-hover-color); }
        .panel-handle.edge::before { display: none; }
        .gemini-resize-handle { position: absolute; top: 0; bottom: 0; width: 6px; cursor: ew-resize; z-index: 10; }
        .gemini-resize-handle.left-handle { left: -3px; }
        .gemini-resize-handle.right-handle { right: -3px; }
        .gemini-prompt-panel-header { display: flex; justify-content: space-between; align-items: center; padding: 8px var(--panel-padding); background: var(--panel-header-bg); cursor: grab; font-size: calc(var(--base-font-size) + 1px); font-weight: bold; position: relative; border-bottom: 1px solid var(--panel-border); }
        .panel-title { position: absolute; left: 50%; transform: translateX(-50%); pointer-events: none; }
        .panel-header-controls { display:flex; gap:2px; align-items: center; }
        .panel-header-controls button { background: transparent; border: none; color: var(--panel-text); cursor: pointer; padding: 4px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s; }
        .panel-header-controls button:hover { background-color: rgba(255,255,255,0.1); }
        .gemini-prompt-panel-content { padding:var(--panel-padding); display:flex; flex-direction:column; gap:var(--panel-gap); flex-grow: 1; overflow: hidden; }
        .button-group { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        #panel-action-buttons { margin-top: 8px; }
        .gemini-prompt-panel-button { border: 1px solid; color: white; padding: var(--btn-padding); border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: calc(var(--base-font-size) - 1px); font-weight: 500; cursor: pointer; transition: all .2s; box-shadow: 0 2px 5px rgba(0,0,0,0.2); text-shadow: 1px 1px 1px rgba(0,0,0,0.2); }
        .gemini-prompt-panel-button:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .gemini-prompt-panel-button:disabled { cursor: not-allowed; filter: brightness(0.6); }
        .copy-btn { background: linear-gradient(to bottom, var(--btn-green-grad-start), var(--btn-green-grad-end)); border-color: var(--btn-green-border); }
        .prompt-group-container { display: flex; flex-direction: column; overflow-y: auto; padding-right: 5px; margin-right: -5px; flex-grow: 1; min-height: 0; }
        /* Condensed Mode */
        .gemini-prompt-panel.condensed { --panel-padding: 6px; --panel-gap: 6px; --btn-padding: 4px 8px; }
        .gemini-prompt-panel.condensed .gemini-prompt-panel-header { padding: 4px var(--panel-padding); font-size: var(--base-font-size); }
        .gemini-prompt-panel.condensed .prompt-button { padding: 6px; }
        .gemini-prompt-panel.condensed .prompt-category-header { padding: 6px 8px; font-size: calc(var(--base-font-size) - 1px); }
        .gemini-prompt-panel.condensed .prompt-category-content { gap: 5px; padding: 8px; }
        /* Prompt Buttons & Categories */
        .prompt-button-wrapper { display: flex; flex-direction: column; background: #3a3a3e; border: 1px solid var(--panel-border); border-radius: 6px; cursor: grab; transition: box-shadow .2s, transform .2s; }
        .prompt-button-wrapper.dragging { opacity: 0.5; background: #4a4a4e; }
        .prompt-button-wrapper.drag-over { border-bottom: 2px solid var(--pin-color); }
        .prompt-button { position:relative; display: flex; align-items: center; padding: 8px; gap: 8px; }
        .prompt-button .prompt-button-name { flex-grow: 1; text-align: left; font-weight: 500; font-size: var(--base-font-size); }
        .prompt-button-controls { display: none; position: absolute; right: 4px; top: 50%; transform: translateY(-50%); gap: 2px; background: rgba(0,0,0,0.2); border-radius: 12px; padding: 2px; align-items: center; }
        .prompt-button-wrapper:hover .prompt-button-controls { display: flex; }
        .prompt-button-controls button { background: transparent; border: none; cursor: pointer; padding: 3px; border-radius: 50%; display:flex; align-items:center; color: var(--panel-text); }
        .prompt-button-controls button:hover { background-color: rgba(255,255,255,0.15); }
        /* --- START: VEO MODULE ADDITION (New CSS) --- */
        .prompt-button-controls .prompt-control-link {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: none;
            border: none;
            padding: 3px;
            margin: 0;
            cursor: pointer;
            opacity: 0.7;
            transition: opacity 0.2s;
            border-radius: 50%;
            color: var(--panel-text);
        }
        .prompt-button-controls .prompt-control-link:hover {
            opacity: 1;
            background-color: rgba(255,255,255,0.15);
        }
        /* --- END: VEO MODULE ADDITION --- */
        .favorite-btn.favorited, .pin-btn.pinned { color: var(--favorite-color); }
        .pin-btn.pinned { color: var(--pin-color); }
        .ai-btn { color: var(--ai-color); }
        .prompt-tags-container { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 8px 8px; }
        .prompt-tag { background: var(--tag-bg); color: var(--tag-text); padding: 2px 6px; border-radius: 4px; font-size: calc(var(--base-font-size) - 3px); }
        #custom-prompts-container { display:flex; flex-direction:column; max-height: none; }
        .search-add-container { padding: 0 0 10px; display: flex; flex-direction: column; gap: 8px; }
        #prompt-search-input { width: 100%; background: var(--input-bg); color: var(--input-text); border-radius: 4px; padding: 6px 8px; font-size: calc(var(--base-font-size) - 1px); box-sizing: border-box; font-family: var(--panel-font); border: 2px solid transparent; transition: border-color 0.3s ease, box-shadow 0.3s ease; }
        #prompt-search-input:focus { outline: none; border-color: var(--handle-color); box-shadow: 0 0 8px var(--handle-color); }
        #add-prompt-btn { border: none; color: white; position: relative; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08); background: linear-gradient(90deg, #4285F4, #DB4437, #F4B400, #0F9D58, #4285F4); background-size: 200% 100%; animation: google-gradient-animation 4s linear infinite; transition: transform 0.15s ease, box-shadow 0.15s ease; }
        @keyframes google-gradient-animation { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        #add-prompt-btn::after { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: linear-gradient(to right, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.35) 50%, rgba(255, 255, 255, 0) 100%); transform: translateX(-150%); transition: transform 0.6s ease; pointer-events: none; }
        #add-prompt-btn:hover::after { transform: translateX(150%); }
        #add-prompt-btn:active { transform: translateY(1px); box-shadow: 0 2px 4px rgba(0,0,0,0.1), 0 1px 1px rgba(0,0,0,0.08); }
        #favorites-category .prompt-category-header { background: linear-gradient(to right, #e8b31a, #d4a017); color: #1a1a1a; font-weight: bold; }
        .prompt-category { border: 1px solid var(--panel-border); border-radius: 6px; margin-bottom: 10px; overflow: hidden; transition: all 0.2s; }
        .prompt-category.dragging { opacity: 0.5; border-style: dashed; }
        .prompt-category.drag-over { border-bottom: 3px solid var(--pin-color); }
        .prompt-category-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: var(--panel-header-bg); cursor: pointer; font-weight: bold; font-size: calc(var(--base-font-size) - 1px); }
        .prompt-category-header.draggable-header { cursor: grab; }
        .category-header-title { flex-grow: 1; }
        .category-header-controls { display: flex; align-items: center; gap: 4px; }
        .category-header-controls button { padding: 2px; }
        .category-header-controls button:disabled { opacity: 0.3; cursor: not-allowed; }
        .category-toggle-icon { transition: transform 0.2s; }
        .prompt-category.collapsed .category-toggle-icon { transform: rotate(-90deg); }
        .prompt-category-content { display: flex; flex-direction: column; gap: 8px; padding: 10px; max-height: 300px; overflow-y: auto; transition: max-height 0.3s ease-out, padding 0.3s ease-out, opacity 0.3s ease-out; }
        .prompt-category.collapsed .prompt-category-content { max-height: 0; padding-top: 0; padding-bottom: 0; opacity: 0; overflow: hidden; }
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
        .modal-content { font-family: var(--panel-font); background: var(--modal-content-bg); color: var(--panel-text); padding: 20px; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); width: 90%; max-width: 600px; position: relative; display: flex; flex-direction: column; max-height: 90vh; font-size: var(--base-font-size); }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid var(--panel-border); padding-bottom: 10px; flex-shrink: 0; }
        .modal-title { font-size: calc(var(--base-font-size) + 4px); font-weight: bold; }
        .modal-close-btn { background: none; border: none; color: var(--panel-text); cursor: pointer; padding: 5px; border-radius: 50%; display:flex; }
        .modal-close-btn:hover { background-color: rgba(255,255,255,0.1); }
        .modal-body { overflow-y: auto; padding-right: 10px; }
        .modal-body > form > .form-section { margin-bottom: 20px; }
        .form-section, .settings-section { display: flex; flex-direction: column; gap: 8px; }
        .form-row { display: flex; gap: 20px; align-items: center; margin-bottom: 15px; }
        /* Settings Accordion */
        .accordion-section { margin-bottom: 5px; border: 1px solid var(--panel-border); border-radius: 6px; overflow: hidden; }
        .accordion-header { background: var(--panel-header-bg); padding: 10px 15px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: bold; }
        .accordion-header:after { content: '▼'; transition: transform 0.2s; }
        .accordion-header.active:after { transform: rotate(180deg); }
        .accordion-content { padding: 15px; display: none; flex-direction: column; gap: 15px; background: var(--panel-bg); }
        .accordion-header.active + .accordion-content { display: flex; }
        .settings-section-grid { display: grid; grid-template-columns: 1fr auto; gap: 10px 20px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--panel-border); }
        .settings-section-grid:last-of-type { border-bottom: none; }
        .settings-section-grid .label-group { display: flex; flex-direction: column; gap: 2px; }
        .settings-section-grid .label-group label { font-size: var(--base-font-size); font-weight: 500; }
        .settings-section-grid .label-group .description { font-size: calc(var(--base-font-size) - 2px); color: #aaa; }
        .form-section label, .settings-section label, .form-row label { font-size: var(--base-font-size); font-weight: 500; }
        .form-section input, .form-section textarea, .form-section select { width: 100%; background: var(--input-bg); color: var(--input-text); border: 1px solid var(--input-border); border-radius: 4px; padding: 8px; font-size: var(--base-font-size); box-sizing: border-box; font-family: var(--panel-font); }
        .form-section textarea { min-height: 120px; resize: vertical; }
        .form-checkbox { display: flex; align-items: center; gap: 10px; font-size: var(--base-font-size); }
        .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-switch label { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #555; transition: .4s; border-radius: 24px; }
        .toggle-switch label:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        .toggle-switch input:checked + label { background-color: var(--handle-color); }
        .toggle-switch input:checked + label:before { transform: translateX(20px); }
        /* Group Order D&D List */
        #group-order-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 5px; }
        #group-order-list li { background: var(--input-bg); padding: 8px 12px; border-radius: 4px; display: flex; align-items: center; gap: 10px; cursor: grab; border: 1px solid var(--input-border); }
        #group-order-list li.dragging { opacity: 0.5; }
        #group-order-list li.drag-over { border-top: 2px solid var(--handle-color); }
        .toast-notification { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); color: white; padding: 12px 24px; border-radius: 8px; z-index: 10001; opacity: 0; transition: opacity 0.3s, bottom 0.3s; pointer-events: none; font-family: var(--panel-font); font-size: calc(var(--base-font-size) + 2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .toast-notification.show { opacity: 1; bottom: 40px; }
        .toast-notification.success { background: linear-gradient(to right, #28a745, #218838); }
        .toast-notification.error { background: linear-gradient(to right, #dc3545, #c82333); }
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
        /* Input Enhancements */
        .input-with-button { display: flex; gap: 8px; }
        .input-with-button input { flex-grow: 1; }
        .file-import-button { cursor: pointer; }
        #import-file-input { display: none; }
    `);
}

// --- MODAL BUILDERS ---
// ... (The rest of the ui.js file is unchanged)
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
    modalHeader.append(title, closeBtn);
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    const form = document.createElement('form');
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
    modalHeader.append(title, closeBtn);
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    // The main script will populate the body with buttons
    modalContent.append(modalHeader, modalBody);
    modal.appendChild(modalContent);
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
    // Buttons will be added by the main script
    modalBody.append(diffContainer, btnGroup);
    modalContent.append(modalHeader, modalBody);
    modal.appendChild(modalContent);
    return modal;
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
    modalHeader.append(title, closeBtn);
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    modalBody.id = 'analytics-body';
    modalContent.append(modalHeader, modalBody);
    modal.appendChild(modalContent);
    return modal;
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
    modalHeader.append(title, closeBtn);
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    const list = document.createElement('ul');
    list.id = 'history-list';
    modalBody.appendChild(list);
    modalContent.append(modalHeader, modalBody);
    modal.appendChild(modalContent);
    return modal;
}