// ==UserScript==
// @name         Gemini Prompt Panel
// @namespace    http://tampermonkey.net/
// @version      10.6
// @description  Adds a highly configurable, auto-hiding, lockable, slide-out panel that remembers its position, with draggable prompts, themes, import/export, and more.
// @author       You
// @match        https://gemini.google.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=gemini.google.com
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    // --- CONFIGURATION & KEYS ---
    const DEFAULT_PROMPTS = [
        { name: 'Explain Code', text: 'Explain this code line by line:', autoSend: false },
        { name: 'Refactor Code', text: 'Refactor this code to be more efficient:', autoSend: true }
    ];
    const GM_PROMPTS_KEY = 'gemini_custom_prompts_v2';
    const GM_THEME_KEY = 'gemini_panel_theme';
    const GM_POSITION_KEY = 'gemini_panel_position';
    const GM_POSITION_TOP_KEY = 'gemini_panel_position_top';

    // --- SVG ICON BUILDER ---
    function buildSvgIcon(pathData) {
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '16'); svg.setAttribute('height', '16');
        svg.setAttribute('fill', 'currentColor'); svg.setAttribute('viewBox', '0 0 16 16');
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', pathData);
        svg.appendChild(path);
        return svg;
    }

    const icons = {
        unlocked: buildSvgIcon("M11 1a2 2 0 0 0-2 2v4a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h5V3a3 3 0 0 1 6 0v4a.5.5 0 0 1-1 0V3a2 2 0 0 0-2-2z"),
        locked: buildSvgIcon("M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"),
        settings: buildSvgIcon("M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"),
        trash: buildSvgIcon("M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"),
        plus: buildSvgIcon("M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"),
    };

    // --- INJECTED CSS ---
    GM_addStyle(`
        :root {
            --panel-bg: #2a2a2e; --panel-text: #e0e0e0; --panel-header-bg: #3a3a3e; --panel-border: #4a4a4e;
            --btn-bg: #4a4a4e; --btn-hover-bg: #5a5a5e; --btn-border: #5a5a5e;
            --scrollbar-track: #333336; --scrollbar-thumb: #5a5a5e;
            --handle-color: #4CAF50; --input-bg: #4a4a4e; --input-text: #f0f0f0; --input-border: #5a5a5e;
        }
        .gemini-prompt-panel.light-theme {
            --panel-bg: #f0f2f5; --panel-text: #333; --panel-header-bg: #e0e2e5; --panel-border: #d0d2d5;
            --btn-bg: #e8eaed; --btn-hover-bg: #dde0e3; --btn-border: #c0c2c5;
            --scrollbar-track: #e0e2e5; --scrollbar-thumb: #b0b2b5; --input-bg: #fff; --input-text: #202124; --input-border: #dadce0;
        }
        .gemini-prompt-panel { position: fixed; z-index: 9999; background: var(--panel-bg); color: var(--panel-text); border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); user-select: none; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; min-width: 220px; box-sizing: border-box; transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
        .gemini-prompt-panel.left-side { left: 0; border-right: 10px solid var(--handle-color); transform: translateX(calc(-100% + 10px)); }
        .gemini-prompt-panel.right-side { right: 0; border-left: 10px solid var(--handle-color); transform: translateX(calc(100% - 10px)); border-radius: 8px 0 0 8px; }
        .gemini-prompt-panel.left-side.visible, .gemini-prompt-panel.right-side.visible { transform: translateX(0); }
        .gemini-panel-header { position: relative; padding: 8px; cursor: move; background-color: var(--panel-header-bg); font-size: 14px; font-weight: bold; text-align: center; }
        .gemini-prompt-panel.left-side .gemini-panel-header { border-top-right-radius: 8px; }
        .gemini-prompt-panel.right-side .gemini-panel-header { border-top-left-radius: 8px; }
        .panel-header-controls { position: absolute; top: 50%; transform: translateY(-50%); display: flex; align-items: center; gap: 5px; }
        .panel-header-controls.left { left: 8px; }
        .panel-header-controls.right { right: 8px; }
        .panel-header-controls button { background: transparent; border: none; color: var(--panel-text); cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; opacity: 0.7; }
        .panel-header-controls button:hover { background-color: rgba(125, 125, 125, 0.2); opacity: 1; }
        .panel-header-controls button svg { pointer-events: none; }
        .gemini-panel-content { padding: 15px; display: flex; flex-direction: column; gap: 10px; }
        #custom-prompts-container { display: flex; flex-direction: column; gap: 10px; max-height: 240px; overflow-y: auto; padding-right: 5px; border-top: 1px solid var(--panel-border); padding-top: 10px; }
        #custom-prompts-container::-webkit-scrollbar { width: 8px; }
        #custom-prompts-container::-webkit-scrollbar-track { background: var(--scrollbar-track); border-radius: 4px; }
        #custom-prompts-container::-webkit-scrollbar-thumb { background-color: var(--scrollbar-thumb); border-radius: 4px; }
        .gemini-panel-button { background-color: var(--btn-bg); color: var(--panel-text); border: 1px solid var(--btn-border); border-radius: 5px; padding: 8px 12px; font-size: 14px; font-weight: bold; cursor: pointer; transition: background-color 0.2s; text-align: left; position: relative; flex-shrink: 0; display: flex; align-items: center; gap: 8px; }
        .gemini-panel-button.prompt-button { cursor: grab; }
        .gemini-panel-button.prompt-button:active { cursor: grabbing; }
        .gemini-panel-button:hover { background-color: var(--btn-hover-bg); }
        .prompt-button .delete-btn { position: absolute; top: 50%; right: 8px; transform: translateY(-50%); opacity: 0; }
        .prompt-button:hover .delete-btn { opacity: 0.7; }
        .prompt-button .delete-btn:hover { opacity: 1; background-color: rgba(220, 53, 69, 0.8); }
        #new-chat-btn { background-color: #8A2BE2; border-color: transparent; color: white; }
        #new-chat-btn:hover { background-color: #7b25c9; }
        #add-prompt-btn { background-color: #1a73e8; border-color: transparent; color: white;}
        #action-buttons-container { border-top: 1px solid var(--panel-border); padding-top: 10px; display: flex; flex-direction: column; gap: 10px; }
        #action-buttons-container .gemini-panel-button { background-color: #28a745; border-color: transparent; color: white; }
        #action-buttons-container .gemini-panel-button:hover { background-color: #218838; }
        .dragging { opacity: 0.4; background: #555; }
        .settings-modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); z-index: 10000; justify-content: center; align-items: center; }
        .settings-modal-content { background: var(--panel-bg); color: var(--panel-text); padding: 20px; border-radius: 8px; width: 90%; max-width: 400px; box-shadow: 0 5px 25px rgba(0,0,0,0.4); position: relative; }
        .settings-modal-content h3 { margin-top: 0; border-bottom: 1px solid var(--panel-border); padding-bottom: 10px; }
        .settings-close-btn { position: absolute; top: 10px; right: 10px; background: none; border: none; cursor: pointer; color: var(--panel-text); font-size: 24px; padding: 5px;}
        .settings-section { margin-top: 20px; }
        .settings-section > label { display: block; margin-bottom: 10px; font-weight: bold; }
        .settings-controls { display: flex; gap: 10px; flex-wrap: wrap; }
        .settings-controls button, .settings-controls .radio-group label { background-color: var(--btn-bg); color: var(--panel-text); border: 1px solid var(--btn-border); padding: 8px 12px; border-radius: 5px; cursor: pointer; }
        .settings-controls button:hover, .settings-controls .radio-group label:hover { background-color: var(--btn-hover-bg); }
        .settings-controls input[type="radio"] { display: none; }
        .settings-controls input[type="radio"]:checked + label { background-color: #1a73e8; color: white; border-color: #1a73e8; }
        .gemini-prompt-form { display: none; flex-direction: column; gap: 10px; background-color: var(--panel-header-bg); padding: 15px; border-top: 1px solid var(--panel-border); }
        .gemini-prompt-form.active { display: flex; }
        .gemini-prompt-form input[type="text"], .gemini-prompt-form textarea { width: 100%; background-color: var(--input-bg); color: var(--input-text); border: 1px solid var(--input-border); border-radius: 5px; padding: 8px; font-size: 14px; box-sizing: border-box; }
        .gemini-prompt-form label { display: flex; align-items: center; cursor: pointer; gap: 5px; }
    `);

    // --- GLOBAL VARIABLES ---
    let panel, copyCodeButton, copyResponseButton, lockButton, settingsButton, settingsModal, promptForm;
    let isManuallyLocked = false, isFormActiveLock = false, currentPrompts = [], draggedItem = null;
    let latestCodeBlockTarget = null, latestResponseCopyTarget = null;

    // --- CORE & UI FUNCTIONS ---
    function hidePanel() { if (panel && !isManuallyLocked && !isFormActiveLock) panel.classList.remove('visible'); }
    function updateLockIcon() { if (!lockButton) return; while (lockButton.firstChild) lockButton.removeChild(lockButton.firstChild); lockButton.appendChild((isManuallyLocked || isFormActiveLock) ? icons.locked.cloneNode(true) : icons.unlocked.cloneNode(true)); }
    function createButtonWithIcon(text, iconElement) { const button = document.createElement('button'); button.className = 'gemini-panel-button'; if (iconElement) button.appendChild(iconElement.cloneNode(true)); button.appendChild(document.createTextNode(text)); return button; }

    async function applyTheme() {
        const theme = await GM_getValue(GM_THEME_KEY, 'auto');
        const themeRadio = settingsModal.querySelector(`#theme-control input[value="${theme}"]`);
        if (themeRadio) themeRadio.checked = true;
        const isDark = theme === 'auto' ? document.querySelector('body.theme-dark') : theme === 'dark';
        panel.classList.toggle('light-theme', !isDark);
    }
    async function applyPanelPosition() {
        const position = await GM_getValue(GM_POSITION_KEY, 'left');
        const posRadio = settingsModal.querySelector(`#position-control input[value="${position}"]`);
        if (posRadio) posRadio.checked = true;
        panel.classList.remove('left-side', 'right-side');
        panel.classList.add(position === 'left' ? 'left-side' : 'right-side');
    }

    // --- PROMPT MANAGEMENT ---
    function savePrompts() { GM_setValue(GM_PROMPTS_KEY, JSON.stringify(currentPrompts)); }
    async function loadAndDisplayPrompts() {
        const savedPromptsJson = await GM_getValue(GM_PROMPTS_KEY);
        try { const saved = JSON.parse(savedPromptsJson); currentPrompts = Array.isArray(saved) && saved.length > 0 ? saved : [...DEFAULT_PROMPTS]; }
        catch { currentPrompts = [...DEFAULT_PROMPTS]; }
        renderAllPrompts();
    }
    function renderAllPrompts() { const container = panel.querySelector('#custom-prompts-container'); if (!container) return; container.querySelectorAll('.prompt-button').forEach(btn => btn.remove()); currentPrompts.forEach(prompt => addPromptButtonToPanel(prompt)); }
    function addPromptButtonToPanel(prompt) {
        const button = createButtonWithIcon(prompt.name, null); button.classList.add('prompt-button'); button.title = prompt.text;
        const deleteBtn = document.createElement('button'); deleteBtn.className = 'delete-btn'; deleteBtn.appendChild(icons.trash.cloneNode(true));
        deleteBtn.onclick = (e) => { e.stopPropagation(); if (confirm(`Delete "${prompt.name}"?`)) { currentPrompts = currentPrompts.filter(p => p !== prompt); savePrompts(); renderAllPrompts(); } };
        button.appendChild(deleteBtn);
        button.addEventListener('click', () => { sendPromptToGemini(prompt.text, prompt.autoSend); if (!isManuallyLocked) hidePanel(); });
        button.draggable = true;
        button.addEventListener('dragstart', (e) => { draggedItem = prompt; e.dataTransfer.effectAllowed = 'move'; e.target.classList.add('dragging'); });
        button.addEventListener('dragend', (e) => e.target.classList.remove('dragging'));
        const container = panel.querySelector('#custom-prompts-container');
        const addPromptBtn = panel.querySelector('#add-prompt-btn');
        if (container && addPromptBtn) container.insertBefore(button, addPromptBtn);
    }

    // --- BUILDER FUNCTIONS ---
    function buildSettingsModal() {
        const overlay = document.createElement('div'); overlay.className = 'settings-modal-overlay';
        const content = document.createElement('div'); content.className = 'settings-modal-content';
        const closeBtn = document.createElement('button'); closeBtn.className = 'settings-close-btn'; closeBtn.textContent = '×'; closeBtn.onclick = () => overlay.style.display = 'none';
        content.appendChild(closeBtn);
        const title = document.createElement('h3'); title.textContent = 'Panel Settings'; content.appendChild(title);
        function createSection(labelText, controlsId, controlClass) { const section = document.createElement('div'); section.className = 'settings-section'; const label = document.createElement('label'); label.textContent = labelText; section.appendChild(label); const controls = document.createElement('div'); controls.className = controlClass; controls.id = controlsId; section.appendChild(controls); content.appendChild(section); return controls; }
        const themeControls = createSection('Theme', 'theme-control', 'settings-controls radio-group');
        ['auto', 'light', 'dark'].forEach(theme => { const input = document.createElement('input'); input.type = 'radio'; input.id = `theme-${theme}`; input.name = 'theme'; input.value = theme; const label = document.createElement('label'); label.htmlFor = `theme-${theme}`; label.textContent = theme.charAt(0).toUpperCase() + theme.slice(1); themeControls.append(input, label); });
        themeControls.onchange = (e) => { GM_setValue(GM_THEME_KEY, e.target.value); applyTheme(); };
        const posControls = createSection('Panel Position', 'position-control', 'settings-controls radio-group');
        ['left', 'right'].forEach(pos => { const input = document.createElement('input'); input.type = 'radio'; input.id = `pos-${pos}`; input.name = 'position'; input.value = pos; const label = document.createElement('label'); label.htmlFor = `pos-${pos}`; label.textContent = pos.charAt(0).toUpperCase() + pos.slice(1); posControls.append(input, label); });
        posControls.onchange = (e) => { GM_setValue(GM_POSITION_KEY, e.target.value); applyPanelPosition(); };
        const mgmtControls = createSection('Prompt Management', 'mgmt-control', 'settings-controls');
        const importBtn = document.createElement('button'); importBtn.textContent = 'Import'; importBtn.onclick = importPrompts;
        const exportBtn = document.createElement('button'); exportBtn.textContent = 'Export'; exportBtn.onclick = exportPrompts;
        const resetBtn = document.createElement('button'); resetBtn.textContent = 'Reset'; resetBtn.onclick = resetPrompts;
        mgmtControls.append(importBtn, exportBtn, resetBtn);
        overlay.appendChild(content);
        overlay.onclick = (e) => { if (e.target === overlay) overlay.style.display = 'none'; };
        return overlay;
    }

    function buildPromptForm() {
        const form = document.createElement('div'); form.className = 'gemini-prompt-form';
        const nameInput = document.createElement('input'); nameInput.type = 'text'; nameInput.placeholder = 'Button Name';
        const textInput = document.createElement('textarea'); textInput.placeholder = 'Prompt Text'; textInput.rows = 4;
        const checkboxLabel = document.createElement('label'); const checkbox = document.createElement('input'); checkbox.type = 'checkbox';
        checkboxLabel.append(checkbox, document.createTextNode(' Auto-send after inserting'));
        const formButtonsDiv = document.createElement('div'); formButtonsDiv.className = 'settings-controls'; formButtonsDiv.style.justifyContent = 'flex-end';
        const createBtn = document.createElement('button'); createBtn.textContent = 'Create'; createBtn.style.cssText = 'background-color: #28a745; color: white; border: 1px solid transparent;';
        const cancelBtn = document.createElement('button'); cancelBtn.textContent = 'Cancel'; cancelBtn.style.cssText = 'background-color: #dc3545; color: white; border: 1px solid transparent;';
        formButtonsDiv.append(cancelBtn, createBtn);
        form.append(nameInput, textInput, checkboxLabel, formButtonsDiv);
        const hideForm = () => { isFormActiveLock = false; updateLockIcon(); form.classList.remove('active'); panel.querySelector('.gemini-panel-content').style.display = 'flex'; panel.querySelector('.gemini-panel-header').style.display = 'block'; nameInput.value = ''; textInput.value = ''; checkbox.checked = false; if (!isManuallyLocked) setTimeout(hidePanel, 50); };
        cancelBtn.onclick = hideForm;
        createBtn.onclick = () => { const name = nameInput.value.trim(); const text = textInput.value.trim(); if (name && text) { currentPrompts.push({ name, text, autoSend: checkbox.checked }); savePrompts(); renderAllPrompts(); hideForm(); } else { alert('Please enter both a button name and prompt text.'); } };
        return form;
    }

    // --- MAIN PANEL CREATION ---
    async function createAndAppendPanel() {
        if (document.getElementById('gemini-prompt-panel-main')) return;
        panel = document.createElement('div'); panel.id = 'gemini-prompt-panel-main'; panel.className = 'gemini-prompt-panel';
        panel.style.top = await GM_getValue(GM_POSITION_TOP_KEY, '90px');
        panel.addEventListener('mouseenter', () => panel.classList.add('visible'));
        panel.addEventListener('mouseleave', hidePanel);
        const header = document.createElement('div'); header.className = 'gemini-panel-header'; header.textContent = 'Prompt Panel'; panel.appendChild(header);
        const leftHeaderControls = document.createElement('div'); leftHeaderControls.className = 'panel-header-controls left'; header.appendChild(leftHeaderControls);
        const rightHeaderControls = document.createElement('div'); rightHeaderControls.className = 'panel-header-controls right'; header.appendChild(rightHeaderControls);
        settingsButton = document.createElement('button'); settingsButton.title = 'Settings'; settingsButton.appendChild(icons.settings.cloneNode(true)); settingsButton.onclick = () => settingsModal.style.display = 'flex';
        leftHeaderControls.appendChild(settingsButton);
        lockButton = document.createElement('button'); lockButton.title = 'Lock/Unlock Panel'; lockButton.onclick = () => { isManuallyLocked = !isManuallyLocked; updateLockIcon(); if (isManuallyLocked) panel.classList.add('visible'); };
        rightHeaderControls.appendChild(lockButton);
        updateLockIcon();
        const content = document.createElement('div'); content.className = 'gemini-panel-content'; panel.appendChild(content);
        const newChatButton = createButtonWithIcon("New Chat", icons.plus); newChatButton.id = 'new-chat-btn'; newChatButton.onclick = () => { if (!isManuallyLocked) hidePanel(); window.location.href = 'https://gemini.google.com/app'; };
        content.appendChild(newChatButton);
        const customPromptsContainer = document.createElement('div'); customPromptsContainer.id = 'custom-prompts-container'; content.appendChild(customPromptsContainer);
        customPromptsContainer.addEventListener('dragover', e => { e.preventDefault(); const afterElement = getDragAfterElement(customPromptsContainer, e.clientY); const currentlyDragged = document.querySelector('.dragging'); if (currentlyDragged) { if (afterElement == null) { customPromptsContainer.insertBefore(currentlyDragged, panel.querySelector('#add-prompt-btn')); } else { customPromptsContainer.insertBefore(currentlyDragged, afterElement); } } });
        customPromptsContainer.addEventListener('drop', e => { e.preventDefault(); const fromIndex = currentPrompts.findIndex(p => p === draggedItem); if (fromIndex > -1) { const newIndex = Array.from(customPromptsContainer.children).indexOf(document.querySelector('.dragging')); currentPrompts.splice(fromIndex, 1); currentPrompts.splice(newIndex, 0, draggedItem); savePrompts(); renderAllPrompts(); } draggedItem = null; });
        const addPromptBtn = createButtonWithIcon("Add New Prompt", icons.plus); addPromptBtn.id = 'add-prompt-btn'; addPromptBtn.onclick = () => { isFormActiveLock = true; updateLockIcon(); panel.classList.add('visible'); promptForm.classList.add('active'); content.style.display = 'none'; header.style.display = 'none'; };
        customPromptsContainer.appendChild(addPromptBtn);
        const actionButtonContainer = document.createElement('div'); actionButtonContainer.id = 'action-buttons-container'; content.appendChild(actionButtonContainer);
        copyResponseButton = createButtonWithIcon("Copy Response", null); copyResponseButton.onclick = copyLastResponse; actionButtonContainer.appendChild(copyResponseButton);
        copyCodeButton = createButtonWithIcon("Copy Code", null); copyCodeButton.onclick = setupCopyCodeAction(); actionButtonContainer.appendChild(copyCodeButton);
        document.body.appendChild(panel);
        settingsModal = buildSettingsModal(); panel.appendChild(settingsModal);
        promptForm = buildPromptForm(); panel.appendChild(promptForm);
        function getDragAfterElement(container, y) { const draggableElements = [...container.querySelectorAll('.prompt-button:not(.dragging)')]; return draggableElements.reduce((closest, child) => { const box = child.getBoundingClientRect(); const offset = y - box.top - box.height / 2; if (offset < 0 && offset > closest.offset) { return { offset: offset, element: child }; } else { return closest; } }, { offset: Number.NEGATIVE_INFINITY }).element; }
        header.addEventListener('mousedown', function(e) { if (e.target.closest('.panel-header-controls')) return; let offsetY = e.clientY - panel.getBoundingClientRect().top; function mouseMoveHandler(e) { panel.style.top = (e.clientY - offsetY) + 'px'; } function mouseUpHandler() { document.removeEventListener('mousemove', mouseMoveHandler); document.removeEventListener('mouseup', mouseUpHandler); GM_setValue(GM_POSITION_TOP_KEY, panel.style.top); } document.addEventListener('mousemove', mouseMoveHandler); document.addEventListener('mouseup', mouseUpHandler); });
        initializeCopyActions();
        applyTheme();
        applyPanelPosition();
        loadAndDisplayPrompts();
    }

    // --- OTHER FUNCTIONALITY ---
    function initializeCopyActions() {
        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== Node.ELEMENT_NODE) continue;
                    // Find last response container added
                    const responseContainer = node.matches('response-container') ? node : node.querySelector('response-container');
                    if (responseContainer) {
                        latestResponseCopyTarget = responseContainer.querySelector('[data-test-id="copy-button"]');
                    }
                    // Find last code block added
                    const codeBlock = node.matches('.code-block') ? node : node.querySelector('.code-block');
                    if (codeBlock) {
                        latestCodeBlockTarget = codeBlock.querySelector('button[aria-label="Copy code"]');
                    }
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
    function setupCopyCodeAction() { return () => { if (!latestCodeBlockTarget) { alert("No recent code block found to copy."); return; } latestCodeBlockTarget.click(); if (!isManuallyLocked) hidePanel(); copyCodeButton.textContent = 'Copied!'; setTimeout(() => { copyCodeButton.textContent = 'Copy Code'; }, 1500); }; }
    function copyLastResponse() { if (!latestResponseCopyTarget) { alert("No recent response found to copy."); return; } latestResponseCopyTarget.click(); if (!isManuallyLocked) hidePanel(); copyResponseButton.textContent = 'Copied!'; setTimeout(() => { copyResponseButton.textContent = 'Copy Response'; }, 1500); }
    function sendPromptToGemini(text, sendPrompt = false) { const textArea = document.querySelector('div.ql-editor.textarea'); if (textArea) { textArea.textContent = text; textArea.dispatchEvent(new Event('input', { bubbles: true })); const sendButton = document.querySelector('button[data-testid="send-button"]'); if (sendPrompt && sendButton) { setTimeout(() => sendButton.click(), 100); } } }
    function exportPrompts() { const jsonString = JSON.stringify(currentPrompts, null, 2); const blob = new Blob([jsonString], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'gemini-prompts-backup.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }
    function importPrompts() { const input = document.createElement('input'); input.type = 'file'; input.accept = '.json'; input.onchange = e => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = event => { try { const imported = JSON.parse(event.target.result); if (Array.isArray(imported) && imported.every(p => p.name && p.text)) { if (confirm('Add ' + imported.length + ' imported prompts to your existing ones?')) { currentPrompts = [...currentPrompts, ...imported]; savePrompts(); renderAllPrompts(); } } else { throw new Error('Invalid file format.'); } } catch (err) { alert('Error reading file: ' + err.message); } }; reader.readAsText(file); }; input.click(); }
    function resetPrompts() { if (confirm('Are you sure you want to delete all your custom prompts and reset to the defaults?')) { currentPrompts = [...DEFAULT_PROMPTS]; savePrompts(); renderAllPrompts(); } }

    // --- INITIALIZATION ---
    (async function() {
        if (document.body) await createAndAppendPanel();
        else new MutationObserver(async (_, obs) => { if (document.body) { await createAndAppendPanel(); obs.disconnect(); } }).observe(document, { childList: true, subtree: true });
    })();
})();