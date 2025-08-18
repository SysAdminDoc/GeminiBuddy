// Gemini Prompt Panel - Data Module (data.js)
// Responsibilities: State management, storage, fetching external data.

// --- CONFIG & KEYS ---
const DEFAULT_PROMPTS_URL = "https://raw.githubusercontent.com/SysAdminDoc/Gemini-Prompt-Panel/refs/heads/main/Prompts/defaultpromptlist.json";
const GM_PROMPTS_KEY = 'gemini_custom_prompts_v6';
const GM_SETTINGS_KEY = 'gemini_panel_settings_v24';
const GM_HISTORY_KEY = 'gemini_prompt_history_v1';
const FULL_WIDTH_STYLE_ID = 'gemini-panel-full-width-style';

// --- STATE & SETTINGS ---
let currentPrompts = {};
let promptHistory = {};
let settings = {};
let lastFetchedUrl = null;

const defaultSettings = {
    themeName: 'dark', position: 'left', topOffset: '90px', panelWidth: 320, handleWidth: 8, handleStyle: 'classic',
    fontFamily: 'Verdana, sans-serif', enableFullWidth: true, baseFontSize: '14px', condensedMode: false,
    collapsedCategories: [], favorites: [], groupOrder: [], tagOrder: [], initiallyCollapsed: false, copyButtonOrderSwapped: false,
    showTags: true, showPins: true, enableAIenhancer: true, geminiAPIKey: '', gistURL: '',
    enableMiniMode: true, groupByTags: true, autoCopyCodeOnCompletion: true,
    groupColors: {},
    colors: {
        '--panel-bg': '#2a2a2e', '--panel-text': '#e0e0e0', '--panel-header-bg': '#3a3a3e', '--panel-border': '#4a4a4e',
        '--input-bg': '#3c3c41', '--input-text': '#f0f0f0', '--input-border': '#5a5a5e',
        '--handle-color': '#28a745', '--handle-hover-color': '#34c759', '--favorite-color': '#FFD700', '--pin-color': '#34c759', '--ai-color': '#8A2BE2'
    }
};
const presetThemes = {
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

// --- SETTINGS & PROMPT FUNCTIONS ---
async function loadSettings() {
    let loadedSettings = await GM_getValue(GM_SETTINGS_KEY, defaultSettings);
    settings = { ...defaultSettings, ...loadedSettings };
    settings.colors = { ...defaultSettings.colors, ...(settings.colors || {}) };
    settings.groupColors = settings.groupColors || {};
    settings.groupOrder = settings.groupOrder || [];
    settings.tagOrder = settings.tagOrder || [];
}

async function saveSettings() {
    await GM_setValue(GM_SETTINGS_KEY, settings);
}

function savePrompts() {
    GM_setValue(GM_PROMPTS_KEY, JSON.stringify(currentPrompts));
}

function ensurePromptIDs(prompts) {
    Object.values(prompts).flat().forEach((p, i) => {
        p.id = p.id || `prompt-${Date.now()}-${i}`;
    });
}

function fetchDefaultPrompts() {
    return new Promise((resolve) => {
         GM_xmlhttpRequest({
            method: "GET",
            url: DEFAULT_PROMPTS_URL,
            onload: async function(response) {
                try {
                    const prompts = JSON.parse(response.responseText);
                    if (typeof prompts !== 'object' || prompts === null) throw new Error("Invalid format");
                    const newGroupName = "Default Prompts";
                    currentPrompts[newGroupName] = Object.values(prompts).flat();
                    ensurePromptIDs(currentPrompts);

                    if (!settings.groupOrder.includes(newGroupName)) {
                        settings.groupOrder.push(newGroupName);
                    }
                    await savePrompts();
                    await saveSettings();
                    resolve();
                } catch (e) {
                    console.error("Failed to process default prompts:", e);
                    resolve();
                }
            },
            onerror: function(response) {
                console.error("Error fetching default prompts:", response.statusText);
                resolve();
            }
        });
    });
}

// --- SYNC FEATURES ---
async function syncFromGist(isManual = false) {
    if (!settings.gistURL) {
        if (isManual) showToast("Please provide a Gist URL in settings.", 2500, 'error');
        return;
    }
    const gistIdMatch = settings.gistURL.match(/gist\.github\.com\/[a-zA-Z0-9_-]+\/([a-f0-9]+)/);
    if (!gistIdMatch) {
        if (isManual) showToast("Invalid Gist URL format.", 2500, 'error');
        return;
    }
    const gistId = gistIdMatch[1];
    if (isManual) showToast("Syncing from Gist...", 2000);

    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: "GET",
            url: `https://api.github.com/gists/${gistId}`,
            onload: function(response) {
                try {
                    const gistData = JSON.parse(response.responseText);
                    const file = Object.values(gistData.files)[0];
                    if (file && file.content) {
                        const newPrompts = JSON.parse(file.content);
                        const doSync = isManual ? confirm("Gist data found. Replace all current prompts with the synced data? This cannot be undone.") : true;
                        if (doSync) {
                            currentPrompts = newPrompts;
                            savePrompts();
                            if (isManual) showToast("Sync successful!", 2000, 'success');
                            resolve(true); // Indicate that a sync happened
                        } else {
                            reject(new Error("Sync cancelled by user."));
                        }
                    } else {
                        throw new Error("No content found in Gist file.");
                    }
                } catch (e) {
                    if (isManual) showToast("Failed to parse Gist content: " + e.message, 3000, 'error');
                    reject(e);
                }
            },
            onerror: function(response) {
                if (isManual) showToast("Error fetching Gist: " + response.statusText, 3000, 'error');
                reject(new Error(response.statusText));
            }
        });
    });
}

// --- VERSION HISTORY ---
async function loadHistory() {
    promptHistory = await GM_getValue(GM_HISTORY_KEY, {});
}

async function saveHistory() {
    await GM_setValue(GM_HISTORY_KEY, promptHistory);
}

function addHistoryEntry(promptId, oldText) {
    if (!promptHistory[promptId]) {
        promptHistory[promptId] = [];
    }
    promptHistory[promptId].unshift({ timestamp: Date.now(), text: oldText });
    if (promptHistory[promptId].length > 10) {
        promptHistory[promptId].pop();
    }
    saveHistory();
}
