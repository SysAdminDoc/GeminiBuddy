// /src/features/api.js

import { GM_xmlhttpRequest } from '../GM_wrappers.js';
import { state, saveSettings, savePromptRollbackSnapshot, recordDiagnosticEvent } from '../state.js';
import { savePrompts, ensurePromptIDs, loadAndDisplayPrompts } from './prompts.js';
import { normalizePromptImport, mergePromptGroups } from './transfer.js';
import { DEFAULT_PROMPTS_URL } from '../config.js';
import { showToast, showDecisionDialog } from '../utils.js';
import { authorizeRemoteUrl } from '../network.js';

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
                    recordDiagnosticEvent('default-prompts', 'error', e.message);
                    console.error("Failed to process default prompts:", e);
                    resolve();
                }
            },
            onerror: function(response) {
                recordDiagnosticEvent('default-prompts', 'error', response.statusText);
                console.error("Error fetching default prompts:", response.statusText);
                resolve();
            }
        });
    });
}

export async function syncFromGist(isManual = false) {
    if (!state.settings.gistURL) {
        recordDiagnosticEvent('sync', 'error', 'Gist URL is not configured.');
        if (isManual) showToast("Please provide a Gist URL in settings.", 2500, 'error');
        return;
    }
    const gistIdMatch = state.settings.gistURL.match(/gist\.github\.com\/[a-zA-Z0-9_-]+\/([a-f0-9]+)/);
    if (!gistIdMatch) {
        recordDiagnosticEvent('sync', 'error', 'Invalid Gist URL format.');
        if (isManual) showToast("Invalid Gist URL format.", 2500, 'error');
        return;
    }
    const gistId = gistIdMatch[1];
    if (isManual) showToast("Syncing from Gist...", 2000);

    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: "GET",
            url: `https://api.github.com/gists/${gistId}`,
            onload: async function(response) {
                try {
                    const gistData = JSON.parse(response.responseText);
                    const file = Object.values(gistData.files)[0];
                    if (file && file.content) {
                        const newPrompts = JSON.parse(file.content);
                        const doSync = isManual ? await showDecisionDialog({
                            title: 'Replace local prompts?',
                            message: 'Gist data is ready. Replace all local prompts? A rollback snapshot will be saved first.',
                            confirmLabel: 'Replace prompts',
                            destructive: true
                        }) : true;
                        if (doSync) {
                            await savePromptRollbackSnapshot('gist-replace');
                            state.currentPrompts = newPrompts;
                            savePrompts();
                            loadAndDisplayPrompts(true);
                            if (isManual) showToast("Sync successful!", 2000, 'success');
                            recordDiagnosticEvent('sync', 'success', 'Gist prompts loaded.');
                            resolve();
                        } else {
                            reject(new Error("Sync cancelled by user."));
                        }
                    } else {
                        throw new Error("No content found in Gist file.");
                    }
                } catch (e) {
                    recordDiagnosticEvent('sync', 'error', e.message);
                    if (isManual) showToast("Failed to parse Gist content: " + e.message, 3000, 'error');
                    reject(e);
                }
            },
            onerror: function(response) {
                recordDiagnosticEvent('sync', 'error', response.statusText);
                if (isManual) showToast("Error fetching Gist: " + response.statusText, 3000, 'error');
                reject(new Error(response.statusText));
            }
        });
    });
}

export async function callGeminiAPI(prompt) {
    if (!state.secrets.geminiAPIKey) {
        recordDiagnosticEvent('api', 'error', 'Google AI API key is not configured.');
        throw new Error('Google AI API key is not configured.');
    }
    const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': state.secrets.geminiAPIKey
        },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    if (!response.ok) {
        const error = await response.json();
        recordDiagnosticEvent('api', 'error', error.error?.message || `HTTP ${response.status}`);
        throw new Error(error.error.message);
    }
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

function catalogSourceName(data, sourceUrl) {
    try {
        const hostname = new URL(sourceUrl).hostname.replace(/^www\./, '');
        return String(data?.catalogName || data?.sourceName || data?.name || data?.title || hostname || 'Marketplace catalog').trim();
    } catch (_error) {
        return String(data?.catalogName || data?.sourceName || data?.name || data?.title || 'Marketplace catalog').trim();
    }
}

