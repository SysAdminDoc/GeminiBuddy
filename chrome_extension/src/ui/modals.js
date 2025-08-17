// /src/ui/modals.js

import { state, saveSettings, addHistoryEntry } from '../state.js';
import { icons } from '../icons.js';
import { createButtonWithIcon, showToast } from '../utils.js';
import { ensurePromptIDs, renderAllPrompts, savePrompts } from '../features/prompts.js';
import { updateLockIcon } from './mainPanel.js';
import { callGeminiAPI } from '../features/api.js';
import { GM_xmlhttpRequest } from '../GM_wrappers.js';
import { GM_SETTINGS_KEY } from '../config.js';

export function buildAnalyticsModal() {
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

export function populateAnalytics() {
    const body = state.analyticsModal.querySelector('#analytics-body');
    while (body.firstChild) body.removeChild(body.firstChild);

    const allPrompts = Object.values(state.currentPrompts).flat();

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
    generalList.appendChild(createListItem('Total Categories', Object.keys(state.currentPrompts).filter(c => c !== "Favorites").length));
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
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .forEach(([tag, count]) => tagsList.appendChild(createListItem(tag, count)));
    grid.appendChild(tagsCard);

    const { card: categoryCard, ul: categoryList } = createCard('Category Distribution');
    Object.entries(state.currentPrompts)
        .filter(([name]) => name !== "Favorites")
        .forEach(([name, prompts]) => categoryList.appendChild(createListItem(name, prompts.length)));
    grid.appendChild(categoryCard);

    body.appendChild(grid);
}

export function buildVersionHistoryModal() {
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

export function showVersionHistory(promptData) {
    state.versionHistoryModal.style.display = 'flex';
    const title = state.versionHistoryModal.querySelector('#history-modal-title');
    title.textContent = `History for "${promptData.name}"`;
    const list = state.versionHistoryModal.querySelector('#history-list');
    while (list.firstChild) list.removeChild(list.firstChild);

    const history = state.promptHistory[promptData.id] || [];
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
                    state.versionHistoryModal.style.display = 'none';
                    showToast('Prompt restored!', 2000, 'success');
                });
            }
        });
        li.append(dateSpan, textSpan, restoreBtn);
        list.appendChild(li);
    });
}

