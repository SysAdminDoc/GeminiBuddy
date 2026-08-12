(function(global) {
  'use strict';

  const PROJECT_VERSION = '53.0.0';
  const PROMPTS_KEY = 'gemini_custom_prompts_v6';
  const SETTINGS_KEY = 'gemini_panel_settings_v25';
  const HISTORY_KEY = 'gemini_prompt_history_v1';
  const PROFILES_KEY = 'gemini_prompt_profiles_v1';
  const LEGACY_PROMPT_KEYS = Object.freeze(['gemini_custom_prompts_v5', 'gemini_custom_prompts_v2']);
  const LEGACY_SETTINGS_KEYS = Object.freeze(['gemini_panel_settings_v24']);
  const STORAGE_MIGRATIONS = Object.freeze([
    Object.freeze({ currentKey: PROMPTS_KEY, legacyKeys: LEGACY_PROMPT_KEYS, kind: 'prompt-library' }),
    Object.freeze({ currentKey: SETTINGS_KEY, legacyKeys: LEGACY_SETTINGS_KEYS, kind: 'settings' })
  ]);

  const defaultSettings = {
    themeName: 'dark',
    position: 'left',
    panelWidth: 320,
    gistURL: '',
    gistFileName: 'gemini-prompts.json',
    marketplaceURL: '',
    allowedImportOrigins: []
  };
  const PROMPT_EXPORT_SCHEMA_VERSION = 1;

  function normalizeAllowedImportOrigins(values) {
    const input = Array.isArray(values) ? values : String(values || '').split(',');
    return [...new Set(input.map(value => {
      try {
        const url = new URL(String(value).trim());
        return url.protocol === 'https:' ? url.origin : '';
      } catch (_error) {
        return '';
      }
    }).filter(Boolean))];
  }

  function parseJsonValue(rawValue, label) {
    if (typeof rawValue !== 'string') return rawValue;
    if (!rawValue.trim()) return null;
    try {
      return JSON.parse(rawValue);
    } catch (error) {
      throw new Error(`${label} contains invalid JSON.`);
    }
  }

  function normalizePromptLibrary(rawValue) {
    const parsed = parseJsonValue(rawValue, 'Prompt library');
    if (parsed === null || parsed === undefined) return {};
    if (parsed && !Array.isArray(parsed) && parsed.schemaVersion !== undefined) return normalizePromptLibrary(parsed.prompts);
    if (Array.isArray(parsed)) {
      return parsed.length ? { 'Imported Prompts': parsed } : {};
    }
    if (typeof parsed !== 'object') {
      throw new Error('Prompt library must be a grouped JSON object or array.');
    }

    const groups = {};
    Object.entries(parsed).forEach(([groupName, prompts]) => {
      if (!Array.isArray(prompts)) {
        throw new Error(`Prompt group "${groupName}" must contain an array.`);
      }
      groups[groupName] = prompts;
    });
    return groups;
  }

  async function hashPromptExportPayload(payload) {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle || typeof TextEncoder === 'undefined') throw new Error('SHA-256 is unavailable in this browser.');
    const digest = await subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function createPromptExport(promptGroups) {
    const payload = {
      schemaVersion: PROMPT_EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      prompts: normalizePromptLibrary(promptGroups)
    };
    const checksum = await hashPromptExportPayload(payload);
    return {
      ...payload,
      manifest: {
        algorithm: 'SHA-256',
        checksum,
        groupCount: Object.keys(payload.prompts).length,
        promptCount: Object.values(payload.prompts).flat().length
      }
    };
  }

  async function parsePromptImport(rawValue) {
    const parsed = parseJsonValue(rawValue, 'Prompt import');
    if (parsed?.schemaVersion !== undefined) {
      if (!parsed.manifest?.checksum) throw new Error('Verified exports must include a checksum manifest.');
      const expected = await hashPromptExportPayload({
        schemaVersion: parsed.schemaVersion,
        exportedAt: parsed.exportedAt,
        prompts: parsed.prompts
      });
      if (expected !== parsed.manifest.checksum) throw new Error('Export checksum verification failed.');
    }
    const prompts = normalizePromptLibrary(parsed);
    const promptCount = Object.values(prompts).flat().length;
    if (!promptCount) throw new Error('No prompts found in import.');
    return { prompts, promptCount, groupCount: Object.keys(prompts).length, rejected: [] };
  }

  function normalizeSettings(rawValue) {
    const parsed = parseJsonValue(rawValue, 'Settings');
    if (parsed === null || parsed === undefined) return { ...defaultSettings };
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Settings must be a JSON object.');
    }
    const { geminiAPIKey: _legacyApiKey, gistToken: _legacyGistToken, ...safeSettings } = parsed;
    return {
      ...defaultSettings,
      ...safeSettings,
      allowedImportOrigins: normalizeAllowedImportOrigins(safeSettings.allowedImportOrigins)
    };
  }

  global.GeminiBuddyStorageSchema = Object.freeze({
    PROJECT_VERSION,
    PROMPTS_KEY,
    SETTINGS_KEY,
    HISTORY_KEY,
    PROFILES_KEY,
    LEGACY_PROMPT_KEYS,
    LEGACY_SETTINGS_KEYS,
    STORAGE_MIGRATIONS,
    defaultSettings: Object.freeze(defaultSettings),
    normalizePromptLibrary,
    normalizeSettings,
    normalizeAllowedImportOrigins,
    PROMPT_EXPORT_SCHEMA_VERSION,
    createPromptExport,
    parsePromptImport
  });
})(globalThis);