export function buildMarketplaceCatalog(data, sourceUrl, existingPrompts = {}, previousCatalog = null) {
    const preview = normalizePromptImport(data);
    const incoming = Object.values(preview.groups).flat();
    const existingById = new Map(Object.values(existingPrompts || {}).flat().filter(Boolean).map(prompt => [String(prompt.id || ''), prompt]));
    const duplicatePrompts = incoming.filter(prompt => existingById.has(String(prompt.id || '')));
    const changedPrompts = duplicatePrompts
        .filter(prompt => existingById.get(String(prompt.id || '')).text !== prompt.text || existingById.get(String(prompt.id || '')).name !== prompt.name)
        .map(prompt => ({ id: prompt.id, name: prompt.name }))
        .slice(0, 20);
    return {
        id: String(sourceUrl),
        sourceUrl: String(sourceUrl),
        sourceName: catalogSourceName(data, sourceUrl),
        schemaVersion: Number(data?.catalogSchemaVersion ?? data?.schemaVersion ?? data?.version ?? 1),
        updatedAt: String(data?.updatedAt || data?.updated_at || data?.lastUpdated || '').trim() || null,
        fetchedAt: new Date().toISOString(),
        groupCount: Object.keys(preview.groups).length,
        promptCount: incoming.length,
        duplicateCount: duplicatePrompts.length,
        changedPrompts,
        rejectedCount: preview.rejected.length,
        adjustedIdCount: preview.adjustedIds.length,
        pinned: previousCatalog?.pinned === true,
        groups: preview.groups
    };
}

function marketplacePreviewMessage(catalog) {
    const changed = catalog.changedPrompts.length
        ? `Changed prompts: ${catalog.changedPrompts.map(prompt => prompt.name).join(', ')}${catalog.changedPrompts.length >= 20 ? ', …' : ''}.`
        : 'Changed prompts: none.';
    return [
        `Source: ${catalog.sourceName}`,
        `URL: ${catalog.sourceUrl}`,
        `Schema: ${catalog.schemaVersion} · Updated: ${catalog.updatedAt || 'not supplied'}`,
        `Items: ${catalog.promptCount} in ${catalog.groupCount} groups · Duplicates: ${catalog.duplicateCount}`,
        `Rejected: ${catalog.rejectedCount} · Repaired IDs: ${catalog.adjustedIdCount}`,
        changed,
        'Approve this catalog to merge its prompts into the active library.'
    ].join('\n');
}

function upsertMarketplaceCatalog(catalog) {
    const existing = Array.isArray(state.settings.marketplaceCatalogs) ? state.settings.marketplaceCatalogs : [];
    const index = existing.findIndex(item => item.id === catalog.id || item.sourceUrl === catalog.sourceUrl);
    const metadata = { ...catalog, groups: catalog.groups };
    if (index >= 0) existing.splice(index, 1, metadata);
    else existing.push(metadata);
    state.settings.marketplaceCatalogs = existing;
}

export async function importMarketplaceCatalog(sourceUrl = state.settings.marketplaceURL) {
    const url = String(sourceUrl || '').trim();
    if (!url) throw new Error('Please provide a marketplace JSON URL.');
    if (!(await authorizeRemoteUrl(url, state.settings.allowedImportOrigins))) throw new Error('Marketplace imports require an allowed HTTPS origin or browser permission.');
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'GET',
            url,
            onload: async response => {
                try {
                    const data = JSON.parse(response.responseText);
                    const previous = (state.settings.marketplaceCatalogs || []).find(item => item.sourceUrl === url);
                    const catalog = buildMarketplaceCatalog(data, url, state.currentPrompts, previous);
                    const approved = await showDecisionDialog({ title: 'Review marketplace catalog', message: marketplacePreviewMessage(catalog), confirmLabel: 'Import catalog' });
                    if (!approved) {
                        recordDiagnosticEvent('marketplace', 'cancelled', url);
                        resolve(false);
                        return;
                    }
                    await savePromptRollbackSnapshot('marketplace-catalog-import');
                    mergePromptGroups(state.currentPrompts, catalog.groups);
                    ensurePromptIDs(state.currentPrompts);
                    upsertMarketplaceCatalog(catalog);
                    await Promise.all([savePrompts(), saveSettings()]);
                    renderAllPrompts();
                    recordDiagnosticEvent('marketplace', 'success', `Imported ${catalog.promptCount} prompts from ${catalog.sourceName}.`);
                    showToast(`Imported ${catalog.promptCount} verified marketplace prompts.`, 2500, 'success');
                    resolve(catalog);
                } catch (error) {
                    recordDiagnosticEvent('marketplace', 'error', error.message);
                    reject(error);
                }
            },
            onerror: response => {
                recordDiagnosticEvent('marketplace', 'error', response.statusText);
                reject(new Error(response.statusText || 'Marketplace fetch failed.'));
            }
        });
    });
}

export function removeMarketplaceCatalog(catalogId) {
    state.settings.marketplaceCatalogs = (state.settings.marketplaceCatalogs || []).filter(catalog => catalog.id !== catalogId);
}

export function toggleMarketplaceCatalogPinned(catalogId) {
    const catalog = (state.settings.marketplaceCatalogs || []).find(item => item.id === catalogId);
    if (!catalog) return null;
    catalog.pinned = !catalog.pinned;
    return catalog;
}

export function createMarketplaceCatalogExport(catalog) {
    return {
        kind: 'geminibuddy-marketplace-catalog',
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        provenance: {
            sourceUrl: catalog.sourceUrl,
            sourceName: catalog.sourceName,
            catalogSchemaVersion: catalog.schemaVersion,
            updatedAt: catalog.updatedAt,
            fetchedAt: catalog.fetchedAt
        },
        catalog
    };
}
