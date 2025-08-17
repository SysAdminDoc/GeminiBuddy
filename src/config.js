// /src/config.js

export const DEFAULT_PROMPTS_URL = "https://raw.githubusercontent.com/SysAdminDoc/Gemini-Prompt-Panel/refs/heads/main/Prompts/defaultpromptlist.json";
export const GM_PROMPTS_KEY = 'gemini_custom_prompts_v6';
export const GM_SETTINGS_KEY = 'gemini_panel_settings_v25';
export const GM_HISTORY_KEY = 'gemini_prompt_history_v1';
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
    fontFamily: 'Verdana, sans-serif', enableFullWidth: true, baseFontSize: '14px', condensedMode: false,
    collapsedCategories: [], favorites: [], groupOrder: [], tagOrder: [], initiallyCollapsed: false, copyButtonOrderSwapped: false,
    showTags: true, showPins: true, enableAIenhancer: true, geminiAPIKey: '', gistURL: '',
    enableMiniMode: true, groupByTags: true, autoCopyCodeOnCompletion: true,
    settingsTheme: 'dark',
    groupColors: {},
    colors: {
        '--panel-bg': '#2a2a2e', '--panel-text': '#e0e0e0', '--panel-header-bg': '#3a3a3e', '--panel-border': '#4a4a4e',
        '--input-bg': '#3c3c41', '--input-text': '#f0f0f0', '--input-border': '#5a5a5e',
        '--handle-color': '#28a745', '--handle-hover-color': '#34c759', '--favorite-color': '#FFD700', '--pin-color': '#34c759', '--ai-color': '#8A2BE2'
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
        '--panel-bg': 'rgba(30, 30, 35, 0.6)', '--panel-text': '#f5f5f5', '--panel-header-bg': 'rgba(58, 58, 62, 0.7)', '--panel-border': 'rgba(255, 255, 255, 0.2)',
        '--input-bg': 'rgba(0, 0, 0, 0.25)', '--input-text': '#f5f5f5', '--input-border': 'rgba(255, 255, 255, 0.3)',
        '--handle-color': '#00ffc8', '--handle-hover-color': '#60ffdf', '--favorite-color': '#FFD700', '--pin-color': '#34c759', '--ai-color': '#bf5af2'
    },
    hacker: {
        '--panel-bg': '#0a0a0a', '--panel-text': '#00ff41', '--panel-header-bg': '#1a1a1a', '--panel-border': '#00ff41',
        '--input-bg': '#1c1c1c', '--input-text': '#00ff41', '--input-border': '#008f11',
        '--handle-color': '#00ff41', '--handle-hover-color': '#50ff81', '--favorite-color': '#00ff41', '--pin-color': '#00ff41', '--ai-color': '#00ff41'
    }
};