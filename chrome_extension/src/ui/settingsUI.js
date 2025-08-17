// /src/ui/settingsUI.js

import { state, saveSettings } from '../state.js';
import { icons } from '../icons.js';
import { capitalizeFirstLetter } from '../utils.js';
import { presetThemes, FULL_WIDTH_STYLE_ID, FULL_WIDTH_CSS } from '../config.js';
import { applySettingsAndTheme, renderActionButtons, renderAllPrompts } from './mainPanel.js';
import { syncFromGist } from '../features/api.js';
import { showImportExportModal, populateAnalytics } from './modals.js';

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

export function buildSettingsUI() {
    // --- Create Handle ---
    const handleContainer = document.createElement('div');
    handleContainer.id = 'settings-handle';

    const handleLink = document.createElement('a');
    handleLink.href = 'https://github.com/SysAdminDoc/Gemini-Prompt-Panel';
    handleLink.target = '_blank';
    handleLink.title = 'View on GitHub';
    handleLink.textContent = 'Prompt Panel';

    const handleButton = document.createElement('button');
    handleButton.id = 'settings-handle-button';
    handleButton.title = 'Open Settings';
    handleButton.appendChild(icons.settings.cloneNode(true));
    handleButton.querySelector('svg').setAttribute('width', 20);
    handleButton.querySelector('svg').setAttribute('height', 20);

    handleContainer.append(handleLink, handleButton);
    document.body.appendChild(handleContainer);

    // --- Create Panel ---
    const modalContainer = document.createElement('div');
    modalContainer.id = 'settings-overlay';

    const panelEl = document.createElement('div');
    panelEl.id = 'settings-panel';
    panelEl.tabIndex = -1;

    // Header
    const header = document.createElement('div');
    header.className = 'settings-header';
    const headerTitle = document.createElement('h2');
    headerTitle.appendChild(icons.settings.cloneNode(true));
    headerTitle.appendChild(document.createTextNode(' Prompt Panel Settings'));
    const closeBtn = document.createElement('button');
    closeBtn.id = 'close-settings-btn';
    closeBtn.title = 'Close';
    closeBtn.appendChild(icons.close.cloneNode(true));
    header.append(headerTitle, closeBtn);

    // Body
    const body = document.createElement('div');
    body.className = 'settings-body';

    // Tabs
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'settings-tabs';
    const TABS = { general: 'General', appearance: 'Appearance', prompts: 'Prompts & Groups', ai: 'AI & Sync', data: 'Data' };
    Object.entries(TABS).forEach(([key, value], index) => {
        const tabBtn = document.createElement('button');
        tabBtn.className = 'tab-btn';
        if (index === 0) tabBtn.classList.add('active');
        tabBtn.dataset.tab = key;
        tabBtn.textContent = value;
        tabsContainer.appendChild(tabBtn);
    });

    // Content
    const contentContainer = document.createElement('div');
    contentContainer.className = 'settings-content';
    Object.keys(TABS).forEach((key, index) => {
        const pane = document.createElement('div');
        pane.id = `pane-${key}`;
        pane.className = 'settings-pane';
        if (index === 0) pane.classList.add('active');
        contentContainer.appendChild(pane);
    });

    body.append(tabsContainer, contentContainer);
    panelEl.append(header, body);
    modalContainer.appendChild(panelEl);
    document.body.appendChild(modalContainer);
    state.settingsModal = modalContainer;

    // --- Populate and Add Events ---
    populateSettingsPanes();
    applySettingsTheme();

    handleButton.addEventListener('click', () => state.settingsModal.classList.add('visible'));
    closeBtn.addEventListener('click', () => state.settingsModal.classList.remove('visible'));
    state.settingsModal.addEventListener('click', (e) => {
        if (e.target.id === 'settings-overlay') {
            state.settingsModal.classList.remove('visible');
        }
    });

    const tabs = state.settingsModal.querySelectorAll('.tab-btn');
    const panes = state.settingsModal.querySelectorAll('.settings-pane');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`pane-${tab.dataset.tab}`).classList.add('active');
        });
    });
}

function applySettingsTheme() {
    document.documentElement.classList.toggle('settings-light-theme', state.settings.settingsTheme === 'light');
}

function createSettingRow(id, label, description, control) {
    const row = document.createElement('div');
    row.className = 'setting-row';

    const labelGroup = document.createElement('div');
    labelGroup.className = 'label-group';

    const labelEl = document.createElement('label');
    labelEl.htmlFor = id;
    labelEl.textContent = label;

    const smallEl = document.createElement('small');
    smallEl.textContent = description;

    labelGroup.append(labelEl, smallEl);

    const controlGroup = document.createElement('div');
    controlGroup.className = 'control-group';
    controlGroup.appendChild(control);

    row.append(labelGroup, controlGroup);
    return row;
}

