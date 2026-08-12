// /src/state.js

import { GM_getValue, GM_setValue, GM_deleteValue, GM_getLocalValue, GM_setLocalValue, GM_deleteLocalValue } from './GM_wrappers.js';
import { defaultSettings, PROJECT_VERSION, GM_PROMPTS_KEY, GM_SETTINGS_KEY, GM_HISTORY_KEY, GM_PROFILES_KEY, GM_PROFILE_PROMPTS_PREFIX, GM_PROFILE_SETTINGS_PREFIX, GM_PROFILE_HISTORY_PREFIX, GM_ROLLBACK_KEY, GM_SECRETS_KEY, LEGACY_SETTINGS_KEYS } from './config.js';
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
    secrets: { geminiAPIKey: '', gistToken: '' },
    profileRegistry: { version: 1, activeProfileId: 'default', profiles: [] },
    profilesReady: false,
    detectedProfileAccountKey: '',
    diagnostics: { events: [] },
    isManuallyLocked: false,
    isFormActiveLock: false,
    lastFetchedUrl: null,
    generationObserver: null,
    isGenerating: false,
};

export function recordDiagnosticEvent(kind, status, detail = '') {
    const event = {
        kind: String(kind || 'runtime'),
        status: String(status || 'info'),
        detail: String(detail || '').slice(0, 500),
        at: new Date().toISOString()
    };
    state.diagnostics.events = [event, ...(state.diagnostics.events || [])].slice(0, 30);
}

function getStorageDiagnostics() {
    try {
        const diagnostics = globalThis.GeminiBuddyStorageDiagnostics;
        if (diagnostics?.snapshot) return diagnostics.snapshot();
        return diagnostics ? { ...diagnostics } : { backend: 'unknown', quota: 'not exposed' };
    } catch (_error) {
        return { backend: 'unavailable', quota: 'not exposed' };
    }
}

export function getDiagnosticsReport() {
    const selectors = {
        main: Boolean(document.querySelector('main')),
        chatHistory: Boolean(document.querySelector('main .chat-history')),
        promptInput: Boolean(document.querySelector('main rich-textarea, div.ql-editor')),
        sendButton: Boolean(document.querySelector('button.send-button, button[data-testid="send-button"]')),
        panel: Boolean(document.querySelector('#gemini-prompt-panel-main'))
    };
    return {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        application: { version: PROJECT_VERSION, mode: 'extension-content-script' },
        browser: { userAgent: navigator.userAgent, platform: navigator.platform, language: navigator.language },
        storage: getStorageDiagnostics(),
        profiles: { count: state.profileRegistry.profiles.length, active: getActiveProfile()?.name || 'Default' },
        data: {
            categoryCount: Object.keys(state.currentPrompts || {}).length,
            promptCount: Object.values(state.currentPrompts || {}).flat().length,
            historyEntryCount: Object.values(state.promptHistory || {}).flat().length
        },
        selectors,
        events: state.diagnostics.events || []
    };
}

const PROFILE_SCHEMA_VERSION = 1;

function cloneValue(value) {
    return JSON.parse(JSON.stringify(value));
}

function normalizeProfileSettings(raw) {
    const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const settings = { ...cloneValue(defaultSettings), ...source };
    settings.colors = { ...defaultSettings.colors, ...(source.colors || {}) };
    settings.groupColors = source.groupColors && typeof source.groupColors === 'object' ? { ...source.groupColors } : {};
    settings.groupOrder = Array.isArray(source.groupOrder) ? [...source.groupOrder] : [];
    settings.tagOrder = Array.isArray(source.tagOrder) ? [...source.tagOrder] : [];
    settings.collapsedCategories = Array.isArray(source.collapsedCategories) ? [...source.collapsedCategories] : [];
    settings.favorites = Array.isArray(source.favorites) ? [...source.favorites] : [];
    settings.allowedImportOrigins = Array.isArray(source.allowedImportOrigins) ? [...source.allowedImportOrigins] : [];
    settings.marketplaceCatalogs = Array.isArray(source.marketplaceCatalogs) ? cloneValue(source.marketplaceCatalogs) : [];
    delete settings.geminiAPIKey;
    delete settings.gistToken;
    return settings;
}

