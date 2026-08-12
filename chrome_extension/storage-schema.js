(function(global) {
  'use strict';

  const defaultSettings = {
    themeName: 'dark',
    position: 'left',
    panelWidth: 320,
    gistURL: '',
    gistFileName: 'gemini-prompts.json',
    marketplaceURL: ''
  };

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

  function normalizeSettings(rawValue) {
    const parsed = parseJsonValue(rawValue, 'Settings');
    if (parsed === null || parsed === undefined) return { ...defaultSettings };
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Settings must be a JSON object.');
    }
    return { ...defaultSettings, ...parsed };
  }

  global.GeminiBuddyStorageSchema = Object.freeze({
    PROMPTS_KEY: 'gemini_custom_prompts_v6',
    SETTINGS_KEY: 'gemini_panel_settings_v25',
    HISTORY_KEY: 'gemini_prompt_history_v1',
    LEGACY_SETTINGS_KEYS: Object.freeze(['gemini_panel_settings_v24']),
    defaultSettings: Object.freeze(defaultSettings),
    normalizePromptLibrary,
    normalizeSettings
  });
})(globalThis);
