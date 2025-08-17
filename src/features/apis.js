// /src/features/api.js

import { GM_xmlhttpRequest } from '../GM_wrappers.js';
import { state, saveSettings } from '../state.js';
import { savePrompts, ensurePromptIDs, loadAndDisplayPrompts } from './prompts.js';
import { DEFAULT_PROMPTS_URL } from '../config.js';
import { showToast } from '../utils.js';

export function fetchDefaultPrompts() {
    return new Promise((resolve) => {
        GM_xmlhttpRequest({
            method: "GET",
            url: DEFAULT_PROMPTS_URL,
            onload: async function(response) {
                try {
                    const prompts = JSON.parse(response.responseText);
                    if (typeof prompts !== 'object' || prompts === null) throw new Error("Invalid format");
                    const newGroupName = "Default Prompts";
                    state.currentPrompts[newGroupName] = Object.values(prompts).flat();
                    ensurePromptIDs(state.currentPrompts);

                    if (!state.settings.groupOrder.includes(newGroupName)) {
                        state.settings.groupOrder.push(newGroupName);
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

export async function syncFromGist(isManual = false) {
    if (!state.settings.gistURL) {
        if (isManual) showToast("Please provide a Gist URL in settings.", 2500, 'error');
        return;
    }
    const gistIdMatch = state.settings.gistURL.match(/gist\.github\.com\/[a-zA-Z0-9_-]+\/([a-f0-9]+)/);
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
                            state.currentPrompts = newPrompts;
                            savePrompts();
                            loadAndDisplayPrompts(true);
                            if (isManual) showToast("Sync successful!", 2000, 'success');
                            resolve();
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

export async function callGeminiAPI(prompt) {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${state.settings.geminiAPIKey}`;
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error.message);
    }
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}