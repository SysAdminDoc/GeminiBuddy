// /src/features/prompts.js

import { state, saveSettings, saveHistory, addHistoryEntry } from '../state.js';
import { GM_PROMPTS_KEY, GM_SETTINGS_KEY } from '../config.js';
import { GM_getValue, GM_setValue } from '../GM_wrappers.js';
import { icons } from '../icons.js';
import { showToast, capitalizeFirstLetter } from '../utils.js';
import { handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEnd, handleCategoryDragStart, handleCategoryDragOver, handleCategoryDragLeave, handleCategoryDrop, handleCategoryDragEnd } from './dragDrop.js';
import { fetchDefaultPrompts } from './api.js';
import { updateHandleHeight, sendPromptToGemini, renderMiniPanel } from '../ui/mainPanel.js';
import { showPromptForm, showVersionHistory, showAIEnhancer } from '../ui/modals.js';

export function savePrompts() {
    GM_setValue(GM_PROMPTS_KEY, JSON.stringify(state.currentPrompts));
}

export function ensurePromptIDs(prompts) {
    Object.values(prompts).flat().forEach((p, i) => {
        p.id = p.id || `prompt-${Date.now()}-${i}`;
    });
}

export async function loadAndDisplayPrompts(isSync = false) {
    if (!isSync) {
        let raw = await GM_getValue(GM_PROMPTS_KEY);
        try {
            let loadedPrompts = JSON.parse(raw);
            if (typeof loadedPrompts === 'object' && loadedPrompts !== null && Object.keys(loadedPrompts).length > 0) {
                state.currentPrompts = loadedPrompts;
            } else { throw new Error("No prompts stored, checking for first run."); }
        } catch (e) {
            console.log(e.message);
            state.currentPrompts = {};
            if (confirm("Welcome to the Gemini Prompt Panel! Would you like to import the default list of prompts to get started?")) {
                await fetchDefaultPrompts();
            }
        }
    }
    ensurePromptIDs(state.currentPrompts);

    const currentGroups = Object.keys(state.currentPrompts).filter(c => c !== "Favorites");
    const orderedGroups = (state.settings.groupOrder || []).filter(g => currentGroups.includes(g));
    const newGroups = currentGroups.filter(g => !orderedGroups.includes(g));
    state.settings.groupOrder = [...orderedGroups, ...newGroups];

    if (!state.settings.initiallyCollapsed) {
        state.settings.collapsedCategories = [...Object.keys(state.currentPrompts), "Favorites"];
        state.settings.initiallyCollapsed = true;
    }
    await GM_setValue(GM_SETTINGS_KEY, state.settings); // Save without toast
    renderAllPrompts();
    renderMiniPanel();
}