function sanitizeProfileSettings(settings) {
    const safeSettings = cloneValue(settings || {});
    delete safeSettings.geminiAPIKey;
    delete safeSettings.gistToken;
    return safeSettings;
}

function profileDataKey(prefix, profileId) {
    return `${prefix}${profileId}`;
}

function profileIdFromName(name, prefix = 'manual') {
    const slug = String(name || 'profile').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'profile';
    return `${prefix}-${slug}-${Date.now().toString(36)}`;
}

function accountFingerprint(email) {
    let hash = 2166136261;
    for (const character of String(email || '').toLowerCase()) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return `account-${(hash >>> 0).toString(16)}`;
}

function detectGeminiAccount() {
    if (typeof document === 'undefined') return { key: '', label: '' };
    const candidates = [
        ...Array.from(document.querySelectorAll('[data-email], [data-identifier]')).flatMap(element => [element.dataset?.email, element.dataset?.identifier, element.getAttribute('data-email'), element.getAttribute('data-identifier')]),
        ...Array.from(document.querySelectorAll('[aria-label*="@"], img[alt*="@"]')).flatMap(element => [element.getAttribute('aria-label'), element.getAttribute('alt')])
    ];
    for (const candidate of candidates) {
        const match = String(candidate || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        if (match) return { key: accountFingerprint(match[0]), label: match[0].toLowerCase() };
    }
    return { key: '', label: '' };
}

function normalizeProfileRegistry(raw) {
    const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const profiles = [];
    const seen = new Set();
    (Array.isArray(source.profiles) ? source.profiles : []).forEach(profile => {
        const id = String(profile?.id || '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80);
        if (!id || seen.has(id)) return;
        seen.add(id);
        profiles.push({
            id,
            name: String(profile.name || id).trim().slice(0, 80) || id,
            accountKey: String(profile.accountKey || ''),
            accountLabel: String(profile.accountLabel || ''),
            source: ['default', 'account', 'manual', 'imported'].includes(profile.source) ? profile.source : 'manual',
            createdAt: Number(profile.createdAt) || Date.now(),
            updatedAt: Number(profile.updatedAt) || Date.now()
        });
    });
    if (!profiles.some(profile => profile.id === 'default')) {
        profiles.unshift({ id: 'default', name: 'Default', accountKey: '', accountLabel: '', source: 'default', createdAt: Date.now(), updatedAt: Date.now() });
    }
    const activeProfileId = profiles.some(profile => profile.id === source.activeProfileId) ? source.activeProfileId : profiles[0].id;
    return { version: PROFILE_SCHEMA_VERSION, activeProfileId, profiles };
}

function profileMeta(registry, profileId) {
    return registry.profiles.find(profile => profile.id === profileId) || null;
}

async function loadProfileSnapshot(profileId) {
    const rawPrompts = await GM_getValue(profileDataKey(GM_PROFILE_PROMPTS_PREFIX, profileId), null);
    const rawSettings = await GM_getValue(profileDataKey(GM_PROFILE_SETTINGS_PREFIX, profileId), null);
    const rawHistory = await GM_getValue(profileDataKey(GM_PROFILE_HISTORY_PREFIX, profileId), null);
    let prompts = rawPrompts;
    if (typeof prompts === 'string') {
        try { prompts = JSON.parse(prompts); } catch (_error) { prompts = {}; }
    }
    if (!prompts || typeof prompts !== 'object' || Array.isArray(prompts)) prompts = {};
    return {
        prompts: cloneValue(prompts),
        settings: normalizeProfileSettings(rawSettings),
        history: rawHistory && typeof rawHistory === 'object' && !Array.isArray(rawHistory) ? cloneValue(rawHistory) : {}
    };
}

async function saveProfileSnapshot(profileId, snapshot) {
    await Promise.all([
        GM_setValue(profileDataKey(GM_PROFILE_PROMPTS_PREFIX, profileId), snapshot.prompts || {}),
        GM_setValue(profileDataKey(GM_PROFILE_SETTINGS_PREFIX, profileId), sanitizeProfileSettings(snapshot.settings)),
        GM_setValue(profileDataKey(GM_PROFILE_HISTORY_PREFIX, profileId), snapshot.history || {})
    ]);
}

async function saveProfileRegistry() {
    await GM_setValue(GM_PROFILES_KEY, state.profileRegistry);
}

export function getActiveProfile() {
    return state.profileRegistry.profiles.find(profile => profile.id === state.profileRegistry.activeProfileId) || state.profileRegistry.profiles[0] || null;
}

export async function saveActiveProfilePrompts() {
    if (!state.profilesReady) return;
    await GM_setValue(profileDataKey(GM_PROFILE_PROMPTS_PREFIX, state.profileRegistry.activeProfileId), cloneValue(state.currentPrompts));
}

export async function saveActiveProfileSettings() {
    if (!state.profilesReady) return;
    await GM_setValue(profileDataKey(GM_PROFILE_SETTINGS_PREFIX, state.profileRegistry.activeProfileId), sanitizeProfileSettings(state.settings));
}

export async function saveActiveProfileHistory() {
    if (!state.profilesReady) return;
    await GM_setValue(profileDataKey(GM_PROFILE_HISTORY_PREFIX, state.profileRegistry.activeProfileId), cloneValue(state.promptHistory));
}

export async function saveActiveProfile() {
    if (!state.profilesReady) return;
    await saveProfileSnapshot(state.profileRegistry.activeProfileId, {
        prompts: state.currentPrompts,
        settings: state.settings,
        history: state.promptHistory
    });
    const active = getActiveProfile();
    if (active) active.updatedAt = Date.now();
    await saveProfileRegistry();
}

export async function initializeProfiles() {
    const storedRegistry = await GM_getValue(GM_PROFILES_KEY, null);
    const hadRegistry = storedRegistry && typeof storedRegistry === 'object' && !Array.isArray(storedRegistry);
    const registry = normalizeProfileRegistry(storedRegistry);
    const detected = detectGeminiAccount();
    let active = profileMeta(registry, registry.activeProfileId);
    const matchingAccount = detected.key ? registry.profiles.find(profile => profile.accountKey === detected.key) : null;

    if (matchingAccount) {
        if (registry.activeProfileId !== matchingAccount.id) {
            registry.activeProfileId = matchingAccount.id;
        }
        active = matchingAccount;
    } else if (detected.key && active && !active.accountKey && active.source === 'default' && registry.profiles.length === 1) {
        active.accountKey = detected.key;
        active.accountLabel = detected.label;
    } else if (detected.key && !matchingAccount && hadRegistry) {
        const accountProfile = {
            id: profileIdFromName(detected.label || 'account', 'account'),
            name: detected.label ? `Account (${detected.label})` : 'Google account',
            accountKey: detected.key,
            accountLabel: detected.label,
            source: 'account',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        registry.profiles.push(accountProfile);
        registry.activeProfileId = accountProfile.id;
        active = accountProfile;
    }

    active = profileMeta(registry, registry.activeProfileId) || registry.profiles[0];
    const existingProfilePrompts = await GM_getValue(profileDataKey(GM_PROFILE_PROMPTS_PREFIX, active.id), null);
    if (existingProfilePrompts === null || typeof existingProfilePrompts === 'undefined') {
        const seedCurrent = !hadRegistry || (active.id === 'default' && registry.profiles.length === 1);
        await saveProfileSnapshot(active.id, seedCurrent ? {
            prompts: state.currentPrompts,
            settings: state.settings,
            history: state.promptHistory
        } : {
            prompts: {},
            settings: defaultSettings,
            history: {}
        });
    }

    state.profileRegistry = registry;
    state.detectedProfileAccountKey = detected.key;
    state.profilesReady = true;
    const snapshot = await loadProfileSnapshot(registry.activeProfileId);
    state.currentPrompts = snapshot.prompts;
    state.settings = snapshot.settings;
    state.promptHistory = snapshot.history;
    await Promise.all([
        GM_setValue(GM_PROMPTS_KEY, JSON.stringify(state.currentPrompts)),
        GM_setValue(GM_SETTINGS_KEY, state.settings),
        GM_setValue(GM_HISTORY_KEY, state.promptHistory),
        saveProfileRegistry()
    ]);
    return getActiveProfile();
}

export async function switchProfile(profileId) {
    if (!state.profilesReady) throw new Error('Profiles are not initialized.');
    const target = profileMeta(state.profileRegistry, profileId);
    if (!target) throw new Error('Profile not found.');
    if (target.id === state.profileRegistry.activeProfileId) return target;
    await saveActiveProfile();
    state.profileRegistry.activeProfileId = target.id;
    const snapshot = await loadProfileSnapshot(target.id);
    state.currentPrompts = snapshot.prompts;
    state.settings = snapshot.settings;
    state.promptHistory = snapshot.history;
    await saveProfileRegistry();
    await Promise.all([
        GM_setValue(GM_PROMPTS_KEY, JSON.stringify(state.currentPrompts)),
        GM_setValue(GM_SETTINGS_KEY, state.settings),
        GM_setValue(GM_HISTORY_KEY, state.promptHistory)
    ]);
    return target;
}

export async function createManualProfile(name) {
    const normalizedName = String(name || '').trim().slice(0, 80);
    if (!normalizedName) throw new Error('Profile name is required.');
    if (state.profileRegistry.profiles.some(profile => profile.name.toLowerCase() === normalizedName.toLowerCase())) {
        throw new Error('A profile with that name already exists.');
    }
    await saveActiveProfile();
    const profile = { id: profileIdFromName(normalizedName), name: normalizedName, accountKey: '', accountLabel: '', source: 'manual', createdAt: Date.now(), updatedAt: Date.now() };
    state.profileRegistry.profiles.push(profile);
    await saveProfileSnapshot(profile.id, { prompts: {}, settings: defaultSettings, history: {} });
    await saveProfileRegistry();
    await switchProfile(profile.id);
    return profile;
}

export async function deleteActiveProfile() {
    if (state.profileRegistry.profiles.length <= 1) throw new Error('At least one profile must remain.');
    const removedId = state.profileRegistry.activeProfileId;
    await saveActiveProfile();
    state.profileRegistry.profiles = state.profileRegistry.profiles.filter(profile => profile.id !== removedId);
    const nextProfile = state.profileRegistry.profiles[0];
    state.profileRegistry.activeProfileId = nextProfile.id;
    await Promise.all([
        GM_deleteValue(profileDataKey(GM_PROFILE_PROMPTS_PREFIX, removedId)),
        GM_deleteValue(profileDataKey(GM_PROFILE_SETTINGS_PREFIX, removedId)),
        GM_deleteValue(profileDataKey(GM_PROFILE_HISTORY_PREFIX, removedId)),
        saveProfileRegistry()
    ]);
    const snapshot = await loadProfileSnapshot(nextProfile.id);
    state.currentPrompts = snapshot.prompts;
    state.settings = snapshot.settings;
    state.promptHistory = snapshot.history;
    await Promise.all([
        GM_setValue(GM_PROMPTS_KEY, JSON.stringify(state.currentPrompts)),
        GM_setValue(GM_SETTINGS_KEY, state.settings),
        GM_setValue(GM_HISTORY_KEY, state.promptHistory),
        saveProfileRegistry()
    ]);
    return nextProfile;
}

export async function exportProfiles(scope = 'active') {
    await saveActiveProfile();
    const selected = scope === 'all' ? state.profileRegistry.profiles : [getActiveProfile()];
    const profiles = [];
    for (const profile of selected.filter(Boolean)) {
        const snapshot = await loadProfileSnapshot(profile.id);
        profiles.push({ ...profile, prompts: snapshot.prompts, settings: sanitizeProfileSettings(snapshot.settings), history: snapshot.history });
    }
    return {
        kind: 'geminibuddy-profiles',
        schemaVersion: PROFILE_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        activeProfileId: state.profileRegistry.activeProfileId,
        profiles
    };
}

export async function importProfiles(payload) {
    if (!payload || payload.kind !== 'geminibuddy-profiles' || payload.schemaVersion !== PROFILE_SCHEMA_VERSION || !Array.isArray(payload.profiles) || payload.profiles.length === 0) {
        throw new Error('Invalid GeminiBuddy profile export.');
    }
    const imported = [];
    for (const entry of payload.profiles) {
        const name = String(entry.name || 'Imported profile').trim().slice(0, 80) || 'Imported profile';
        let candidate = name;
        let suffix = 2;
        while (state.profileRegistry.profiles.some(profile => profile.name.toLowerCase() === candidate.toLowerCase())) candidate = `${name} (${suffix++})`;
        const profile = { id: profileIdFromName(candidate, 'imported'), name: candidate, accountKey: '', accountLabel: '', source: 'imported', createdAt: Date.now(), updatedAt: Date.now() };
        const prompts = entry.prompts && typeof entry.prompts === 'object' && !Array.isArray(entry.prompts) ? entry.prompts : {};
        state.profileRegistry.profiles.push(profile);
        await saveProfileSnapshot(profile.id, { prompts, settings: entry.settings, history: entry.history });
        imported.push(profile);
    }
    await saveProfileRegistry();
    return imported;
}

export async function loadSettings() {
    let loadedSettings = await GM_getValue(GM_SETTINGS_KEY, defaultSettings);
    let migratedStorageKey = false;
    if (!loadedSettings || typeof loadedSettings !== 'object' || Array.isArray(loadedSettings)) {
        for (const legacyKey of LEGACY_SETTINGS_KEYS) {
            const legacySettings = await GM_getValue(legacyKey, null);
            if (!legacySettings || typeof legacySettings !== 'object' || Array.isArray(legacySettings)) continue;
            loadedSettings = legacySettings;
            await GM_setValue(GM_SETTINGS_KEY, loadedSettings);
            localStorage.removeItem(legacyKey);
            migratedStorageKey = true;
            break;
        }
    }
    loadedSettings = loadedSettings && typeof loadedSettings === 'object' && !Array.isArray(loadedSettings)
        ? { ...loadedSettings }
        : { ...defaultSettings };
    const legacySecrets = {
        geminiAPIKey: loadedSettings?.geminiAPIKey || '',
        gistToken: loadedSettings?.gistToken || ''
    };
    delete loadedSettings.geminiAPIKey;
    delete loadedSettings.gistToken;
    state.settings = { ...defaultSettings, ...loadedSettings };
    state.settings.colors = { ...defaultSettings.colors, ...(state.settings.colors || {}) };
    state.settings.groupColors = state.settings.groupColors || {};
    state.settings.groupOrder = state.settings.groupOrder || [];
    state.settings.tagOrder = state.settings.tagOrder || [];
    state.secrets = {
        geminiAPIKey: '',
        gistToken: '',
        ...(await GM_getLocalValue(GM_SECRETS_KEY, {}))
    };
    let migratedSecret = false;
    for (const key of Object.keys(legacySecrets)) {
        if (!state.secrets[key] && legacySecrets[key]) {
            state.secrets[key] = legacySecrets[key];
            migratedSecret = true;
        }
    }
    if (migratedSecret) await GM_setLocalValue(GM_SECRETS_KEY, state.secrets);
    if (legacySecrets.geminiAPIKey || legacySecrets.gistToken || migratedStorageKey) await GM_setValue(GM_SETTINGS_KEY, state.settings);
}

export async function saveSecrets() {
    await GM_setLocalValue(GM_SECRETS_KEY, state.secrets);
}

export async function clearSecret(key) {
    state.secrets[key] = '';
    await saveSecrets();
    await GM_deleteLocalValue(GM_SECRETS_KEY);
    if (state.secrets.geminiAPIKey || state.secrets.gistToken) await saveSecrets();
}

export async function saveSettings() {
    await GM_setValue(GM_SETTINGS_KEY, state.settings);
    await saveActiveProfileSettings();
    showToast("Settings saved!");
}

export async function loadHistory() {
    state.promptHistory = await GM_getValue(GM_HISTORY_KEY, {});
}

export async function saveHistory() {
    await GM_setValue(GM_HISTORY_KEY, state.promptHistory);
    await saveActiveProfileHistory();
}

export async function savePromptRollbackSnapshot(reason) {
    await GM_setValue(GM_ROLLBACK_KEY, {
        version: 1,
        reason,
        timestamp: Date.now(),
        prompts: JSON.parse(JSON.stringify(state.currentPrompts)),
        history: JSON.parse(JSON.stringify(state.promptHistory))
    });
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
