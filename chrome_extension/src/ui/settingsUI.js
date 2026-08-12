// /src/ui/settingsUI.js

import { state, saveSettings, saveSecrets, clearSecret, getActiveProfile, switchProfile, createManualProfile, deleteActiveProfile, exportProfiles, importProfiles, getDiagnosticsReport, recordDiagnosticEvent } from '../state.js';
import { icons } from '../icons.js';
import { capitalizeFirstLetter, installModalAccessibility, openAccessibleModal, closeAccessibleModal, showTextInputDialog, showDecisionDialog, showToast } from '../utils.js';
import { presetThemes, FULL_WIDTH_STYLE_ID, FULL_WIDTH_CSS } from '../config.js';
import { applySettingsAndTheme, renderActionButtons, renderAllPrompts } from './mainPanel.js';
import { syncFromGist, importMarketplaceCatalog, removeMarketplaceCatalog, toggleMarketplaceCatalogPinned, createMarketplaceCatalogExport } from '../features/api.js';
import { showImportExportModal, populateAnalytics } from './modals.js';
import { i18nMessage } from '../i18n.js';

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
    handleLink.title = i18nMessage('viewOnGithub', 'View on GitHub');
    handleLink.textContent = i18nMessage('panelTitle', 'Prompt Panel');

    const handleButton = document.createElement('button');
    handleButton.id = 'settings-handle-button';
    handleButton.title = i18nMessage('openSettings', 'Open Settings');
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
    headerTitle.id = 'settings-modal-title';
    headerTitle.appendChild(icons.settings.cloneNode(true));
    headerTitle.appendChild(document.createTextNode(' Prompt Panel Settings'));
    const closeBtn = document.createElement('button');
    closeBtn.id = 'close-settings-btn';
    closeBtn.type = 'button';
    closeBtn.title = i18nMessage('close', 'Close');
    closeBtn.setAttribute('aria-label', i18nMessage('closeSettings', 'Close settings'));
    closeBtn.appendChild(icons.close.cloneNode(true));
    header.append(headerTitle, closeBtn);

    // Body
    const body = document.createElement('div');
    body.className = 'settings-body';

    // Tabs
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'settings-tabs';
    const TABS = { general: i18nMessage('general', 'General'), appearance: i18nMessage('appearance', 'Appearance'), prompts: i18nMessage('promptsGroups', 'Prompts & Groups'), ai: i18nMessage('aiSync', 'AI & Sync'), data: i18nMessage('data', 'Data') };
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
    installModalAccessibility(state.settingsModal, { visibleClass: 'visible' });
    state.settingsModal.setAttribute('aria-labelledby', headerTitle.id);

    // --- Populate and Add Events ---
    populateSettingsPanes();
    applySettingsTheme();

    handleButton.addEventListener('click', () => openAccessibleModal(state.settingsModal));
    closeBtn.addEventListener('click', () => closeAccessibleModal(state.settingsModal));
    state.settingsModal.addEventListener('click', (e) => {
        if (e.target.id === 'settings-overlay') {
            closeAccessibleModal(state.settingsModal);
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

function downloadJson(filename, value) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

function getDiagnosticsFileName() {
    return `geminibuddy-diagnostics-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
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
        option.textContent = i18nMessage(theme, capitalizeFirstLetter(theme));
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
        option.textContent = i18nMessage(theme, capitalizeFirstLetter(theme));
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
    const handleStyles = { classic: i18nMessage('classicSmall', 'Classic (Small)'), edge: i18nMessage('edgeFull', 'Edge (Full Height)') };
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
    const profileSelect = document.createElement('select');
    profileSelect.id = 'setting-profile';
    state.profileRegistry.profiles.forEach(profile => {
        const option = document.createElement('option');
        option.value = profile.id;
        option.textContent = profile.accountKey ? `${profile.name} · detected account` : profile.name;
        profileSelect.appendChild(option);
    });
    profileSelect.value = state.profileRegistry.activeProfileId;
    profileSelect.addEventListener('change', async event => {
        try {
            await switchProfile(event.target.value);
            renderAllPrompts();
            applySettingsAndTheme();
            populateSettingsPanes();
            showToast(`Switched to ${getActiveProfile().name}.`, 2200, 'success');
        } catch (error) {
            showToast(error.message, 3000, 'error');
            profileSelect.value = state.profileRegistry.activeProfileId;
        }
    });
    panes.prompts.appendChild(createSettingRow('setting-profile', 'Active Profile', 'Profiles isolate prompts, settings, and history for each account or workspace.', profileSelect));

    const profileActions = document.createElement('div');
    profileActions.className = 'button-group';
    const newProfileBtn = document.createElement('button');
    newProfileBtn.type = 'button';
    newProfileBtn.className = 'settings-styled-button';
    newProfileBtn.textContent = i18nMessage('newProfile', 'New Profile');
    newProfileBtn.addEventListener('click', async () => {
        const name = await showTextInputDialog({ title: 'Create prompt profile', message: 'Use a name such as Work or Personal.', label: 'Profile name', confirmLabel: 'Create' });
        if (!name) return;
        try {
            await createManualProfile(name);
            renderAllPrompts();
            applySettingsAndTheme();
            populateSettingsPanes();
            showToast(`Created ${getActiveProfile().name}.`, 2200, 'success');
        } catch (error) {
            showToast(error.message, 3000, 'error');
        }
    });
    const deleteProfileBtn = document.createElement('button');
    deleteProfileBtn.type = 'button';
    deleteProfileBtn.className = 'settings-styled-button';
    deleteProfileBtn.textContent = i18nMessage('deleteCurrent', 'Delete Current');
    deleteProfileBtn.addEventListener('click', async () => {
        const shouldDelete = await showDecisionDialog({ title: 'Delete profile?', message: `Delete the ${getActiveProfile().name} profile and its prompts?`, confirmLabel: 'Delete', destructive: true });
        if (!shouldDelete) return;
        try {
            await deleteActiveProfile();
            renderAllPrompts();
            applySettingsAndTheme();
            populateSettingsPanes();
        } catch (error) {
            showToast(error.message, 3000, 'error');
        }
    });
    const exportProfileBtn = document.createElement('button');
    exportProfileBtn.type = 'button';
    exportProfileBtn.className = 'settings-styled-button';
    exportProfileBtn.textContent = i18nMessage('exportCurrent', 'Export Current');
    exportProfileBtn.addEventListener('click', () => exportProfiles('active').then(data => downloadJson(`${getActiveProfile().name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-profile.json`, data)).catch(error => showToast(error.message, 3000, 'error')));
    const exportAllProfilesBtn = document.createElement('button');
    exportAllProfilesBtn.type = 'button';
    exportAllProfilesBtn.className = 'settings-styled-button';
    exportAllProfilesBtn.textContent = i18nMessage('exportAll', 'Export All');
    exportAllProfilesBtn.addEventListener('click', () => exportProfiles('all').then(data => downloadJson('geminibuddy-profiles.json', data)).catch(error => showToast(error.message, 3000, 'error')));
    const importProfilesLabel = document.createElement('label');
    importProfilesLabel.className = 'settings-styled-button';
    importProfilesLabel.textContent = i18nMessage('importProfiles', 'Import Profiles');
    const importProfilesInput = document.createElement('input');
    importProfilesInput.type = 'file';
    importProfilesInput.accept = 'application/json,.json';
    importProfilesInput.style.display = 'none';
    importProfilesLabel.appendChild(importProfilesInput);
    importProfilesInput.addEventListener('change', event => {
        const [file] = event.target.files || [];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const imported = await importProfiles(JSON.parse(reader.result));
                populateSettingsPanes();
                showToast(`Imported ${imported.length} profile${imported.length === 1 ? '' : 's'}.`, 2500, 'success');
            } catch (error) {
                showToast(error.message, 3000, 'error');
            }
        };
        reader.onerror = () => showToast('Could not read profile export.', 3000, 'error');
        reader.readAsText(file);
        event.target.value = '';
    });
    profileActions.append(newProfileBtn, deleteProfileBtn, exportProfileBtn, exportAllProfilesBtn, importProfilesLabel);
    panes.prompts.appendChild(createSettingRow('profile-actions', 'Profile Data', 'Export one profile or a complete profile backup; imports are merged without overwriting existing profiles.', profileActions));
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
    apiKeyInput.value = state.secrets.geminiAPIKey;
    apiKeyInput.placeholder = "Enter your Google AI API key";
    apiKeyInput.addEventListener('change', e => {
        state.secrets.geminiAPIKey = e.target.value.trim();
        saveSecrets();
    });
    const clearApiKeyBtn = document.createElement('button');
    clearApiKeyBtn.type = 'button';
    clearApiKeyBtn.className = 'settings-styled-button';
    clearApiKeyBtn.textContent = i18nMessage('clear', 'Clear');
    clearApiKeyBtn.addEventListener('click', async () => {
        await clearSecret('geminiAPIKey');
        apiKeyInput.value = '';
    });
    const apiKeyControls = document.createElement('div');
    apiKeyControls.className = 'input-with-button';
    apiKeyControls.append(apiKeyInput, clearApiKeyBtn);
    panes.ai.appendChild(createSettingRow('setting-api-key', 'Google AI API Key', 'Stored in local-only secret storage and never synced with settings.', apiKeyControls));

    const diagnosticsButton = document.createElement('button');
    diagnosticsButton.type = 'button';
    diagnosticsButton.className = 'settings-styled-button';
    diagnosticsButton.textContent = i18nMessage('downloadDiagnostics', 'Download Diagnostics');
    const refreshDiagnosticsButton = document.createElement('button');
    refreshDiagnosticsButton.type = 'button';
    refreshDiagnosticsButton.className = 'settings-styled-button';
    refreshDiagnosticsButton.textContent = i18nMessage('refresh', 'Refresh');
    const diagnosticsOutput = document.createElement('pre');
    diagnosticsOutput.className = 'diagnostics-output';
    diagnosticsOutput.setAttribute('role', 'region');
    diagnosticsOutput.setAttribute('aria-label', 'GeminiBuddy diagnostics report');
    const renderDiagnostics = () => { diagnosticsOutput.textContent = JSON.stringify(getDiagnosticsReport(), null, 2); };
    refreshDiagnosticsButton.addEventListener('click', renderDiagnostics);
    diagnosticsButton.addEventListener('click', () => {
        const report = getDiagnosticsReport();
        recordDiagnosticEvent('diagnostics', 'success', 'Support report exported.');
        downloadJson(getDiagnosticsFileName(), getDiagnosticsReport());
        showToast('Redacted diagnostics report downloaded.', 2500, 'success');
    });
    const diagnosticsControls = document.createElement('div');
    diagnosticsControls.className = 'button-group';
    diagnosticsControls.append(refreshDiagnosticsButton, diagnosticsButton);
    const diagnosticsSection = createSettingRow('diagnostics-export', 'Diagnostics & Support', 'Shows and exports versions, selector health, storage telemetry, profile counts, and recent errors without prompt text or secrets.', diagnosticsControls);
    diagnosticsSection.appendChild(diagnosticsOutput);
    panes.ai.appendChild(diagnosticsSection);
    renderDiagnostics();

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
    syncBtn.textContent = i18nMessage('syncNowFromGist', 'Sync Now from Gist');
    syncBtn.className = 'settings-styled-button';
    syncBtn.addEventListener('click', () => syncFromGist(true));
    const syncRow = createSettingRow('gist-sync-action', 'Sync Action', 'Manually trigger a sync from the Gist URL provided above.', syncBtn);
    panes.ai.appendChild(syncRow);

    const marketplaceUrlInput = document.createElement('input');
    marketplaceUrlInput.type = 'url';
    marketplaceUrlInput.id = 'setting-marketplace-url';
    marketplaceUrlInput.value = state.settings.marketplaceURL || '';
    marketplaceUrlInput.placeholder = 'https://example.com/catalog.json';
    marketplaceUrlInput.addEventListener('change', event => {
        state.settings.marketplaceURL = event.target.value.trim();
        saveSettings();
    });
    const marketplaceImportBtn = document.createElement('button');
    marketplaceImportBtn.type = 'button';
    marketplaceImportBtn.className = 'settings-styled-button';
    marketplaceImportBtn.textContent = i18nMessage('reviewCatalog', 'Review Catalog');
    marketplaceImportBtn.addEventListener('click', () => importMarketplaceCatalog().catch(error => showToast(error.message, 3500, 'error')));
    const marketplaceControls = document.createElement('div');
    marketplaceControls.className = 'input-with-button';
    marketplaceControls.append(marketplaceUrlInput, marketplaceImportBtn);
    panes.ai.appendChild(createSettingRow('marketplace-url', 'Marketplace Catalog JSON', 'Fetch a catalog, review provenance and changes, then approve its merge.', marketplaceControls));

    const catalogsContainer = document.createElement('div');
    catalogsContainer.className = 'marketplace-catalogs';
    const renderCatalogs = () => {
        while (catalogsContainer.firstChild) catalogsContainer.removeChild(catalogsContainer.firstChild);
        const catalogs = Array.isArray(state.settings.marketplaceCatalogs) ? state.settings.marketplaceCatalogs : [];
        if (!catalogs.length) {
            const empty = document.createElement('p');
            empty.className = 'description';
        empty.textContent = i18nMessage('noApprovedCatalogs', 'No approved catalogs yet.');
            catalogsContainer.appendChild(empty);
            return;
        }
        catalogs.forEach(catalog => {
            const card = document.createElement('div');
            card.className = 'marketplace-catalog-card';
            const summary = document.createElement('div');
            summary.textContent = `${catalog.sourceName} · schema ${catalog.schemaVersion} · ${catalog.promptCount} prompts · ${catalog.duplicateCount} duplicates`;
            const provenance = document.createElement('small');
            provenance.textContent = `${catalog.sourceUrl} · updated ${catalog.updatedAt || 'not supplied'} · fetched ${catalog.fetchedAt || 'unknown'}`;
            const actions = document.createElement('div');
            actions.className = 'button-group';
            const pinBtn = document.createElement('button');
            pinBtn.type = 'button';
        pinBtn.textContent = catalog.pinned ? i18nMessage('unpin', 'Unpin') : i18nMessage('pin', 'Pin');
            pinBtn.addEventListener('click', () => { toggleMarketplaceCatalogPinned(catalog.id); saveSettings().then(renderCatalogs); });
            const refreshBtn = document.createElement('button');
            refreshBtn.type = 'button';
        refreshBtn.textContent = i18nMessage('refresh', 'Refresh');
            refreshBtn.addEventListener('click', () => importMarketplaceCatalog(catalog.sourceUrl).then(renderCatalogs).catch(error => showToast(error.message, 3500, 'error')));
            const exportBtn = document.createElement('button');
            exportBtn.type = 'button';
        exportBtn.textContent = i18nMessage('export', 'Export');
            exportBtn.addEventListener('click', () => downloadJson(`${catalog.sourceName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-catalog.json`, createMarketplaceCatalogExport(catalog)));
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
        removeBtn.textContent = i18nMessage('remove', 'Remove');
            removeBtn.addEventListener('click', () => { removeMarketplaceCatalog(catalog.id); saveSettings().then(renderCatalogs); });
            actions.append(pinBtn, refreshBtn, exportBtn, removeBtn);
            card.append(summary, provenance, actions);
            catalogsContainer.appendChild(card);
        });
    };
    const catalogsSection = createSettingRow('marketplace-catalogs', 'Approved Catalogs', 'Pinned catalogs retain provenance and can be refreshed, removed, or exported with their source metadata.', catalogsContainer);
    panes.ai.appendChild(catalogsSection);
    renderCatalogs();

    // --- Data Pane ---
    const importExportBtn = document.createElement('button');
    importExportBtn.textContent = i18nMessage('openImportExport', 'Open Import / Export');
    importExportBtn.className = 'settings-styled-button';
    importExportBtn.addEventListener('click', () => showImportExportModal());
    panes.data.appendChild(createSettingRow('data-import-export', 'Local Import / Export', 'Backup your prompts to a file or import them from a local JSON file.', importExportBtn));

    const analyticsBtn = document.createElement('button');
    analyticsBtn.textContent = i18nMessage('showPromptAnalytics', 'Show Prompt Analytics');
    analyticsBtn.className = 'settings-styled-button';
    analyticsBtn.addEventListener('click', () => {
        populateAnalytics();
        openAccessibleModal(state.analyticsModal);
    });
    panes.data.appendChild(createSettingRow('data-analytics', 'Usage Analytics', 'View statistics on your prompt usage, favorite tags, and more.', analyticsBtn));
}
