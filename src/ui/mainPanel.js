// /src/ui/mainPanel.js

import { state, loadSettings, loadHistory, saveSettings } from '../state.js';
import { icons } from '../icons.js';
import { GM_SETTINGS_KEY, presetThemes } from '../config.js';
import { createButtonWithIcon, showCountdownToast, showToast } from '../utils.js';
import { handleGlobalCanvasDownload } from '../features/canvasDownload.js';
import { loadAndDisplayPrompts, renderAllPrompts, createCategory, handleSearch, savePrompts } from '../features/prompts.js';
import { syncFromGist } from '../features/api.js';
import { buildSettingsUI } from './settingsUI.js';
import { buildPromptFormModal, buildImportExportModal, buildAIEnhancerModal, buildAnalyticsModal, buildVersionHistoryModal, showPromptForm } from './modals.js';

function applyTheme() {
    for (const [key, value] of Object.entries(state.settings.colors)) {
        document.documentElement.style.setProperty(key, value);
    }
    document.documentElement.style.setProperty('--panel-font', state.settings.fontFamily);
    document.documentElement.style.setProperty('--base-font-size', state.settings.baseFontSize);
    state.panel.classList.toggle('glass-theme', state.settings.themeName === 'glass');
    state.panel.classList.toggle('condensed', state.settings.condensedMode);
}

export function hidePanel() {
    if (!state.isManuallyLocked && !state.isFormActiveLock && !state.panel.classList.contains('is-resizing')) {
        state.panel.classList.remove('visible');
    }
}

export function updateLockIcon() {
    if (state.lockButton) {
        while (state.lockButton.firstChild) state.lockButton.removeChild(state.lockButton.firstChild);
        state.lockButton.appendChild(((state.isManuallyLocked || state.isFormActiveLock) ? icons.locked : icons.unlocked).cloneNode(true));
    }
}

export function applySettingsAndTheme() {
    applyTheme();
    const wasLockedAndVisible = state.panel.classList.contains('visible') && state.isManuallyLocked;
    state.panel.className = 'gemini-prompt-panel';
    if (state.settings.themeName === 'glass') state.panel.classList.add('glass-theme');
    if (state.settings.condensedMode) state.panel.classList.add('condensed');
    if (wasLockedAndVisible) state.panel.classList.add('visible');
    const p = state.settings.position;
    state.panel.classList.add(p === 'left' ? 'left-side' : 'right-side');
    state.handle.classList.toggle('right-side-handle', p === 'right');
    state.handle.classList.toggle('edge', state.settings.handleStyle === 'edge');
    state.resizeHandle.className = `gemini-resize-handle ${state.settings.position === 'right' ? 'left-handle' : 'right-handle'}`;
    state.navigator.style.top = state.settings.topOffset;
    state.panel.style.setProperty('--panel-width', `${state.settings.panelWidth}px`);
    state.panel.style.setProperty('--handle-width', `${state.settings.handleWidth}px`);
    state.handle.style.width = `${state.settings.handleWidth}px`;
    state.panel.style.setProperty('--panel-top', state.settings.topOffset);
    state.handle.style.top = state.settings.topOffset;
    updateHeaderLayout();
    renderActionButtons();
    updateNavigator();
    updateHandleHeight();
    renderAllPrompts();
}

export function updateHeaderLayout() {
    while (state.leftHeaderControls.firstChild) state.leftHeaderControls.removeChild(state.leftHeaderControls.firstChild);
    while (state.rightHeaderControls.firstChild) state.rightHeaderControls.removeChild(state.rightHeaderControls.firstChild);
    if (state.settings.position === 'left') {
        state.rightHeaderControls.append(state.lockButton, state.arrowRightBtn);
    } else {
        state.leftHeaderControls.append(state.arrowLeftBtn, state.lockButton);
    }
}

