// ==UserScript==
// @name         Gemini Prompt Panel Enhancer
// @namespace    https://github.com/SysAdminDoc/Gemini-Prompt-Panel
// @version      29.0
// @description  Upgraded with profiles, UI refinements, improved defaults, and new functions.
// @author       Matthew Parker
// @match        https://gemini.google.com/*
// @icon         https://raw.githubusercontent.com/SysAdminDoc/Gemini-Prompt-Panel/refs/heads/main/Google_Gemini_icon_2025.svg
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      api.github.com
// @connect      gist.githubusercontent.com
// @connect      raw.githubusercontent.com
// @run-at       document-idle
// @license      MIT
// @updateURL    https://github.com/SysAdminDoc/Gemini-Prompt-Panel/raw/refs/heads/main/Gemini%20Prompt%20Panel.user.js
// @downloadURL  https://github.com/SysAdminDoc/Gemini-Prompt-Panel/raw/refs/heads/main/Gemini%20Prompt%20Panel.user.js
// @require      file:///C:/path/to/your/scripts/data.js
// @require      file:///C:/path/to/your/scripts/ui.js
// ==/UserScript==

(function() {
    'use strict';

    // --- EXECUTION GUARD ---
    if (window.geminiPanelEnhanced) {
        console.log('Gemini Prompt Panel Enhancer is already running.');
        return;
    }
    window.geminiPanelEnhanced = true;
    console.log('Gemini Prompt Panel Enhancer v35.0 loaded');

    // --- DOM & STATE VARIABLES (from data.js) ---
    let panel, handle, promptFormModal, toast, resizeHandle, navigator, settingsModal, importExportModal, aiEnhancerModal, analyticsModal, versionHistoryModal, floatingMiniPanel, miniPanelTrigger;
    let leftHeaderControls, rightHeaderControls, actionGroup;
    let lockButton, arrowLeftBtn, arrowRightBtn, settingsBtn, analyticsBtn;
    let copyResponseButton, copyCodeButton;
    let isManuallyLocked = false, isFormActiveLock = false;
    let generationObserver = null, isGenerating = false;

    // --- CORE HELPERS ---
    function showToast(message, duration = 2000, type = '') {
        toast.textContent = message;
        toast.className = 'toast-notification';
        if (type) toast.classList.add(type);
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), duration);
    }
    function showCountdownToast(message, duration = 5000) {
        toast.className = 'toast-notification success show';
        let seconds = Math.floor(duration / 1000);
        const updateText = () => { toast.textContent = `${message} (${seconds})`; };
        updateText();
        const timer = setInterval(() => {
            seconds--;
            if (seconds > 0) {
                updateText();
            } else {
                clearInterval(timer);
                toast.classList.remove('show');
            }
        }, 1000);
        setTimeout(() => { clearInterval(timer); toast.classList.remove('show'); }, duration);
    }
    function hidePanel() { if (!isManuallyLocked && !isFormActiveLock && !panel.classList.contains('is-resizing')) panel.classList.remove('visible'); }
    function updateLockIcon() { if (lockButton) { while (lockButton.firstChild) lockButton.removeChild(lockButton.firstChild); lockButton.appendChild(((isManuallyLocked || isFormActiveLock) ? icons.locked : icons.unlocked).cloneNode(true)); } }
    function createButtonWithIcon(txt, ic) { const b = document.createElement('button'); b.className = 'gemini-prompt-panel-button'; if (ic) b.appendChild(ic.cloneNode(true)); if (txt) b.appendChild(document.createTextNode(txt)); return b; }
    function capitalizeFirstLetter(string) { return string.charAt(0).toUpperCase() + string.slice(1); }

    // --- THEME & WIDE MODE ---
    function applyTheme() {
        for (const [key, value] of Object.entries(settings.colors)) {
            document.documentElement.style.setProperty(key, value);
        }
        document.documentElement.style.setProperty('--panel-font', settings.fontFamily);
        document.documentElement.style.setProperty('--base-font-size', settings.baseFontSize);
        panel.classList.toggle('glass-theme', settings.themeName === 'glass');
        panel.classList.toggle('condensed', settings.condensedMode);
    }

    function toggleFullWidth(enable) {
        let styleTag = document.getElementById(FULL_WIDTH_STYLE_ID);
        if (enable) {
            if (!styleTag) {
                styleTag = document.createElement('style');
                styleTag.id = FULL_WIDTH_STYLE_ID;
                document.head.appendChild(styleTag);
            }
            styleTag.textContent = FULL_WIDTH_CSS;
        } else {
            if (styleTag) {
                styleTag.remove();
            }
        }
    }

    // --- RENDER & UI ---
    async function applySettingsAndTheme() {
        applyTheme();
        toggleFullWidth(settings.enableFullWidth);
        const wasLockedAndVisible = panel.classList.contains('visible') && isManuallyLocked;
        panel.className = 'gemini-prompt-panel';
        if (settings.themeName === 'glass') panel.classList.add('glass-theme');
        if (settings.condensedMode) panel.classList.add('condensed');
        if(wasLockedAndVisible) panel.classList.add('visible');
        const p = settings.position;
        panel.classList.add(p === 'left' ? 'left-side' : 'right-side');
        handle.classList.toggle('right-side-handle', p === 'right');
        handle.classList.toggle('edge', settings.handleStyle === 'edge');
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

    function updateHandleHeight() {
        if (!panel || !handle || settings.handleStyle === 'edge') return;
        setTimeout(() => {
            const panelHeight = panel.offsetHeight;
            if (panelHeight > 0) handle.style.height = `${panelHeight}px`;
        }, 100);
    }

    // --- PROMPT & CATEGORY MGMT ---
    async function loadAndDisplayPrompts(isSync = false) {
        if (!isSync) {
            let raw = await GM_getValue(GM_PROMPTS_KEY);
            try {
                let loadedPrompts = JSON.parse(raw);
                if (typeof loadedPrompts === 'object' && loadedPrompts !== null && Object.keys(loadedPrompts).length > 0) {
                    currentPrompts = loadedPrompts;
                } else { throw new Error("No prompts stored, checking for first run."); }
            } catch (e) {
                console.log(e.message);
                currentPrompts = {};
                if (confirm("Welcome to the Gemini Prompt Panel! Would you like to import the default list of prompts to get started?")) {
                    await fetchDefaultPrompts();
                }
            }
        }
        ensurePromptIDs(currentPrompts);

        const currentGroups = Object.keys(currentPrompts).filter(c => c !== "Favorites");
        const orderedGroups = (settings.groupOrder || []).filter(g => currentGroups.includes(g));
        const newGroups = currentGroups.filter(g => !orderedGroups.includes(g));
        settings.groupOrder = [...orderedGroups, ...newGroups];

        if (!settings.initiallyCollapsed) {
            settings.collapsedCategories = [...Object.keys(currentPrompts), "Favorites"];
            settings.initiallyCollapsed = true;
        }
        await saveSettings();
        renderAllPrompts();
        renderMiniPanel();
    }

    function findPromptCategory(promptId) {
        for (const cat in currentPrompts) {
            if (currentPrompts[cat].some(p => p.id === promptId)) {
                return cat;
            }
        }
        return null;
    }

    function renderAllPrompts() {
        const container = panel.querySelector('#custom-prompts-container');
        while (container.firstChild) container.removeChild(container.firstChild);

        const allPrompts = Object.values(currentPrompts).flat();
        const favoritePrompts = allPrompts.filter(p => p && p.id && settings.favorites.includes(p.id));

        if (favoritePrompts.length > 0) {
            const favCategoryDiv = createCategory("Favorites", favoritePrompts, true);
            favCategoryDiv.id = 'favorites-category';
            container.appendChild(favCategoryDiv);
        }

        if (settings.groupByTags) {
            const promptsForTagging = allPrompts.filter(p => p && p.id && !settings.favorites.includes(p.id));
            const promptsByTag = {};
            promptsForTagging.forEach(prompt => {
                const tags = (prompt.tags || "").split(',').map(t => t.trim()).filter(Boolean);
                if (tags.length > 0) {
                    tags.forEach(tag => {
                        const capitalizedTag = capitalizeFirstLetter(tag);
                        if (!promptsByTag[capitalizedTag]) promptsByTag[capitalizedTag] = [];
                        promptsByTag[capitalizedTag].push(prompt);
                    });
                } else {
                    const noTagGroup = '(No Tags)';
                    if (!promptsByTag[noTagGroup]) promptsByTag[noTagGroup] = [];
                    promptsByTag[noTagGroup].push(prompt);
                }
            });

            const allTagNames = Object.keys(promptsByTag);
            const orderedTags = (settings.tagOrder || []).filter(t => allTagNames.includes(t));
            const newTags = allTagNames.filter(t => !orderedTags.includes(t)).sort((a, b) => a.localeCompare(b));
            settings.tagOrder = [...orderedTags, ...newTags];

            settings.tagOrder.forEach(tagName => {
                const promptsInTag = promptsByTag[tagName];
                if (promptsInTag && promptsInTag.length > 0) {
                    const sortedPrompts = [...promptsInTag].sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
                    const categoryDiv = createCategory(tagName, sortedPrompts, true);
                    container.appendChild(categoryDiv);
                }
            });
        } else {
            (settings.groupOrder || []).forEach(categoryName => {
                const prompts = currentPrompts[categoryName];
                if (prompts && prompts.length > 0) {
                    const nonFavoritePrompts = prompts.filter(p => !settings.favorites.includes(p.id));
                    if (nonFavoritePrompts.length > 0) {
                        const sortedPrompts = [...nonFavoritePrompts].sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
                        const categoryDiv = createCategory(categoryName, sortedPrompts, true);
                        container.appendChild(categoryDiv);
                    }
                }
            });
        }
        updateHandleHeight();
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
        if (this.classList.contains('prompt-button-wrapper') && this !== draggedItem && this.closest('.prompt-category-content')) {
            this.classList.add('drag-over');
        }
        return false;
    }
    function handleDragLeave() { this.classList.remove('drag-over'); }
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
                showToast("Can only reorder prompts within the same category.", 2500, 'error');
            }
        }
        return false;
    }
    function handleDragEnd() {
        document.querySelectorAll('.prompt-button-wrapper').forEach(item => {
            item.classList.remove('dragging', 'drag-over');
        });
        draggedItem = null;
    }

    function handleCategoryDragStart(e) {
        draggedItem = this;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.dataset.categoryName);
        setTimeout(() => this.classList.add('dragging'), 0);
    }
    function handleCategoryDragOver(e) {
        e.preventDefault();
        if (this.classList.contains('prompt-category') && this !== draggedItem) {
            this.classList.add('drag-over');
        }
    }
    function handleCategoryDragLeave(e) {
        this.classList.remove('drag-over');
    }
    function handleCategoryDrop(e) {
        e.stopPropagation();
        if (draggedItem !== this) {
            const sourceName = draggedItem.dataset.categoryName;
            const targetName = this.dataset.categoryName;

            const order = settings.groupByTags ? settings.tagOrder : settings.groupOrder;
            const sourceIndex = order.findIndex(t => t === sourceName);
            const targetIndex = order.findIndex(t => t === targetName);

            if (sourceIndex > -1 && targetIndex > -1) {
                const [removed] = order.splice(sourceIndex, 1);
                order.splice(targetIndex, 0, removed);
                saveSettings().then(renderAllPrompts);
            }
        }
        return false;
    }
    function handleCategoryDragEnd(e) {
        document.querySelectorAll('.prompt-category').forEach(item => {
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
            const promptTags = (promptData.tags || "").toLowerCase();

            const isVisible = promptName.includes(searchTerm) || promptText.includes(searchTerm) || promptTags.includes(searchTerm);
            wrapper.style.display = isVisible ? 'flex' : 'none';
        });
    }

    // --- MODAL POPULATORS & LOGIC ---
    function populateSettingsModal(form) {
        while (form.firstChild) form.removeChild(form.firstChild);

        const createAccordionSection = (title, id) => {
            const section = document.createElement('div');
            section.className = 'accordion-section';
            const header = document.createElement('div');
            header.className = 'accordion-header';
            header.textContent = title;
            const content = document.createElement('div');
            content.className = 'accordion-content';
            content.id = id;

            header.addEventListener('click', () => {
                header.classList.toggle('active');
                content.style.display = content.style.display === 'flex' ? 'none' : 'flex';
            });
            section.append(header, content);
            form.appendChild(section);
            return content;
        };

        const createSettingRow = (id, labelText, descriptionText, controlElement) => {
            const section = document.createElement('div');
            section.className = 'settings-section-grid';
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

        // UI/Interface Section
        const interfaceContent = createAccordionSection('Interface', 'settings-interface');
        const handleStyleSelector = document.createElement('select');
        handleStyleSelector.id = 'handle-style-select';
        [{v: 'classic', t: 'Classic (Small)'}, {v: 'edge', t: 'Edge (Full Height)'}].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.v;
            option.textContent = opt.t;
            handleStyleSelector.appendChild(option);
        });
        handleStyleSelector.value = settings.handleStyle;
        handleStyleSelector.addEventListener('change', (e) => { settings.handleStyle = e.target.value; saveSettings().then(applySettingsAndTheme); });
        interfaceContent.appendChild(createSettingRow('handle-style-select', 'Panel Handle Style', 'Choose the appearance of the panel handle.', handleStyleSelector));
        interfaceContent.appendChild(createSettingRow('condensed-mode-toggle', "Condensed GUI", "Reduces padding and margins for a compact view.",
            createToggle('condensed-mode-toggle', settings.condensedMode, (e) => {
                settings.condensedMode = e.target.checked;
                panel.classList.toggle('condensed', settings.condensedMode);
                saveSettings();
            })
        ));
        interfaceContent.appendChild(createSettingRow('group-by-tags-toggle', "Group Prompts by Tag", "Overrides category groups with groups for each tag.",
            createToggle('group-by-tags-toggle', settings.groupByTags, (e) => { settings.groupByTags = e.target.checked; saveSettings().then(renderAllPrompts); })
        ));
        interfaceContent.appendChild(createSettingRow('full-width-toggle', "Enable Full Width Chat", "Expands the chat area to fill the screen.",
            createToggle('full-width-toggle', settings.enableFullWidth, (e) => { settings.enableFullWidth = e.target.checked; toggleFullWidth(settings.enableFullWidth); saveSettings(); })
        ));
        interfaceContent.appendChild(createSettingRow('mini-mode-toggle', "Enable Floating Mini-Mode", "Show a quick-access icon in the chat input.",
            createToggle('mini-mode-toggle', settings.enableMiniMode, (e) => { settings.enableMiniMode = e.target.checked; saveSettings(); miniPanelTrigger.style.display = settings.enableMiniMode ? 'flex' : 'none'; })
        ));
        interfaceContent.appendChild(createSettingRow('copy-buttons-swap-toggle', "Swap 'Copy' Button Order", "Reverse the order of 'Copy Response' and 'Copy Code'.",
            createToggle('copy-buttons-swap-toggle', settings.copyButtonOrderSwapped, (e) => { settings.copyButtonOrderSwapped = e.target.checked; saveSettings(); renderActionButtons(); })
        ));
        interfaceContent.appendChild(createSettingRow('show-tags-toggle', "Show Prompt Tags", "Display tags underneath each prompt.",
            createToggle('show-tags-toggle', settings.showTags, (e) => { settings.showTags = e.target.checked; saveSettings().then(renderAllPrompts); })
        ));

        // Theme Section
        const themeContent = createAccordionSection('Theme', 'settings-theme');
        const fontSlider = document.createElement('input');
        fontSlider.type = 'range'; fontSlider.min = '12'; fontSlider.max = '20'; fontSlider.step = '0.5';
        fontSlider.value = parseFloat(settings.baseFontSize);
        fontSlider.addEventListener('input', (e) => {
            const newSize = e.target.value + 'px';
            settings.baseFontSize = newSize;
            document.documentElement.style.setProperty('--base-font-size', newSize);
        });
        fontSlider.addEventListener('change', saveSettings);
        themeContent.appendChild(createSettingRow('font-size-slider', 'Base Font Size', 'Adjust the font size for the entire panel.', fontSlider));

        const presetSelector = document.createElement('select');
        presetSelector.id = 'theme-preset-select';
        const presets = { 'custom': 'Custom', 'dark': 'Dark (Default)', 'light': 'Light', 'glass': 'Glass', 'hacker': 'Hacker Green' };
        for (const [key, value] of Object.entries(presets)) {
            const option = document.createElement('option'); option.value = key; option.textContent = value;
            presetSelector.appendChild(option);
        }
        presetSelector.value = settings.themeName;
        presetSelector.addEventListener('change', (e) => {
            const themeName = e.target.value;
            if (presetThemes[themeName]) {
                settings.colors = { ...presetThemes[themeName] };
                settings.themeName = themeName;
                applyTheme();
                saveSettings().then(() => populateSettingsModal(form));
            }
        });
        themeContent.appendChild(createSettingRow('theme-preset-select', 'Theme Preset', 'Select a base theme.', presetSelector));

        // Profiles Section
        const profilesContent = createAccordionSection('Profiles & Ordering', 'settings-profiles');
        const techProfileBtn = createButtonWithIcon('Activate Tech Profile', null);
        techProfileBtn.addEventListener('click', () => applyProfile(['tech', 'code', 'script', 'debug', 'system', 'developer']));
        const creativeProfileBtn = createButtonWithIcon('Activate Creative Profile', null);
        creativeProfileBtn.addEventListener('click', () => applyProfile(['creative', 'writing', 'art', 'design', 'story']));
        const profileBtnGroup = document.createElement('div');
        profileBtnGroup.className = 'button-group';
        profileBtnGroup.append(techProfileBtn, creativeProfileBtn);
        profilesContent.appendChild(createSettingRow('profiles', 'Preset Profiles', 'Quickly reorder groups for a specific task.', profileBtnGroup));

        const groupOrderLabel = document.createElement('h4');
        groupOrderLabel.textContent = 'Manual Group Order';
        groupOrderLabel.style.marginTop = '15px';
        profilesContent.appendChild(groupOrderLabel);
        const orderList = document.createElement('ul');
        orderList.id = 'group-order-list';
        renderGroupOrderList(orderList);
        profilesContent.appendChild(orderList);

        // AI Features Section
        const aiContent = createAccordionSection('AI Features', 'settings-ai');
        aiContent.appendChild(createSettingRow('auto-copy-code-toggle', "Auto copy code on completion", "Automatically copies the latest code block when Gemini finishes generating.",
            createToggle('auto-copy-code-toggle', settings.autoCopyCodeOnCompletion, (e) => { settings.autoCopyCodeOnCompletion = e.target.checked; saveSettings(); })
        ));
        aiContent.appendChild(createSettingRow('ai-enhancer-toggle', "Enable AI Prompt Enhancer", "Show the AI enhancement button on prompts.",
            createToggle('ai-enhancer-toggle', settings.enableAIenhancer, (e) => { settings.enableAIenhancer = e.target.checked; saveSettings().then(renderAllPrompts); })
        ));
        const apiKeyInput = document.createElement('input');
        apiKeyInput.type = 'password'; apiKeyInput.id = 'gemini-api-key-input'; apiKeyInput.placeholder = 'Enter your API key';
        apiKeyInput.value = settings.geminiAPIKey;
        apiKeyInput.addEventListener('change', (e) => { settings.geminiAPIKey = e.target.value; saveSettings(); });
        aiContent.appendChild(createSettingRow('gemini-api-key-input', 'Google AI API Key', 'Required for the AI Prompt Enhancer feature.', apiKeyInput));

        // Data Section
        const dataContent = createAccordionSection('Data & Sync', 'settings-data');
        const gistUrlInput = document.createElement('input');
        gistUrlInput.type = 'url'; gistUrlInput.id = 'gist-url-input'; gistUrlInput.placeholder = 'https://gist.github.com/...';
        gistUrlInput.value = settings.gistURL;
        gistUrlInput.addEventListener('change', (e) => { settings.gistURL = e.target.value; saveSettings(); });
        const syncBtn = createButtonWithIcon('Sync Now', icons.sync.cloneNode(true));
        syncBtn.addEventListener('click', () => syncFromGist(true).then(synced => { if(synced) loadAndDisplayPrompts(true); }));
        const gistContainer = document.createElement('div');
        gistContainer.className = 'input-with-button';
        gistContainer.append(gistUrlInput, syncBtn);
        dataContent.appendChild(createSettingRow('gist-url-input', 'GitHub Gist Sync URL', 'Sync prompts across browsers (replaces all local prompts).', gistContainer));
        const importExportButton = createButtonWithIcon('Local Import / Export', icons.importExport.cloneNode(true));
        importExportButton.classList.add('copy-btn');
        importExportButton.style.gridColumn = '1 / -1';
        importExportButton.addEventListener('click', () => showImportExportModal());
        dataContent.appendChild(importExportButton);
    }

    function renderGroupOrderList(listElement) {
        while (listElement.firstChild) listElement.removeChild(listElement.firstChild);
        (settings.groupOrder || []).forEach((groupName, index) => {
            const li = document.createElement('li');
            li.draggable = true;
            li.dataset.index = index;
            li.dataset.groupName = groupName;

            const handle = icons.dragHandle.cloneNode(true);
            const text = document.createTextNode(groupName);
            li.append(handle, text);

            li.addEventListener('dragstart', (e) => {
                draggedItem = e.target;
                setTimeout(() => e.target.classList.add('dragging'), 0);
            });
            li.addEventListener('dragover', (e) => {
                e.preventDefault();
                const target = e.target.closest('li');
                if (target && target !== draggedItem) {
                    target.classList.add('drag-over');
                }
            });
            li.addEventListener('dragleave', (e) => e.target.closest('li')?.classList.remove('drag-over'));
            li.addEventListener('drop', (e) => {
                e.preventDefault();
                const target = e.target.closest('li');
                if (target && target !== draggedItem) {
                    target.classList.remove('drag-over');
                    const fromIndex = parseInt(draggedItem.dataset.index);
                    const toIndex = parseInt(target.dataset.index);
                    const [removed] = settings.groupOrder.splice(fromIndex, 1);
                    settings.groupOrder.splice(toIndex, 0, removed);
                    saveSettings().then(() => {
                        renderGroupOrderList(listElement); // Re-render the D&D list
                        renderAllPrompts(); // Re-render the main panel
                    });
                }
            });
            li.addEventListener('dragend', () => {
                draggedItem?.classList.remove('dragging');
                draggedItem = null;
            });
            listElement.appendChild(li);
        });
    }

    function applyProfile(keywords) {
        const orderArray = settings.groupByTags ? settings.tagOrder : settings.groupOrder;
        const matchingItems = [];
        const otherItems = [];

        orderArray.forEach(item => {
            const lowerItem = item.toLowerCase();
            if (keywords.some(kw => lowerItem.includes(kw))) {
                matchingItems.push(item);
            } else {
                otherItems.push(item);
            }
        });

        const newOrder = [...matchingItems, ...otherItems];
        if (settings.groupByTags) {
            settings.tagOrder = newOrder;
        } else {
            settings.groupOrder = newOrder;
        }

        saveSettings().then(() => {
            renderAllPrompts();
            showToast('Profile activated!', 2000, 'success');
        });
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
        generalList.appendChild(createListItem('Total Categories', Object.keys(currentPrompts).filter(c => c !== "Favorites").length));
        const totalUsage = allPrompts.reduce((sum, p) => sum + (p.usageCount || 0), 0);
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
            (p.tags || "").split(',').forEach(tag => {
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
            .filter(([name]) => name !== "Favorites")
            .forEach(([name, prompts]) => categoryList.appendChild(createListItem(name, prompts.length)));
        grid.appendChild(categoryCard);

        body.appendChild(grid);
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
        (settings.groupOrder || []).forEach(cat => {
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
        categorySelect.addEventListener('change', () => {
            newCategoryInput.style.display = categorySelect.value === '__createnew__' ? 'block' : 'none';
        });
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
            categorySelect.value = categoryName || (settings.groupOrder || [])[0] || '__createnew__';
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
            if (!newPrompt.name || !newPrompt.text || !targetCategory) { showToast("Name, Text, and Group are required.", 2500, 'error'); return; }
            if (targetCategory === "Favorites") { showToast("Cannot add prompts directly to Favorites.", 2500, 'error'); return; }

            const isNewCategory = !currentPrompts[targetCategory];
            if (isNewCategory) {
                settings.groupOrder.push(targetCategory);
            }

            if (promptToEdit && categoryName && categoryName !== targetCategory) {
                currentPrompts[categoryName] = currentPrompts[categoryName].filter(p => p.id !== id);
                if (currentPrompts[categoryName].length === 0) {
                    delete currentPrompts[categoryName];
                    settings.groupOrder = settings.groupOrder.filter(g => g !== categoryName);
                }
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
                showToast(promptToEdit ? 'Prompt updated!' : 'Prompt added!', 2000, 'success');
                closeForm();
            });
        };
        promptFormModal.querySelector('#cancel-prompt-btn').onclick = closeForm;
        promptFormModal.querySelector('.modal-close-btn').onclick = closeForm;
        promptFormModal.addEventListener('click', e => { if (e.target === promptFormModal) closeForm(); });
        promptFormModal.style.display = 'flex';
        nameInput.focus();
    }

    function showImportExportModal() {
        importExportModal.style.display = 'flex';
        const closeBtn = importExportModal.querySelector('.modal-close-btn');
        const exportBtn = importExportModal.querySelector('.copy-btn');
        const urlInput = importExportModal.querySelector('input[type="url"]');
        const fetchBtn = importExportModal.querySelector('.input-with-button button');
        const importTextarea = importExportModal.querySelector('#import-textarea');
        const fileInput = importExportModal.querySelector('#import-file-input');
        const fileBtn = importExportModal.querySelector('.file-import-button');
        const importBtn = Array.from(importExportModal.querySelectorAll('button')).find(b => b.textContent.includes('Import'));

        const closeModal = () => { importExportModal.style.display = 'none'; lastFetchedUrl = null; };
        closeBtn.onclick = closeModal;
        importExportModal.addEventListener('click', e => { if (e.target === importExportModal) closeModal(); });

        exportBtn.onclick = () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentPrompts, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "gemini_prompts_export.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            showToast('Exporting prompts...', 2000, 'success');
        };

        fileBtn.onclick = () => fileInput.click();
        fileInput.onchange = (e) => {
            lastFetchedUrl = null;
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                importTextarea.value = event.target.result;
                showToast(`Loaded ${file.name}`);
            };
            reader.readAsText(file);
            fileInput.value = '';
        };

        fetchBtn.onclick = () => {
            const url = urlInput.value.trim();
            if (!url) { showToast("Please enter a URL.", 2000, 'error'); return; }
            fetchBtn.textContent = 'Fetching...';
            fetchBtn.disabled = true;
            GM_xmlhttpRequest({
                method: 'GET', url: url,
                onload: function(response) {
                    importTextarea.value = response.responseText;
                    lastFetchedUrl = url;
                    showToast('Fetched content from URL.', 2000, 'success');
                    fetchBtn.textContent = 'Fetch'; fetchBtn.disabled = false; urlInput.value = '';
                },
                onerror: function() {
                    lastFetchedUrl = null;
                    showToast('Failed to fetch from URL.', 3000, 'error');
                    fetchBtn.textContent = 'Fetch'; fetchBtn.disabled = false;
                }
            });
        };

        importBtn.onclick = () => {
            try {
                const importedData = JSON.parse(importTextarea.value);
                if (typeof importedData !== 'object' || importedData === null) { throw new Error('Invalid JSON format.'); }

                if (lastFetchedUrl) {
                    const filename = lastFetchedUrl.split('/').pop().split('?')[0];
                    let newGroupName = filename;
                    let counter = 1;
                    while(currentPrompts[newGroupName]) { newGroupName = `${filename} (${counter++})`; }
                    const allPrompts = Object.values(importedData).flat();
                    currentPrompts[newGroupName] = allPrompts;
                    if(!settings.groupOrder.includes(newGroupName)) { settings.groupOrder.push(newGroupName); }
                } else {
                    for (const category in importedData) {
                        if (currentPrompts[category]) {
                            currentPrompts[category].push(...importedData[category]);
                        } else {
                            currentPrompts[category] = importedData[category];
                            if (!settings.groupOrder.includes(category)) { settings.groupOrder.push(category); }
                        }
                    }
                }
                ensurePromptIDs(currentPrompts);
                Promise.all([savePrompts(), saveSettings()]).then(() => {
                    renderAllPrompts();
                    showToast('Prompts imported successfully!', 2000, 'success');
                    closeModal();
                });
            } catch (error) { showToast('Error importing: ' + error.message, 3000, 'error'); }
        };
    }

    async function showAIEnhancer(promptData) {
        if (!settings.geminiAPIKey) {
            showToast("Please set your Gemini API key in Settings.", 3000, 'error');
            return;
        }
        aiEnhancerModal.style.display = 'flex';
        const diffContainer = aiEnhancerModal.querySelector('.diff-container');
        const enhanceBtn = aiEnhancerModal.querySelector('.gemini-prompt-panel-button:first-of-type');
        const replaceBtn = aiEnhancerModal.querySelector('.gemini-prompt-panel-button:last-of-type');
        const closeBtn = aiEnhancerModal.querySelector('.modal-close-btn');

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
                showToast('AI enhancement failed: ' + error.message, 3000, 'error');
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
                    showToast('Prompt updated with AI enhancement!', 2000, 'success');
                    aiEnhancerModal.style.display = 'none';
                });
            }
        };

        closeBtn.onclick = () => aiEnhancerModal.style.display = 'none';
        aiEnhancerModal.addEventListener('click', e => { if (e.target === aiEnhancerModal) aiEnhancerModal.style.display = 'none'; });
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
                        showToast('Prompt restored!', 2000, 'success');
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
        const favoritePrompts = allPrompts.filter(p => p && p.id && settings.favorites.includes(p.id));

        if (favoritePrompts.length > 0) {
            container.appendChild(createCategory("Favorites", favoritePrompts, true, true));
        }
        (settings.groupOrder || []).forEach(categoryName => {
             const prompts = currentPrompts[categoryName];
             if (prompts) {
                 container.appendChild(createCategory(categoryName, prompts, true, true));
             }
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
        try {
            if (document.getElementById('gemini-prompt-panel-main')) return;
            await loadSettings();
            await loadHistory();
            applyStyles(); // Inject CSS from ui.js

            // Build UI elements using functions from ui.js
            promptFormModal = buildPromptFormModal();
            settingsModal = buildSettingsModal();
            importExportModal = buildImportExportModal();
            aiEnhancerModal = buildAIEnhancerModal();
            analyticsModal = buildAnalyticsModal();
            versionHistoryModal = buildVersionHistoryModal();
            toast = document.createElement('div'); toast.className = 'toast-notification';
            handle = document.createElement('div'); handle.className = 'panel-handle';
            panel = document.createElement('div'); panel.id = 'gemini-prompt-panel-main';
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
            const panelActionButtons = document.createElement('div'); panelActionButtons.className = 'button-group'; panelActionButtons.id = 'panel-action-buttons';
            const collapseBtn = createButtonWithIcon('Collapse All', null);
            const expandBtn = createButtonWithIcon('Expand All', null);
            panelActionButtons.append(collapseBtn, expandBtn);
            const promptGroup = document.createElement('div'); promptGroup.className = 'prompt-group-container';
            const cont = document.createElement('div'); cont.id = 'custom-prompts-container';
            navigator = document.createElement('div'); navigator.className = 'post-navigator';
            const navToTop = document.createElement('button'); navToTop.id = 'nav-to-top'; navToTop.title = 'Scroll to Top';
            const navUp = document.createElement('button'); navUp.id = 'nav-up'; navUp.title = 'Previous Post';
            const navDown = document.createElement('button'); navDown.id = 'nav-down'; navDown.title = 'Next Post';
            const navToBottom = document.createElement('button'); navToBottom.id = 'nav-to-bottom'; navToBottom.title = 'Scroll to Bottom';
            const mainNavArrow = document.createElement('button'); mainNavArrow.className = 'main-nav-arrow'; mainNavArrow.title = 'Toggle Panel';
            const mainNavIconContainer = document.createElement('div');
            
            // Append icons and assemble
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
            searchAddContainer.append(addBtn, searchInput, panelActionButtons);
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

            // --- Attach Event Listeners ---
            handle.addEventListener('mouseenter', () => { panel.classList.add('visible'); updateHandleHeight(); });
            handle.addEventListener('mouseleave', hidePanel);
            panel.addEventListener('mouseenter', () => panel.classList.add('visible'));
            panel.addEventListener('mouseleave', hidePanel);

            settingsBtn.addEventListener('click', () => {
                 const settingsForm = settingsModal.querySelector('.modal-body > form');
                 populateSettingsModal(settingsForm);
                 settingsModal.style.display = 'flex';
                 settingsModal.querySelector('.modal-close-btn').onclick = () => settingsModal.style.display = 'none';
                 settingsModal.addEventListener('click', e => { if (e.target === settingsModal) settingsModal.style.display = 'none'; });
            });

            analyticsBtn.addEventListener('click', () => {
                populateAnalytics();
                analyticsModal.style.display = 'flex';
                analyticsModal.querySelector('.modal-close-btn').onclick = () => analyticsModal.style.display = 'none';
                analyticsModal.addEventListener('click', e => { if (e.target === analyticsModal) analyticsModal.style.display = 'none'; });
            });
            arrowLeftBtn.addEventListener('click', () => { settings.position = 'left'; saveSettings(); applySettingsAndTheme(); });
            arrowRightBtn.addEventListener('click', () => { settings.position = 'right'; saveSettings(); applySettingsAndTheme(); });
            lockButton.addEventListener('click', () => { isManuallyLocked = !isManuallyLocked; updateLockIcon(); if (isManuallyLocked) panel.classList.add('visible'); });

            collapseBtn.addEventListener('click', () => {
                const allCategoryDivs = panel.querySelectorAll('.prompt-category');
                const allCategoryNames = Array.from(allCategoryDivs).map(div => div.dataset.categoryName);
                settings.collapsedCategories = [...new Set([...settings.collapsedCategories, ...allCategoryNames])];
                saveSettings().then(renderAllPrompts);
            });
            expandBtn.addEventListener('click', () => {
                settings.collapsedCategories = [];
                saveSettings().then(renderAllPrompts);
            });

            initializeCopyActions();
            initializePageObserver();

            searchInput.addEventListener('input', handleSearch);
            addBtn.addEventListener('click', () => showPromptForm(null, ''));
            navToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
            navToBottom.addEventListener('click', () => {
                const allResponses = document.querySelectorAll('response-container');
                if (allResponses.length > 0) {
                    allResponses[allResponses.length - 1].scrollIntoView({ behavior: 'smooth', block: 'end' });
                }
            });
            navUp.addEventListener('click', () => navigatePosts('up'));
            navDown.addEventListener('click', () => navigatePosts('down'));
            mainNavArrow.addEventListener('click', () => panel.classList.toggle('visible'));
            window.addEventListener('scroll', updateNavigator, { passive: true });
            window.addEventListener('resize', updateNavigator);
            hdr.addEventListener('mousedown', e => {
                if (e.target.closest('.panel-header-controls') || e.target.closest('.draggable-header')) return;
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
                await syncFromGist().then(synced => { if(!synced) loadAndDisplayPrompts(); else loadAndDisplayPrompts(true); }).catch(() => loadAndDisplayPrompts());
            } else {
                await loadAndDisplayPrompts();
            }
            applySettingsAndTheme();
            updateNavigator();
        } catch (error) {
            console.error("FATAL ERROR during panel creation:", error);
            alert("Gemini Prompt Panel failed to load. Check the browser console (F12) for a 'FATAL ERROR' message and report it.");
        }
    }

    // --- ACTIONS & CLIPBOARD ---
    function initializeCopyActions() {
        copyResponseButton.addEventListener('click', async () => {
            const allResponses = document.querySelectorAll('response-container');
            if (allResponses.length > 0) {
                const latestResponse = allResponses[allResponses.length - 1];
                const textContainer = latestResponse.querySelector('div.markdown.prose');
                if (textContainer && navigator.clipboard) {
                    try {
                        await navigator.clipboard.writeText(textContainer.textContent);
                        showToast('Latest response copied!', 2000, 'success');
                    } catch (err) {
                        console.error('Failed to copy text: ', err);
                        showToast('Could not copy response.', 2000, 'error');
                    }
                } else {
                    showToast('Response content or clipboard not available.', 2000, 'error');
                }
            } else {
                showToast('No response found to copy.', 2000, 'error');
            }
        });

        copyCodeButton.addEventListener('click', () => {
            const allCodeBlocks = document.querySelectorAll('code-block');
            if (allCodeBlocks.length > 0) {
                const latestCodeBlock = allCodeBlocks[allCodeBlocks.length - 1];
                const copyBtn = latestCodeBlock.querySelector('button[aria-label="Copy code"]');
                if (copyBtn) {
                    copyBtn.click();
                    showToast('Code block copied!', 2000, 'success');
                } else {
                    showToast('Copy button not found in the latest code block.', 2000, 'error');
                }
            } else {
                showToast('No code block found to copy.', 2000, 'error');
            }
        });
    }

    function initializePageObserver() {
        const pageObserver = new MutationObserver((mutationsList, observer) => {
            const chatContainer = document.querySelector('main .chat-history, main');
            if (chatContainer) {
                observer.disconnect();
                initializeGenerationObserver();
                updateNavigator();
            }
        });
        pageObserver.observe(document.body, { childList: true, subtree: true });
    }

    function initializeGenerationObserver() {
        const setupObserver = () => {
            const sendButton = document.querySelector('button.send-button');
            if (sendButton) {
                if(generationObserver) generationObserver.disconnect();
                generationObserver = new MutationObserver(mutations => {
                    if (!settings.autoCopyCodeOnCompletion) return;
                    mutations.forEach(mutation => {
                        if (mutation.attributeName === 'class') {
                            const target = mutation.target;
                            const hasStopClass = target.classList.contains('stop');
                            if (hasStopClass) {
                                isGenerating = true;
                            } else if (isGenerating) {
                                isGenerating = false;
                                setTimeout(() => {
                                    const allCodeBlocks = document.querySelectorAll('code-block');
                                    if (allCodeBlocks.length > 0) {
                                        const latestCodeBlock = allCodeBlocks[allCodeBlocks.length - 1];
                                        const copyBtn = latestCodeBlock.querySelector('button[aria-label="Copy code"]');
                                        if (copyBtn) {
                                            copyBtn.click();
                                            showCountdownToast("Auto-copied Code to Clipboard", 5000);
                                        }
                                    }
                                }, 500);
                            }
                        }
                    });
                });
                generationObserver.observe(sendButton, { attributes: true, attributeFilter: ['class'] });
            }
        };
        const sendButtonObserver = new MutationObserver((mutations, observer) => {
            if (document.querySelector('button.send-button')) {
                setupObserver();
                observer.disconnect();
            }
        });
        sendButtonObserver.observe(document.body, { childList: true, subtree: true });
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
                    const sendButton = document.querySelector('button.send-button, button[data-testid="send-button"]');
                    if (sendButton && !sendButton.disabled) sendButton.click();
                }, 150);
            }
        } else { showToast('Error: Prompt input not found.', 3000, 'error'); }
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
            }
        }, 500);
    }
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})();