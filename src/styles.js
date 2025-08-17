// /src/styles.js

export const cssStyles = `
    :root {
        --panel-font: 'Inter', Verdana, sans-serif;
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

        /* New Settings Panel Vars */
        --settings-bg-primary: #1e1e24;
        --settings-bg-secondary: #2a2a32;
        --settings-border-color: #3a3a44;
        --settings-text-primary: #f0f0f5;
        --settings-text-secondary: #a0a0b0;
        --settings-accent-primary: #007aff;
        --settings-accent-secondary: #34c759;
        --settings-font: 'Inter', sans-serif;
    }

    /* Light Theme for Settings Panel */
    html.settings-light-theme {
        --settings-bg-primary: #ffffff;
        --settings-bg-secondary: #f4f4f5;
        --settings-border-color: #d4d4d8;
        --settings-text-primary: #1f2937;
        --settings-text-secondary: #6b7280;
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
    /* Modals, Toast */
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--modal-bg); z-index: 10000; display: none; align-items: center; justify-content: center; backdrop-filter: blur(2px); }
    .modal-content { font-family: var(--panel-font); background: var(--modal-content-bg); color: var(--panel-text); padding: 20px; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); width: 90%; max-width: 600px; position: relative; display: flex; flex-direction: column; max-height: 90vh; font-size: var(--base-font-size); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid var(--panel-border); padding-bottom: 10px; flex-shrink: 0; }
    .modal-title { font-size: calc(var(--base-font-size) + 4px); font-weight: bold; }
    .modal-close-btn { background: none; border: none; color: var(--panel-text); cursor: pointer; padding: 5px; border-radius: 50%; display:flex; }
    .modal-close-btn:hover { background-color: rgba(255,255,255,0.1); }
    .modal-body { overflow-y: auto; padding-right: 10px; }
    .modal-body > form > .form-section { margin-bottom: 20px; }
    .form-section { display: flex; flex-direction: column; gap: 8px; }
    .form-row { display: flex; gap: 20px; align-items: center; margin-bottom: 15px; }
    .form-section label { font-size: var(--base-font-size); font-weight: 500; }
    .form-section input, .form-section textarea, .form-section select { width: 100%; background: var(--input-bg); color: var(--input-text); border: 1px solid var(--input-border); border-radius: 4px; padding: 8px; font-size: var(--base-font-size); box-sizing: border-box; font-family: var(--panel-font); }
    .form-section textarea { min-height: 120px; resize: vertical; }
    .form-checkbox { display: flex; align-items: center; gap: 10px; font-size: var(--base-font-size); }
    .toast-notification { position: fixed; bottom: -100px; left: 50%; transform: translateX(-50%); color: white; padding: 12px 24px; border-radius: 8px; z-index: 10001; opacity: 0; transition: opacity 0.3s, bottom 0.3s; pointer-events: none; font-family: var(--panel-font); font-size: calc(var(--base-font-size) + 1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .toast-notification.show { opacity: 1; bottom: 40px; }
    .toast-notification.success { background: linear-gradient(to right, #28a745, #218838); }
    .toast-notification.error { background: linear-gradient(to right, #dc3545, #c82333); }
    /* AI Enhancer Modal */
    #ai-enhancer-modal .diff-container { border: 1px solid var(--panel-border); border-radius: 6px; padding: 10px; min-height: 150px; background: var(--input-bg); font-family: monospace; white-space: pre-wrap; }
    #ai-enhancer-modal .diff-container ins { background-color: #28a7454D; text-decoration: none; }
    #ai-enhancer-modal .diff-container del { background-color: #dc35454D; text-decoration: none; }
    /* Analytics Modal */
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

    /* --- NEW SETTINGS UI STYLES --- */
    #settings-handle {
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10001;
        background: var(--settings-bg-secondary);
        color: var(--settings-text-primary);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        padding: 6px 12px;
        gap: 12px;
        font-family: var(--settings-font);
        font-size: 14px;
        transition: top 0.3s ease, box-shadow 0.3s ease;
    }
    #settings-handle:hover {
        box-shadow: 0 6px 16px rgba(0,0,0,0.3);
        top: 12px;
    }
    #settings-handle a {
        color: var(--settings-text-secondary);
        text-decoration: none;
        transition: color 0.2s;
    }
    #settings-handle a:hover {
        color: var(--settings-text-primary);
    }
    #settings-handle-button {
        background: none;
        border: none;
        color: var(--settings-text-primary);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
    }
    #settings-handle-button:hover {
        background-color: rgba(255,255,255,0.1);
    }
    #settings-handle-button svg {
        width: 20px;
        height: 20px;
    }

    #settings-overlay {
        position: fixed;
        top: 0; left: 0;
        width: 100vw; height: 100vh;
        background-color: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        z-index: 10002;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
    }
    #settings-overlay.visible {
        opacity: 1;
        visibility: visible;
    }
    #settings-panel {
        font-family: var(--settings-font);
        background-color: var(--settings-bg-primary);
        color: var(--settings-text-primary);
        width: 90vw;
        max-width: 960px;
        height: 80vh;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform: scale(0.95);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    #settings-overlay.visible #settings-panel {
        transform: scale(1);
    }

    .settings-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 24px;
        border-bottom: 1px solid var(--settings-border-color);
        flex-shrink: 0;
    }
    .settings-header h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 12px;
    }
    .settings-header h2 svg {
         width: 22px; height: 22px;
    }
    #close-settings-btn {
        background: none;
        border: none;
        color: var(--settings-text-secondary);
        cursor: pointer;
        padding: 6px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s, color 0.2s;
    }
    #close-settings-btn:hover {
        background-color: var(--settings-bg-secondary);
        color: var(--settings-text-primary);
    }

    .settings-body {
        display: flex;
        flex-grow: 1;
        overflow: hidden;
    }
    .settings-tabs {
        width: 220px;
        flex-shrink: 0;
        padding: 16px;
        border-right: 1px solid var(--settings-border-color);
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .tab-btn {
        width: 100%;
        padding: 10px 16px;
        border: none;
        background-color: transparent;
        color: var(--settings-text-secondary);
        font-size: 15px;
        font-weight: 500;
        text-align: left;
        border-radius: 6px;
        cursor: pointer;
        transition: background-color 0.2s, color 0.2s;
    }
    .tab-btn:hover {
        background-color: var(--settings-bg-secondary);
        color: var(--settings-text-primary);
    }
    .tab-btn.active {
        background-color: var(--settings-accent-primary);
        color: white;
    }

    .settings-content {
        flex-grow: 1;
        overflow-y: auto;
        padding: 24px 32px;
    }
    .settings-pane {
        display: none;
        flex-direction: column;
        gap: 20px;
    }
    .settings-pane.active {
        display: flex;
    }

    .setting-row {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: 10px 20px;
        padding: 16px;
        background: var(--settings-bg-secondary);
        border: 1px solid var(--settings-border-color);
        border-radius: 10px;
    }
    .setting-row .label-group {
        grid-column: 1 / 2;
    }
    .setting-row .label-group label {
        font-weight: 500;
        font-size: 15px;
        color: var(--settings-text-primary);
    }
    .setting-row .label-group small {
        font-size: 13px;
        color: var(--settings-text-secondary);
        display: block;
        margin-top: 4px;
    }
    .setting-row .control-group {
        grid-column: 2 / 3;
        grid-row: 1 / 3;
    }
    .setting-row .control-group-full {
         grid-column: 1 / -1;
         margin-top: 10px;
    }

    /* Toggle Switch Control */
    .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .toggle-switch .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #555; transition: .4s; border-radius: 24px; }
    .toggle-switch .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
    .toggle-switch input:checked + .slider { background-color: var(--settings-accent-primary); }
    .toggle-switch input:checked + .slider:before { transform: translateX(20px); }

    /* Other Controls */
    .settings-pane select, .settings-pane input[type="text"], .settings-pane input[type="password"], .settings-pane input[type="url"] {
         background-color: var(--input-bg);
         color: var(--input-text);
         border: 1px solid var(--input-border);
         padding: 8px 12px;
         border-radius: 6px;
         font-size: 14px;
         width: 100%;
         box-sizing: border-box;
    }
    .settings-styled-button {
         background-color: var(--settings-accent-primary);
         color: white;
         border: none;
         padding: 10px 16px;
         border-radius: 6px;
         font-size: 14px;
         font-weight: 500;
         cursor: pointer;
         transition: background-color 0.2s, transform 0.1s;
    }
    .settings-styled-button:hover {
        filter: brightness(1.1);
    }
     .settings-styled-button:active {
        transform: scale(0.98);
    }
`;