export function renderActionButtons() {
    while (state.actionGroup.firstChild) state.actionGroup.removeChild(state.actionGroup.firstChild);
    let isCodeFirst = (state.settings.position === 'right');
    if (state.settings.copyButtonOrderSwapped) isCodeFirst = !isCodeFirst;
    if (isCodeFirst) {
        state.actionGroup.append(state.copyCodeButton, state.copyResponseButton);
    } else {
        state.actionGroup.append(state.copyResponseButton, state.copyCodeButton);
    }
    state.actionGroup.appendChild(state.downloadCanvasButton);
}

export function updateHandleHeight() {
    if (!state.panel || !state.handle || state.settings.handleStyle === 'edge') return;
    setTimeout(() => {
        const panelHeight = state.panel.offsetHeight;
        if (panelHeight > 0) state.handle.style.height = `${panelHeight}px`;
    }, 100);
}

export function updateNavigator() {
    if (!state.navigator) return;
    const posts = Array.from(document.querySelectorAll('response-container, rich-content-renderer'));
    const scrollY = window.scrollY;
    const pageHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    const canScrollUp = scrollY > 50;
    const canScrollDown = scrollY < pageHeight - viewportHeight - 50;
    state.navigator.querySelector('#nav-to-top').classList.toggle('visible', canScrollUp);
    state.navigator.querySelector('#nav-to-bottom').classList.toggle('visible', canScrollDown);
    const upPost = posts.slice().reverse().find(p => p.offsetTop < scrollY - 50);
    const downPost = posts.find(p => p.offsetTop > scrollY + viewportHeight / 2);
    state.navigator.querySelector('#nav-up').classList.toggle('visible', !!upPost);
    state.navigator.querySelector('#nav-down').classList.toggle('visible', !!downPost);
    const mainNavArrow = state.navigator.querySelector('.main-nav-arrow');
    const mainNavIcon = mainNavArrow.firstChild;
    while (mainNavIcon.firstChild) mainNavIcon.removeChild(mainNavIcon.firstChild);
    mainNavIcon.appendChild(state.settings.position === 'left' ? icons.navInwardRight.cloneNode(true) : icons.navInwardLeft.cloneNode(true));
    mainNavArrow.classList.toggle('visible', posts.length > 0);
}