function createToggle(id, isChecked, onChange) {
    const container = document.createElement('label');
    container.className = 'toggle-switch';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.checked = isChecked;
    input.addEventListener('change', onChange);

    const slider = document.createElement('span');
    slider.className = 'slider';

    container.append(input, slider);
    return container;
}

function populateSettingsPanes() {
    const panes = {
        general: document.getElementById('pane-general'),
        appearance: document.getElementById('pane-appearance'),
        prompts: document.getElementById('pane-prompts'),
        ai: document.getElementById('pane-ai'),
        data: document.getElementById('pane-data')
    };
    Object.values(panes).forEach(p => {
        while (p.firstChild) {
            p.removeChild(p.firstChild);
        }
    });

    // --- General Pane ---
    panes.general.appendChild(createSettingRow('setting-full-width', 'Full Width Chat', 'Expands the chat area to fill the screen.',
        createToggle('setting-full-width', state.settings.enableFullWidth, (e) => {
            state.settings.enableFullWidth = e.target.checked;
            toggleFullWidth(state.settings.enableFullWidth);
            saveSettings();
        })
    ));
    panes.general.appendChild(createSettingRow('setting-mini-mode', 'Floating Mini-Mode', 'Shows a quick-access prompt icon in the chat input area.',
        createToggle('setting-mini-mode', state.settings.enableMiniMode, (e) => {
            state.settings.enableMiniMode = e.target.checked;
            state.miniPanelTrigger.style.display = state.settings.enableMiniMode ? 'flex' : 'none';
            saveSettings();
        })
    ));
    panes.general.appendChild(createSettingRow('setting-copy-swap', 'Swap "Copy" Button Order', "Reverses the 'Copy Response' and 'Copy Code' buttons in the panel.",
        createToggle('setting-copy-swap', state.settings.copyButtonOrderSwapped, (e) => {
            state.settings.copyButtonOrderSwapped = e.target.checked;
            renderActionButtons();
            saveSettings();
        })
    ));
    panes.general.appendChild(createSettingRow('setting-auto-copy-code', 'Auto-Copy Code', 'Automatically copies the latest code block when Gemini finishes generating a response.',
        createToggle('setting-auto-copy-code', state.settings.autoCopyCodeOnCompletion, (e) => {
            state.settings.autoCopyCodeOnCompletion = e.target.checked;
            saveSettings();
        })
    ));

    // --- Appearance Pane ---
    const settingsThemeSelect = document.createElement('select');
    settingsThemeSelect.id = 'setting-settings-theme';
    ['dark', 'light'].forEach(theme => {
        const option = document.createElement('option');
        option.value = theme;
        option.textContent = capitalizeFirstLetter(theme);
        settingsThemeSelect.appendChild(option);
    });
    settingsThemeSelect.value = state.settings.settingsTheme;
    settingsThemeSelect.addEventListener('change', e => {
        state.settings.settingsTheme = e.target.value;
        applySettingsTheme();
        saveSettings();
    });
    panes.appearance.appendChild(createSettingRow('setting-settings-theme', 'Settings Theme', 'Changes the appearance of this settings panel.', settingsThemeSelect));

    const panelThemeSelect = document.createElement('select');
    panelThemeSelect.id = 'setting-panel-theme';
    Object.keys(presetThemes).forEach(theme => {
        const option = document.createElement('option');
        option.value = theme;
        option.textContent = capitalizeFirstLetter(theme);
        panelThemeSelect.appendChild(option);
    });
    panelThemeSelect.value = state.settings.themeName;
    panelThemeSelect.addEventListener('change', e => {
        state.settings.themeName = e.target.value;
        if (presetThemes[state.settings.themeName]) {
            state.settings.colors = { ...presetThemes[state.settings.themeName] };
        }
        applySettingsAndTheme();
        saveSettings();
    });
    panes.appearance.appendChild(createSettingRow('setting-panel-theme', 'Prompt Panel Theme', 'Changes the appearance of the main prompt panel.', panelThemeSelect));

    panes.appearance.appendChild(createSettingRow('setting-condensed', 'Condensed Mode', 'Reduces padding and margins in the prompt panel for a compact view.',
        createToggle('setting-condensed', state.settings.condensedMode, (e) => {
            state.settings.condensedMode = e.target.checked;
            state.panel.classList.toggle('condensed', state.settings.condensedMode);
            saveSettings();
        })
    ));

    const handleStyleSelect = document.createElement('select');
    handleStyleSelect.id = 'setting-handle-style';
    const handleStyles = { classic: 'Classic (Small)', edge: 'Edge (Full Height)' };
    Object.entries(handleStyles).forEach(([value, text]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        handleStyleSelect.appendChild(option);
    });
    handleStyleSelect.value = state.settings.handleStyle;
    handleStyleSelect.addEventListener('change', e => {
        state.settings.handleStyle = e.target.value;
        applySettingsAndTheme();
        saveSettings();
    });
    panes.appearance.appendChild(createSettingRow('setting-handle-style', 'Panel Handle Style', 'Choose the appearance of the prompt panel handle.', handleStyleSelect));

    // --- Prompts Pane ---
    panes.prompts.appendChild(createSettingRow('setting-group-tags', 'Group by Tags', 'Overrides category groups, organizing prompts by their assigned tags instead.',
        createToggle('setting-group-tags', state.settings.groupByTags, (e) => {
            state.settings.groupByTags = e.target.checked;
            renderAllPrompts();
            saveSettings();
        })
    ));
    panes.prompts.appendChild(createSettingRow('setting-show-tags', 'Show Prompt Tags', 'Displays tags underneath each prompt button in the panel.',
        createToggle('setting-show-tags', state.settings.showTags, (e) => {
            state.settings.showTags = e.target.checked;
            renderAllPrompts();
            saveSettings();
        })
    ));

    // --- AI & Sync Pane ---
    panes.ai.appendChild(createSettingRow('setting-ai-enhancer', 'AI Prompt Enhancer', 'Enables a feature to improve your prompts using the Gemini API.',
        createToggle('setting-ai-enhancer', state.settings.enableAIenhancer, (e) => {
            state.settings.enableAIenhancer = e.target.checked;
            renderAllPrompts();
            saveSettings();
        })
    ));
    const apiKeyInput = document.createElement('input');
    apiKeyInput.type = 'password';
    apiKeyInput.id = 'setting-api-key';
    apiKeyInput.value = state.settings.geminiAPIKey;
    apiKeyInput.placeholder = "Enter your Google AI API key";
    apiKeyInput.addEventListener('change', e => {
        state.settings.geminiAPIKey = e.target.value.trim();
        saveSettings();
    });
    panes.ai.appendChild(createSettingRow('setting-api-key', 'Google AI API Key', 'Required for the AI Prompt Enhancer feature. Your key is stored locally.', apiKeyInput));

    const gistUrlInput = document.createElement('input');
    gistUrlInput.type = 'url';
    gistUrlInput.id = 'setting-gist-url';
    gistUrlInput.value = state.settings.gistURL;
    gistUrlInput.placeholder = "https://gist.github.com/...";
    gistUrlInput.addEventListener('change', e => {
        state.settings.gistURL = e.target.value.trim();
        saveSettings();
    });
    panes.ai.appendChild(createSettingRow('setting-gist-url', 'GitHub Gist Sync URL', 'Sync prompts from a raw Gist URL (replaces all local prompts on sync).', gistUrlInput));
    const syncBtn = document.createElement('button');
    syncBtn.textContent = 'Sync Now from Gist';
    syncBtn.className = 'settings-styled-button';
    syncBtn.addEventListener('click', () => syncFromGist(true));
    const syncRow = createSettingRow('gist-sync-action', 'Sync Action', 'Manually trigger a sync from the Gist URL provided above.', syncBtn);
    panes.ai.appendChild(syncRow);

    // --- Data Pane ---
    const importExportBtn = document.createElement('button');
    importExportBtn.textContent = 'Open Import / Export';
    importExportBtn.className = 'settings-styled-button';
    importExportBtn.addEventListener('click', () => showImportExportModal());
    panes.data.appendChild(createSettingRow('data-import-export', 'Local Import / Export', 'Backup your prompts to a file or import them from a local JSON file.', importExportBtn));

    const analyticsBtn = document.createElement('button');
    analyticsBtn.textContent = 'Show Prompt Analytics';
    analyticsBtn.className = 'settings-styled-button';
    analyticsBtn.addEventListener('click', () => {
        populateAnalytics();
        state.analyticsModal.style.display = 'flex';
    });
    panes.data.appendChild(createSettingRow('data-analytics', 'Usage Analytics', 'View statistics on your prompt usage, favorite tags, and more.', analyticsBtn));
}