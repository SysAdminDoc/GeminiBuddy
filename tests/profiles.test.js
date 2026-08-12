import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const stateSource = await readFile(new URL('../chrome_extension/src/state.js', import.meta.url), 'utf8');
const rootSource = await readFile(new URL('../GeminiBuddy.user.js', import.meta.url), 'utf8');

function createProfileHarness() {
    const values = new Map();
    const defaultSettings = {
        themeName: 'dark',
        position: 'left',
        panelWidth: 320,
        groupOrder: [],
        tagOrder: [],
        collapsedCategories: [],
        favorites: [],
        allowedImportOrigins: [],
        colors: { '--panel-bg': '#2a2a2e' },
        groupColors: []
    };
    const source = stateSource
        .split('\n')
        .filter(line => !line.startsWith('import '))
        .join('\n')
        .replaceAll('export const ', 'const ')
        .replaceAll('export async function ', 'async function ')
        .replaceAll('export function ', 'function ')
        + '\n globalThis.profileApi = { state, initializeProfiles, createManualProfile, switchProfile, exportProfiles, importProfiles, saveActiveProfilePrompts };';
    const sandbox = {
        console,
        document: { querySelectorAll: () => [] },
        defaultSettings,
        GM_getValue: async (key, fallback) => values.has(key) ? values.get(key) : fallback,
        GM_setValue: async (key, value) => { values.set(key, value); },
        GM_deleteValue: async key => { values.delete(key); },
        GM_getLocalValue: async (_key, fallback) => fallback,
        GM_setLocalValue: async () => {},
        GM_deleteLocalValue: async () => {},
        showToast: () => {},
        GM_PROMPTS_KEY: 'gemini_custom_prompts_v6',
        GM_SETTINGS_KEY: 'gemini_panel_settings_v25',
        GM_HISTORY_KEY: 'gemini_prompt_history_v1',
        GM_PROFILES_KEY: 'gemini_prompt_profiles_v1',
        GM_PROFILE_PROMPTS_PREFIX: 'gemini_prompt_profile_prompts_v1_',
        GM_PROFILE_SETTINGS_PREFIX: 'gemini_prompt_profile_settings_v1_',
        GM_PROFILE_HISTORY_PREFIX: 'gemini_prompt_profile_history_v1_',
        GM_ROLLBACK_KEY: 'gemini_prompt_rollback_v1',
        GM_SECRETS_KEY: 'gemini_local_secrets_v1',
        LEGACY_SETTINGS_KEYS: [],
        localStorage: { removeItem() {} },
        JSON,
        Date,
        Math,
        String,
        Number,
        Object,
        Array,
        Set,
        Promise,
        parseInt,
        isNaN,
        Intl
    };
    vm.createContext(sandbox);
    vm.runInContext(source, sandbox);
    return { api: sandbox.profileApi, values };
}

test('profiles migrate the existing library, isolate switches, and round-trip exports', async () => {
    const { api, values } = createProfileHarness();
    api.state.currentPrompts = { Work: [{ id: 'work-1', name: 'Work', text: 'Work prompt' }] };
    api.state.settings = { themeName: 'dark', groupOrder: ['Work'] };
    api.state.promptHistory = {};

    await api.initializeProfiles();
    assert.equal(api.state.profileRegistry.activeProfileId, 'default');
    assert.deepEqual(JSON.parse(JSON.stringify(api.state.currentPrompts)), { Work: [{ id: 'work-1', name: 'Work', text: 'Work prompt' }] });
    assert.ok(values.has('gemini_prompt_profiles_v1'));

    await api.createManualProfile('Personal');
    assert.deepEqual(JSON.parse(JSON.stringify(api.state.currentPrompts)), {});
    api.state.currentPrompts = { Personal: [{ id: 'personal-1', name: 'Personal', text: 'Personal prompt' }] };
    await api.saveActiveProfilePrompts();
    await api.switchProfile('default');
    assert.deepEqual(JSON.parse(JSON.stringify(api.state.currentPrompts)), { Work: [{ id: 'work-1', name: 'Work', text: 'Work prompt' }] });

    const allProfiles = await api.exportProfiles('all');
    assert.equal(allProfiles.profiles.length, 2);
    assert.equal(allProfiles.profiles.find(profile => profile.name === 'Personal').prompts.Personal[0].text, 'Personal prompt');
    const imported = await api.importProfiles({ ...allProfiles, profiles: [allProfiles.profiles[0]] });
    assert.equal(imported.length, 1);
    assert.equal(api.state.profileRegistry.profiles.length, 3);
});

test('both runtime surfaces expose the profile storage and transfer contract', () => {
    for (const source of [rootSource, stateSource]) {
        assert.match(source, /GM_PROFILES_KEY/);
        assert.match(source, /accountFingerprint|accountFingerprint/);
        assert.match(source, /exportProfiles|exportPromptProfiles/);
        assert.match(source, /importProfiles|importPromptProfiles/);
        assert.match(source, /switchProfile|switchPromptProfile/);
    }
});