export function navigatePosts(direction) {
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

export function sendPromptToGemini(promptData, autoSend = false) {
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

export function initResizeFunctionality() {
    let startX, startWidth;
    const onMouseMove = (e) => {
        const newWidth = startWidth + (state.settings.position === 'left' ? e.clientX - startX : startX - e.clientX);
        if (newWidth > 240 && newWidth < 800) {
            state.settings.panelWidth = newWidth;
            state.panel.style.setProperty('--panel-width', `${newWidth}px`);
        }
    };
    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        state.panel.classList.remove('is-resizing'); document.body.style.cursor = 'default';
        saveSettings();
        applySettingsAndTheme();
    };
    state.resizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault(); startX = e.clientX; startWidth = state.panel.offsetWidth;
        state.panel.classList.add('is-resizing'); document.body.style.cursor = 'ew-resize';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

export function renderMiniPanel() {
    if (!state.floatingMiniPanel) return;
    const container = state.floatingMiniPanel.querySelector('.prompt-group-container');
    while (container.firstChild) container.removeChild(container.firstChild);

    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.placeholder = 'Search prompts...';
    searchInput.id = 'mini-prompt-search-input';
    searchInput.addEventListener('input', handleSearch);
    container.appendChild(searchInput);

    const allPrompts = Object.values(state.currentPrompts).flat();
    const favoritePrompts = allPrompts.filter(p => p && p.id && state.settings.favorites.includes(p.id));

    if (favoritePrompts.length > 0) {
        container.appendChild(createCategory("Favorites", favoritePrompts, true, true));
    }
    (state.settings.groupOrder || []).forEach(categoryName => {
        const prompts = state.currentPrompts[categoryName];
        if (prompts) {
            container.appendChild(createCategory(categoryName, prompts, true, true));
        }
    });
}

export async function buildMainUI() {
    try {
        if (document.getElementById('gemini-prompt-panel-main')) return;

        // Assign built modals to state
        state.promptFormModal = buildPromptFormModal();
        state.importExportModal = buildImportExportModal();
        state.aiEnhancerModal = buildAIEnhancerModal();
        state.analyticsModal = buildAnalyticsModal();
        state.versionHistoryModal = buildVersionHistoryModal();

        // Create main panel elements and assign to state
        state.toast = document.createElement('div');
        state.toast.className = 'toast-notification';
        state.handle = document.createElement('div');
        state.handle.className = 'panel-handle';
        state.panel = document.createElement('div');
        state.panel.id = 'gemini-prompt-panel-main';
        state.resizeHandle = document.createElement('div');
        state.panel.appendChild(state.resizeHandle);

        const hdr = document.createElement('div'); hdr.className = 'gemini-prompt-panel-header';
        state.leftHeaderControls = document.createElement('div'); state.leftHeaderControls.className = 'panel-header-controls';
        const titleSpan = document.createElement('span'); titleSpan.className = 'panel-title'; titleSpan.textContent = 'Prompt Panel';
        state.rightHeaderControls = document.createElement('div'); state.rightHeaderControls.className = 'panel-header-controls';
        state.arrowLeftBtn = document.createElement('button'); state.arrowLeftBtn.title = "Move to Left";
        state.arrowRightBtn = document.createElement('button'); state.arrowRightBtn.title = "Move to Right";
        state.lockButton = document.createElement('button'); state.lockButton.title = "Lock Panel";
        const content = document.createElement('div'); content.className = 'gemini-prompt-panel-content';
        state.actionGroup = document.createElement('div'); state.actionGroup.className = 'button-group';
        state.copyResponseButton = createButtonWithIcon('Copy Response', null);
        state.copyCodeButton = createButtonWithIcon('Copy Code', null);
        state.downloadCanvasButton = createButtonWithIcon('Download Canvas', icons.uploadFile.cloneNode(true));
        const searchInput = document.createElement('input'); searchInput.type = 'search'; searchInput.id = 'prompt-search-input';
        const addBtn = createButtonWithIcon('Add New Prompt', icons.plus.cloneNode(true)); addBtn.id = 'add-prompt-btn';
        const searchAddContainer = document.createElement('div'); searchAddContainer.className = 'search-add-container';
        const panelActionButtons = document.createElement('div');
        panelActionButtons.className = 'button-group';
        panelActionButtons.id = 'panel-action-buttons';
        const collapseBtn = createButtonWithIcon('Collapse All', null);
        const expandBtn = createButtonWithIcon('Expand All', null);
        panelActionButtons.append(collapseBtn, expandBtn);
        const promptGroup = document.createElement('div'); promptGroup.className = 'prompt-group-container';
        const cont = document.createElement('div'); cont.id = 'custom-prompts-container';
        state.navigator = document.createElement('div'); state.navigator.className = 'post-navigator';
        const navToTop = document.createElement('button'); navToTop.id = 'nav-to-top'; navToTop.title = 'Scroll to Top';
        const navUp = document.createElement('button'); navUp.id = 'nav-up'; navUp.title = 'Previous Post';
        const navDown = document.createElement('button'); navDown.id = 'nav-down'; navDown.title = 'Next Post';
        const navToBottom = document.createElement('button'); navToBottom.id = 'nav-to-bottom'; navToBottom.title = 'Scroll to Bottom';
        const mainNavArrow = document.createElement('button'); mainNavArrow.className = 'main-nav-arrow'; mainNavArrow.title = 'Toggle Panel';
        const mainNavIconContainer = document.createElement('div');

        state.arrowLeftBtn.appendChild(icons.arrowLeft.cloneNode(true));
        state.arrowRightBtn.appendChild(icons.arrowRight.cloneNode(true));
        updateLockIcon();
        hdr.append(state.leftHeaderControls, titleSpan, state.rightHeaderControls);
        state.panel.appendChild(hdr);
        state.copyResponseButton.classList.add('copy-btn');
        state.copyCodeButton.classList.add('copy-btn');
        state.downloadCanvasButton.classList.add('copy-btn');
        searchInput.placeholder = 'Search prompts...';
        searchAddContainer.append(addBtn, searchInput, panelActionButtons);
        promptGroup.appendChild(cont);
        content.append(state.actionGroup, searchAddContainer, promptGroup);
        state.panel.appendChild(content);
        navToTop.appendChild(icons.navToTop.cloneNode(true));
        navUp.appendChild(icons.navUp.cloneNode(true));
        navDown.appendChild(icons.navDown.cloneNode(true));
        navToBottom.appendChild(icons.navToBottom.cloneNode(true));
        mainNavArrow.appendChild(mainNavIconContainer);
        state.navigator.append(navToTop, navUp, navDown, navToBottom, mainNavArrow);
        document.body.append(state.panel, state.handle, state.toast, state.promptFormModal, state.importExportModal, state.aiEnhancerModal, state.analyticsModal, state.versionHistoryModal, state.navigator);

        // Add event listeners
        state.handle.addEventListener('mouseenter', () => { state.panel.classList.add('visible'); updateHandleHeight(); });
        state.handle.addEventListener('mouseleave', hidePanel);
        state.panel.addEventListener('mouseenter', () => state.panel.classList.add('visible'));
        state.panel.addEventListener('mouseleave', hidePanel);
        state.arrowLeftBtn.addEventListener('click', () => { state.settings.position = 'left'; saveSettings().then(applySettingsAndTheme); });
        state.arrowRightBtn.addEventListener('click', () => { state.settings.position = 'right'; saveSettings().then(applySettingsAndTheme); });
        state.lockButton.addEventListener('click', () => { state.isManuallyLocked = !state.isManuallyLocked; updateLockIcon(); if (state.isManuallyLocked) state.panel.classList.add('visible'); });

        collapseBtn.addEventListener('click', () => {
            const allCategoryDivs = state.panel.querySelectorAll('.prompt-category');
            const allCategoryNames = Array.from(allCategoryDivs).map(div => div.dataset.categoryName);
            state.settings.collapsedCategories = [...new Set([...state.settings.collapsedCategories, ...allCategoryNames])];
            saveSettings().then(renderAllPrompts);
        });
        expandBtn.addEventListener('click', () => {
            state.settings.collapsedCategories = [];
            saveSettings().then(renderAllPrompts);
        });

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
        mainNavArrow.addEventListener('click', () => state.panel.classList.toggle('visible'));
        window.addEventListener('scroll', updateNavigator, { passive: true });
        window.addEventListener('resize', updateNavigator);
        hdr.addEventListener('mousedown', e => {
            if (e.target.closest('.panel-header-controls') || e.target.closest('.draggable-header')) return;
            const startY = e.clientY; const startTop = state.panel.offsetTop;
            document.body.style.userSelect = 'none';
            function onMove(ev) {
                let newTop = startTop + (ev.clientY - startY);
                newTop = Math.max(0, Math.min(newTop, window.innerHeight - state.panel.offsetHeight));
                state.settings.topOffset = newTop + 'px';
                state.panel.style.top = state.settings.topOffset; state.handle.style.top = state.settings.topOffset; state.navigator.style.top = state.settings.topOffset;
            }
            function onUp() {
                document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
                document.body.style.userSelect = '';
                saveSettings();
            }
            document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
        });

        initResizeFunctionality();
        if (state.settings.gistURL) {
            await syncFromGist().catch(() => loadAndDisplayPrompts());
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