export function buildPromptFormModal() {
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

export function showPromptForm(promptToEdit = null, categoryName = '') {
    state.isFormActiveLock = true; updateLockIcon();
    const form = state.promptFormModal.querySelector('#prompt-form');
    form.reset();
    const title = state.promptFormModal.querySelector('#prompt-form-title');
    const idInput = state.promptFormModal.querySelector('#prompt-id-input');
    const nameInput = state.promptFormModal.querySelector('#prompt-name-input');
    const textInput = state.promptFormModal.querySelector('#prompt-text-input');
    const tagsInput = state.promptFormModal.querySelector('#prompt-tags-input');
    const categorySelect = state.promptFormModal.querySelector('#prompt-category-select');
    const newCategoryInput = state.promptFormModal.querySelector('#prompt-new-category-input');
    const autoSendInput = state.promptFormModal.querySelector('#prompt-autosend-checkbox');
    const favoriteInput = state.promptFormModal.querySelector('#prompt-favorite-checkbox');
    const pinInput = state.promptFormModal.querySelector('#prompt-pin-checkbox');
    while (categorySelect.firstChild) categorySelect.removeChild(categorySelect.firstChild);
    (state.settings.groupOrder || []).forEach(cat => {
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
        favoriteInput.checked = state.settings.favorites.includes(promptToEdit.id);
        pinInput.checked = promptToEdit.pinned;
    } else {
        title.textContent = 'Add New Prompt';
        idInput.value = '';
        categorySelect.value = categoryName || (state.settings.groupOrder || [])[0] || '__createnew__';
        if (categorySelect.value === '__createnew__') newCategoryInput.style.display = 'block';
        favoriteInput.checked = false;
        pinInput.checked = false;
    }
    const closeForm = () => { state.promptFormModal.style.display = 'none'; state.isFormActiveLock = false; updateLockIcon(); };
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

        const isNewCategory = !state.currentPrompts[targetCategory];
        if (isNewCategory) {
            state.settings.groupOrder.push(targetCategory);
        }

        if (promptToEdit && categoryName && categoryName !== targetCategory) {
            state.currentPrompts[categoryName] = state.currentPrompts[categoryName].filter(p => p.id !== id);
            if (state.currentPrompts[categoryName].length === 0) {
                delete state.currentPrompts[categoryName];
                state.settings.groupOrder = state.settings.groupOrder.filter(g => g !== categoryName);
            }
        }
        if (!state.currentPrompts[targetCategory]) state.currentPrompts[targetCategory] = [];
        const existingPromptIndex = state.currentPrompts[targetCategory].findIndex(p => p.id === id);
        if (existingPromptIndex > -1) {
            state.currentPrompts[targetCategory][existingPromptIndex] = newPrompt;
        } else {
            state.currentPrompts[targetCategory].push(newPrompt);
        }
        const isFavorited = favoriteInput.checked;
        const wasFavorited = state.settings.favorites.includes(id);
        if (isFavorited && !wasFavorited) state.settings.favorites.push(id);
        if (!isFavorited && wasFavorited) state.settings.favorites = state.settings.favorites.filter(favId => favId !== id);
        Promise.all([savePrompts(), saveSettings()]).then(() => {
            renderAllPrompts();
            showToast(promptToEdit ? 'Prompt updated!' : 'Prompt added!', 2000, 'success');
            closeForm();
        });
    };
    state.promptFormModal.querySelector('#cancel-prompt-btn').onclick = closeForm;
    state.promptFormModal.querySelector('.modal-close-btn').onclick = closeForm;
    state.promptFormModal.addEventListener('click', e => { if (e.target === state.promptFormModal) closeForm(); });
    state.promptFormModal.style.display = 'flex';
    nameInput.focus();
}

export function buildImportExportModal() {
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
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        state.lastFetchedUrl = null;
    });
    modalHeader.append(title, closeBtn);

    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';

    const exportSection = document.createElement('div');
    exportSection.className = 'form-section';
    const exportLabel = document.createElement('label');
    exportLabel.textContent = 'Export Prompts';
    const exportBtn = createButtonWithIcon('Export to JSON File', icons.importExport.cloneNode(true));
    exportBtn.classList.add('copy-btn');
    exportBtn.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.currentPrompts, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "gemini_prompts_export.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        showToast('Exporting prompts...', 2000, 'success');
    });
    exportSection.append(exportLabel, exportBtn);

    const urlSection = document.createElement('div');
    urlSection.className = 'form-section';
    const urlLabel = document.createElement('label');
    urlLabel.textContent = 'Import from URL';
    const urlInputContainer = document.createElement('div');
    urlInputContainer.className = 'input-with-button';
    const urlInput = document.createElement('input');
    urlInput.type = 'url';
    urlInput.placeholder = 'Paste URL to raw .json file...';
    const fetchBtn = createButtonWithIcon('Fetch', icons.webLink.cloneNode(true));
    urlInputContainer.append(urlInput, fetchBtn);
    urlSection.append(urlLabel, urlInputContainer);

    const importSection = document.createElement('div');
    importSection.className = 'form-section';
    const importLabel = document.createElement('label');
    importLabel.htmlFor = 'import-textarea';
    importLabel.textContent = 'Import from File or Paste JSON';
    const importTextarea = document.createElement('textarea');
    importTextarea.id = 'import-textarea';
    importTextarea.placeholder = '...or paste your exported JSON here.';
    importTextarea.style.minHeight = '100px';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'import-file-input';
    fileInput.accept = '.json,application/json';
    const fileBtn = createButtonWithIcon('Select JSON File', icons.uploadFile.cloneNode(true));
    fileBtn.classList.add('file-import-button');
    fileBtn.type = 'button';
    const importBtn = createButtonWithIcon('Import and Merge', null);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'button-group';
    btnGroup.append(fileBtn, importBtn);
    importSection.append(importLabel, importTextarea, fileInput, btnGroup);

    fileBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        state.lastFetchedUrl = null;
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            importTextarea.value = event.target.result;
            showToast(`Loaded ${file.name}`);
        };
        reader.readAsText(file);
        fileInput.value = '';
    });
    fetchBtn.addEventListener('click', () => {
        const url = urlInput.value.trim();
        if (!url) {
            showToast("Please enter a URL.", 2000, 'error');
            return;
        }
        fetchBtn.textContent = 'Fetching...';
        fetchBtn.disabled = true;
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: function(response) {
                importTextarea.value = response.responseText;
                state.lastFetchedUrl = url;
                showToast('Fetched content from URL.', 2000, 'success');
                fetchBtn.textContent = 'Fetch';
                fetchBtn.disabled = false;
                urlInput.value = '';
            },
            onerror: function() {
                state.lastFetchedUrl = null;
                showToast('Failed to fetch from URL.', 3000, 'error');
                fetchBtn.textContent = 'Fetch';
                fetchBtn.disabled = false;
            }
        });
    });

    importBtn.addEventListener('click', () => {
        try {
            const importedData = JSON.parse(importTextarea.value);
            if (typeof importedData !== 'object' || importedData === null) {
                throw new Error('Invalid JSON format.');
            }

            if (state.lastFetchedUrl) {
                const filename = state.lastFetchedUrl.split('/').pop().split('?')[0];
                let newGroupName = filename;
                let counter = 1;
                while (state.currentPrompts[newGroupName]) {
                    newGroupName = `${filename} (${counter++})`;
                }
                const allPrompts = Object.values(importedData).flat();
                state.currentPrompts[newGroupName] = allPrompts;
                if (!state.settings.groupOrder.includes(newGroupName)) {
                    state.settings.groupOrder.push(newGroupName);
                }
            } else {
                for (const category in importedData) {
                    if (state.currentPrompts[category]) {
                        state.currentPrompts[category].push(...importedData[category]);
                    } else {
                        state.currentPrompts[category] = importedData[category];
                        if (!state.settings.groupOrder.includes(category)) {
                            state.settings.groupOrder.push(category);
                        }
                    }
                }
            }

            ensurePromptIDs(state.currentPrompts);
            Promise.all([savePrompts(), saveSettings()]).then(() => {
                renderAllPrompts();
                showToast('Prompts imported successfully!', 2000, 'success');
                modal.style.display = 'none';
                state.lastFetchedUrl = null;
            });
        } catch (error) {
            showToast('Error importing: ' + error.message, 3000, 'error');
        }
    });

    modalBody.append(exportSection, urlSection, importSection);
    modalContent.append(modalHeader, modalBody);
    modal.appendChild(modalContent);
    modal.addEventListener('click', e => { if (e.target === modal) { modal.style.display = 'none'; state.lastFetchedUrl = null; } });
    return modal;
}

export function showImportExportModal() {
    state.importExportModal.style.display = 'flex';
}

export function buildAIEnhancerModal() {
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

export async function showAIEnhancer(promptData) {
    if (!state.settings.geminiAPIKey) {
        showToast("Please set your Gemini API key in Settings.", 3000, 'error');
        return;
    }
    state.aiEnhancerModal.style.display = 'flex';
    const diffContainer = state.aiEnhancerModal.querySelector('.diff-container');
    const enhanceBtn = state.aiEnhancerModal.querySelector('.gemini-prompt-panel-button:first-of-type');
    const replaceBtn = state.aiEnhancerModal.querySelector('.gemini-prompt-panel-button:last-of-type');

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
                state.aiEnhancerModal.style.display = 'none';
            });
        }
    };
}