export const PROMPT_EXPORT_SCHEMA_VERSION = 1;

function clone(value) {
    return JSON.parse(JSON.stringify(value || {}));
}

function getText(item) {
    return String(item?.text || item?.prompt || item?.content || item?.body || '').trim();
}

function getName(item, index) {
    return String(item?.name || item?.title || item?.label || item?.slug || `Imported Prompt ${index + 1}`).trim();
}

function getTags(tags) {
    return Array.isArray(tags) ? tags.map(tag => String(tag).trim()).filter(Boolean).join(', ') : String(tags || '').trim();
}

function getGroups(data) {
    if (data && typeof data === 'object' && !Array.isArray(data) && data.schemaVersion !== undefined) {
        if (Number(data.schemaVersion) !== PROMPT_EXPORT_SCHEMA_VERSION) throw new Error(`Unsupported prompt export schema version: ${data.schemaVersion}`);
        return { source: data.prompts, sourceShape: 'verified-export', envelope: data };
    }
    if (Array.isArray(data)) return { source: data, sourceShape: 'array' };
    if (data && typeof data === 'object' && Array.isArray(data.prompts)) {
        const category = String(data.category || data.name || 'Marketplace').trim() || 'Marketplace';
        return { source: { [category]: data.prompts }, sourceShape: 'marketplace' };
    }
    if (data && typeof data === 'object') return { source: data, sourceShape: 'grouped' };
    throw new Error('Prompt import must be a grouped object, prompt array, or marketplace object.');
}

export function normalizePromptImport(data) {
    const { source, sourceShape, envelope } = getGroups(data);
    const rawGroups = Array.isArray(source) ? { Marketplace: source } : source;
    const groups = {};
    const rejected = [];
    const adjustedIds = [];
    const seenIds = new Set();

    Object.entries(rawGroups || {}).forEach(([rawCategory, items]) => {
        const category = String(rawCategory || '').trim();
        if (!category || !Array.isArray(items)) {
            rejected.push(`${category || '(unnamed group)'}: group must contain an array.`);
            return;
        }
        groups[category] = [];
        items.forEach((item, index) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
                rejected.push(`${category}[${index + 1}]: item must be an object.`);
                return;
            }
            const text = getText(item);
            if (!text) {
                rejected.push(`${category}[${index + 1}]: prompt text is empty.`);
                return;
            }
            const baseId = String(item.id || `prompt-import-${seenIds.size + 1}`).trim() || `prompt-import-${seenIds.size + 1}`;
            let id = baseId;
            if (seenIds.has(id)) {
                let suffix = 2;
                while (seenIds.has(`${baseId}-${suffix}`)) suffix += 1;
                id = `${baseId}-${suffix}`;
                adjustedIds.push(`${category}[${index + 1}] → ${id}`);
            }
            seenIds.add(id);
            groups[category].push({
                id,
                name: getName(item, index),
                text,
                tags: getTags(item.tags),
                autoSend: !!item.autoSend,
                pinned: !!item.pinned,
                usageCount: Number.isFinite(Number(item.usageCount)) ? Number(item.usageCount) : 0,
                lastUsed: item.lastUsed || null,
                chainSteps: Array.isArray(item.chainSteps) ? item.chainSteps.map(String).map(step => step.trim()).filter(Boolean) : [],
                gemUrl: String(item.gemUrl || item.gemURL || item.gem || '').trim()
            });
        });
        if (!groups[category].length) delete groups[category];
    });

    return {
        groups,
        rejected,
        adjustedIds,
        sourceShape,
        envelope
    };
}

async function sha256(value) {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle || typeof TextEncoder === 'undefined') throw new Error('SHA-256 is unavailable in this browser.');
    const digest = await subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function createPromptExport(promptGroups) {
    const payload = {
        schemaVersion: PROMPT_EXPORT_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        prompts: clone(promptGroups)
    };
    const checksum = await sha256(payload);
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

export async function parsePromptImport(rawText) {
    let parsed;
    try {
        parsed = JSON.parse(rawText);
    } catch (_error) {
        throw new Error('Import contains invalid JSON.');
    }
    if (parsed?.schemaVersion !== undefined) {
        if (!parsed.manifest?.checksum) throw new Error('Verified exports must include a checksum manifest.');
        const expected = await sha256({ schemaVersion: parsed.schemaVersion, exportedAt: parsed.exportedAt, prompts: parsed.prompts });
        if (expected !== parsed.manifest.checksum) throw new Error('Export checksum verification failed.');
    }
    const preview = normalizePromptImport(parsed);
    preview.promptCount = Object.values(preview.groups).flat().length;
    preview.groupCount = Object.keys(preview.groups).length;
    if (!preview.promptCount) throw new Error(`No valid prompts found. Rejected entries: ${preview.rejected.length}.`);
    return preview;
}

export function mergePromptGroups(target, incoming) {
    Object.entries(incoming).forEach(([category, prompts]) => {
        if (!target[category]) target[category] = [];
        target[category].push(...prompts);
    });
    return target;
}
