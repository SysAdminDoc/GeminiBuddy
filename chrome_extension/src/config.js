// /src/config.js

export const DEFAULT_PROMPTS_URL = "https://raw.githubusercontent.com/SysAdminDoc/Gemini-Prompt-Panel/refs/heads/main/Prompts/defaultpromptlist.json";
export const PROJECT_VERSION = '54.0.1';
export const GM_PROMPTS_KEY = 'gemini_custom_prompts_v6';
export const GM_SETTINGS_KEY = 'gemini_panel_settings_v25';
export const GM_HISTORY_KEY = 'gemini_prompt_history_v1';
export const GM_PROFILES_KEY = 'gemini_prompt_profiles_v1';
export const GM_PROFILE_PROMPTS_PREFIX = 'gemini_prompt_profile_prompts_v1_';
export const GM_PROFILE_SETTINGS_PREFIX = 'gemini_prompt_profile_settings_v1_';
export const GM_PROFILE_HISTORY_PREFIX = 'gemini_prompt_profile_history_v1_';
export const LEGACY_PROMPT_KEYS = Object.freeze(['gemini_custom_prompts_v5', 'gemini_custom_prompts_v2']);
export const LEGACY_SETTINGS_KEYS = Object.freeze(['gemini_panel_settings_v24']);
export const STORAGE_MIGRATIONS = Object.freeze([
    Object.freeze({ currentKey: GM_PROMPTS_KEY, legacyKeys: LEGACY_PROMPT_KEYS, kind: 'prompt-library' }),
    Object.freeze({ currentKey: GM_SETTINGS_KEY, legacyKeys: LEGACY_SETTINGS_KEYS, kind: 'settings' })
]);
export const GM_ROLLBACK_KEY = 'gemini_prompt_rollback_v1';
export const GM_SECRETS_KEY = 'gemini_local_secrets_v1';
export const FULL_WIDTH_STYLE_ID = 'gemini-panel-full-width-style';

export const FULL_WIDTH_CSS = `
    html, html > user-query { max-width: none !important; }
    div.conversation-container { max-width: none !important; }
    div.input-area-container ~ hallucination-disclaimer { display: none !important; }
    div.input-area-container { padding-bottom: 0.5rem !important; }
    div.avatar-gutter { display: none !important; }
`;

export const CANVAS_DOWNLOAD_CONFIG = {
    TITLE_SELECTOR: "code-immersive-panel > toolbar > div > div.left-panel > h2.title-text.gds-title-s.ng-star-inserted",
    SHARE_BUTTON_SELECTOR: "toolbar div.action-buttons share-button > button",
    COPY_BUTTON_SELECTOR: "copy-button[data-test-id='copy-button'] > button.copy-button",
    DEFAULT_EXTENSION: "txt",
    // REGEX
    // eslint-disable-next-line no-control-regex
    INVALID_CHARS_REGEX: /[<>:"/\\|?*\x00-\x1F]/g,
    RESERVED_NAMES_REGEX: /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i,
    FILENAME_WITH_EXT_REGEX: /^(.+)\.([a-zA-Z0-9]{1,8})$/,
    SUBSTRING_FILENAME_REGEX: /([\w\s.,\-()[\\]{}'!~@#$%^&+=]+?\.([a-zA-Z0-9]{1,8}))(?=\s|$|[,.;:!?])/g
};

export const defaultSettings = {
    themeName: 'dark', position: 'left', topOffset: '90px', panelWidth: 320, handleWidth: 8, handleStyle: 'classic',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', enableFullWidth: true, baseFontSize: '14px', condensedMode: false,
    collapsedCategories: [], favorites: [], groupOrder: [], tagOrder: [], initiallyCollapsed: false, copyButtonOrderSwapped: false,
    showTags: true, showPins: true, enableAIenhancer: true, gistURL: '', marketplaceURL: '', marketplaceCatalogs: [],
    allowedImportOrigins: [],
    enableMiniMode: true, groupByTags: true, autoCopyCodeOnCompletion: true,
    settingsTheme: 'dark',
    groupColors: {},
    colors: {
        '--panel-bg': '#0b1220', '--panel-text': '#e8f1ff', '--panel-header-bg': '#111c30', '--panel-border': '#27405f',
        '--input-bg': '#0f1a2c', '--input-text': '#f7fbff', '--input-border': '#315173',
        '--handle-color': '#22d3ee', '--handle-hover-color': '#67e8f9', '--favorite-color': '#fbbf24', '--pin-color': '#34d399', '--ai-color': '#a78bfa'
    }
};

export const presetThemes = {
    dark: { ...defaultSettings.colors },
    light: {
        '--panel-bg': '#f4f4f5', '--panel-text': '#1f2937', '--panel-header-bg': '#e4e4e7', '--panel-border': '#d4d4d8',
        '--input-bg': '#ffffff', '--input-text': '#111827', '--input-border': '#d1d5db',
        '--handle-color': '#007aff', '--handle-hover-color': '#0095ff', '--favorite-color': '#ffab00', '--pin-color': '#34c759', '--ai-color': '#5856d6'
    },
    glass: {
        '--panel-bg': 'rgba(11, 18, 32, 0.96)', '--panel-text': '#f5f9ff', '--panel-header-bg': 'rgba(17, 28, 48, 0.98)', '--panel-border': 'rgba(103, 232, 249, 0.28)',
        '--input-bg': 'rgba(7, 17, 30, 0.96)', '--input-text': '#f5f9ff', '--input-border': 'rgba(103, 232, 249, 0.35)',
        '--handle-color': '#22d3ee', '--handle-hover-color': '#a5f3fc', '--favorite-color': '#fbbf24', '--pin-color': '#34d399', '--ai-color': '#c4b5fd'
    },
    hacker: {
        '--panel-bg': '#0a0a0a', '--panel-text': '#00ff41', '--panel-header-bg': '#1a1a1a', '--panel-border': '#00ff41',
        '--input-bg': '#1c1c1c', '--input-text': '#00ff41', '--input-border': '#008f11',
        '--handle-color': '#00ff41', '--handle-hover-color': '#50ff81', '--favorite-color': '#00ff41', '--pin-color': '#00ff41', '--ai-color': '#00ff41'
    }
};
