// /src/state.js

import { GM_getValue, GM_setValue } from './GM_wrappers.js';
import { defaultSettings, GM_SETTINGS_KEY, GM_HISTORY_KEY } from './config.js';
import { showToast } from './utils.js';

export const state = {
    // UI Elements
    panel: null,
    handle: null,
    promptFormModal: null,
    toast: null,
    resizeHandle: null,
    navigator: null,
    settingsModal: null,
    importExportModal: null,
    aiEnhancerModal: null,
    analyticsModal: null,
    versionHistoryModal: null,
    floatingMiniPanel: null,
    miniPanelTrigger: null,
    leftHeaderControls: null,
    rightHeaderControls: null,
    actionGroup: null,
    lockButton: null,
    arrowLeftBtn: null,
    arrowRightBtn: null,
    copyResponseButton: null,
    copyCodeButton: null,
    downloadCanvasButton: null,

    // Mutable State
    currentPrompts: {},
    promptHistory: {},
    settings: {},
    isManuallyLocked: false,
    isFormActiveLock: false,
    lastFetchedUrl: null,
    generationObserver: null,
    isGenerating: false,
};

export async function loadSettings() {
    let loadedSettings = await GM_getValue(GM_SETTINGS_KEY, defaultSettings);
    state.settings = { ...defaultSettings, ...loadedSettings };
    state.settings.colors = { ...defaultSettings.colors, ...(state.settings.colors || {}) };
    state.settings.groupColors = state.settings.groupColors || {};
    state.settings.groupOrder = state.settings.groupOrder || [];
    state.settings.tagOrder = state.settings.tagOrder || [];
}

export async function saveSettings() {
    await GM_setValue(GM_SETTINGS_KEY, state.settings);
    showToast("Settings saved!");
}

export async function loadHistory() {
    state.promptHistory = await GM_getValue(GM_HISTORY_KEY, {});
}

export async function saveHistory() {
    await GM_setValue(GM_HISTORY_KEY, state.promptHistory);
}

export function addHistoryEntry(promptId, oldText) {
    if (!state.promptHistory[promptId]) {
        state.promptHistory[promptId] = [];
    }
    state.promptHistory[promptId].unshift({ timestamp: Date.now(), text: oldText });
    if (state.promptHistory[promptId].length > 10) {
        state.promptHistory[promptId].pop();
    }
    saveHistory();
}