export function renderAllPrompts() {
    const container = state.panel.querySelector('#custom-prompts-container');
    while (container.firstChild) container.removeChild(container.firstChild);

    const allPrompts = Object.values(state.currentPrompts).flat();
    const favoritePrompts = allPrompts.filter(p => p && p.id && state.settings.favorites.includes(p.id));

    if (favoritePrompts.length > 0) {
        const favCategoryDiv = createCategory("Favorites", favoritePrompts, true);
        favCategoryDiv.id = 'favorites-category';
        container.appendChild(favCategoryDiv);
    }

    if (state.settings.groupByTags) {
        const promptsForTagging = allPrompts.filter(p => p && p.id && !state.settings.favorites.includes(p.id));
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
        const orderedTags = (state.settings.tagOrder || []).filter(t => allTagNames.includes(t));
        const newTags = allTagNames.filter(t => !orderedTags.includes(t)).sort((a, b) => a.localeCompare(b));
        state.settings.tagOrder = [...orderedTags, ...newTags];

        state.settings.tagOrder.forEach(tagName => {
            const promptsInTag = promptsByTag[tagName];
            if (promptsInTag && promptsInTag.length > 0) {
                const sortedPrompts = [...promptsInTag].sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
                const categoryDiv = createCategory(tagName, sortedPrompts, true);
                container.appendChild(categoryDiv);
            }
        });
    } else {
        (state.settings.groupOrder || []).forEach(categoryName => {
            const prompts = state.currentPrompts[categoryName];
            if (prompts && prompts.length > 0) {
                const nonFavoritePrompts = prompts.filter(p => !state.settings.favorites.includes(p.id));
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

export function createCategory(categoryName, prompts, isCollapsible, isMini = false) {
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'prompt-category';
    categoryDiv.dataset.categoryName = categoryName;

    if (state.settings.collapsedCategories.includes(categoryName)) {
        categoryDiv.classList.add('collapsed');
    }

    const header = document.createElement('div');
    header.className = 'prompt-category-header';

    const customColor = state.settings.groupColors[categoryName];
    if (customColor) {
        header.style.backgroundColor = customColor;
    }

    const titleSpan = document.createElement('span');
    titleSpan.className = 'category-header-title';
    titleSpan.textContent = categoryName;

    const controls = document.createElement('div');
    controls.className = 'category-header-controls';

    const isRealCategory = state.settings.groupOrder.includes(categoryName);

    if ((state.settings.groupByTags && categoryName !== 'Favorites') || (!state.settings.groupByTags && categoryName !== 'Favorites' && isRealCategory)) {
        header.classList.add('draggable-header');
        categoryDiv.draggable = true;
        categoryDiv.addEventListener('dragstart', handleCategoryDragStart);
        categoryDiv.addEventListener('dragover', handleCategoryDragOver);
        categoryDiv.addEventListener('dragleave', handleCategoryDragLeave);
        categoryDiv.addEventListener('drop', handleCategoryDrop);
        categoryDiv.addEventListener('dragend', handleCategoryDragEnd);
    }

    if (!isMini && categoryName !== "Favorites" && isRealCategory && !state.settings.groupByTags) {
        const editBtn = document.createElement('button');
        editBtn.title = "Rename Group";
        editBtn.appendChild(icons.edit.cloneNode(true));
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newName = prompt("Enter new name for the group:", categoryName);
            if (newName && newName.trim() !== "" && newName !== categoryName) {
                if (state.currentPrompts[newName]) {
                    showToast("A group with this name already exists.", 3000, 'error');
                    return;
                }
                state.currentPrompts[newName] = state.currentPrompts[categoryName];
                delete state.currentPrompts[categoryName];
                if (state.settings.groupColors[categoryName]) {
                    state.settings.groupColors[newName] = state.settings.groupColors[categoryName];
                    delete state.settings.groupColors[categoryName];
                }
                const groupIndex = state.settings.groupOrder.indexOf(categoryName);
                if (groupIndex > -1) {
                    state.settings.groupOrder.splice(groupIndex, 1, newName);
                }
                Promise.all([savePrompts(), saveSettings()]).then(renderAllPrompts);
            }
        });
        controls.append(editBtn);
    }

    if (isCollapsible) {
        const icon = icons.chevronDown.cloneNode(true);
        icon.classList.add('category-toggle-icon');
        controls.appendChild(icon);
        header.addEventListener('click', (e) => {
            if (e.target.closest('.category-header-controls')) return;
            categoryDiv.classList.toggle('collapsed');
            if (!isMini) {
                const isCollapsed = categoryDiv.classList.contains('collapsed');
                const categoryId = categoryDiv.dataset.categoryName;
                if (isCollapsed) {
                    if (!state.settings.collapsedCategories.includes(categoryId)) {
                        state.settings.collapsedCategories.push(categoryId);
                    }
                } else {
                    state.settings.collapsedCategories = state.settings.collapsedCategories.filter(c => c !== categoryId);
                }
                GM_setValue(GM_SETTINGS_KEY, state.settings); // Save without toast
                updateHandleHeight();
            }
        });
    }

    header.append(titleSpan, controls);
    const content = document.createElement('div');
    content.className = 'prompt-category-content';
    if (prompts && Array.isArray(prompts)) {
        prompts.forEach(p => addPromptButtonToPanel(p, content, categoryName, isMini));
    }
    categoryDiv.append(header, content);
    return categoryDiv;
}

export function addPromptButtonToPanel(promptData, container, categoryName, isMini = false) {
    const wrapper = document.createElement('div');
    wrapper.className = 'prompt-button-wrapper';
    wrapper.dataset.promptId = promptData.id;

    const btn = document.createElement('div');
    btn.className = 'prompt-button';

    if (isMini) {
        btn.addEventListener('click', () => {
            sendPromptToGemini(promptData, promptData.autoSend);
            state.floatingMiniPanel.classList.remove('visible');
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

        if (state.settings.enableAIenhancer) {
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
        if (isPinned) pinBtn.classList.add('pinned');
        pinBtn.addEventListener('click', () => { promptData.pinned = !promptData.pinned; savePrompts().then(renderAllPrompts); });
        const favoriteBtn = document.createElement('button');
        favoriteBtn.title = "Favorite"; favoriteBtn.classList.add('favorite-btn');
        const isFavorited = state.settings.favorites.includes(promptData.id);
        favoriteBtn.appendChild((isFavorited ? icons.star : icons.starOutline).cloneNode(true));
        if (isFavorited) favoriteBtn.classList.add('favorited');
        favoriteBtn.addEventListener('click', () => {
            if (state.settings.favorites.includes(promptData.id)) {
                state.settings.favorites = state.settings.favorites.filter(id => id !== promptData.id);
            } else {
                state.settings.favorites.push(promptData.id);
            }
            GM_setValue(GM_SETTINGS_KEY, state.settings).then(renderAllPrompts);
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
                Object.keys(state.currentPrompts).forEach(catName => {
                    state.currentPrompts[catName] = state.currentPrompts[catName].filter(p => p.id !== promptData.id);
                    if (state.currentPrompts[catName].length === 0 && catName !== "Favorites") {
                        delete state.currentPrompts[catName];
                        state.settings.groupOrder = state.settings.groupOrder.filter(g => g !== catName);
                    }
                });
                delete state.promptHistory[promptData.id];
                state.settings.favorites = state.settings.favorites.filter(id => id !== promptData.id);
                Promise.all([savePrompts(), GM_setValue(GM_SETTINGS_KEY, state.settings), saveHistory()]).then(() => {
                    renderAllPrompts();
                    showToast('Prompt deleted.');
                });
            }
        });
        controls.append(pinBtn, favoriteBtn, editBtn, deleteBtn);
        btn.appendChild(controls);
    }

    wrapper.appendChild(btn);

    if (!isMini && state.settings.showTags && promptData.tags) {
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'prompt-tags-container';
        (promptData.tags || "").split(',').forEach(tag => {
            if (tag.trim()) {
                const tagEl = document.createElement('span');
                tagEl.className = 'prompt-tag';
                tagEl.textContent = tag.trim();
                tagsContainer.appendChild(tagEl);
            }
        });
        if (tagsContainer.hasChildNodes()) wrapper.appendChild(tagsContainer);
    }

    container.appendChild(wrapper);
}

export function findPromptCategory(promptId) {
    for (const cat in state.currentPrompts) {
        if (state.currentPrompts[cat].some(p => p.id === promptId)) {
            return cat;
        }
    }
    return null;
}

export function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const isMini = e.target.closest('#floating-mini-panel');
    const container = isMini ? state.floatingMiniPanel : state.panel;

    container.querySelectorAll('.prompt-button-wrapper').forEach(wrapper => {
        const promptId = wrapper.dataset.promptId;
        const promptCategory = findPromptCategory(promptId);
        if (!promptCategory) return;

        const promptData = state.currentPrompts[promptCategory].find(p => p.id === promptId);
        if (!promptData) return;

        const promptName = promptData.name.toLowerCase();
        const promptText = promptData.text.toLowerCase();
        const promptTags = (promptData.tags || "").toLowerCase();

        const isVisible = promptName.includes(searchTerm) || promptText.includes(searchTerm) || promptTags.includes(searchTerm);
        wrapper.style.display = isVisible ? 'flex' : 'none';
    });
}