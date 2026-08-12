const BUILTIN_ORIGINS = Object.freeze([
    'https://api.github.com',
    'https://gist.githubusercontent.com',
    'https://raw.githubusercontent.com',
    'https://generativelanguage.googleapis.com'
]);

export function getRemoteOrigin(value) {
    try {
        const url = new URL(String(value || ''));
        return url.protocol === 'https:' ? url.origin : '';
    } catch (_error) {
        return '';
    }
}

export function normalizeAllowedOrigins(values) {
    const input = Array.isArray(values) ? values : String(values || '').split(',');
    return [...new Set(input.map(value => getRemoteOrigin(String(value).trim())).filter(Boolean))];
}

export function isBuiltinRemoteUrl(url) {
    return BUILTIN_ORIGINS.includes(getRemoteOrigin(url));
}

export function isRemoteUrlAllowed(url, allowedOrigins = []) {
    const origin = getRemoteOrigin(url);
    return !!origin && (BUILTIN_ORIGINS.includes(origin) || normalizeAllowedOrigins(allowedOrigins).includes(origin));
}

export function authorizeRemoteUrl(url, allowedOrigins = []) {
    const origin = getRemoteOrigin(url);
    if (!origin) return Promise.resolve(false);
    if (isBuiltinRemoteUrl(url)) return Promise.resolve(true);

    if (globalThis.GeminiBuddyNetworkPolicy?.requestPermission) {
        return globalThis.GeminiBuddyNetworkPolicy.requestPermission(url);
    }

    if (globalThis.chrome?.runtime?.sendMessage) {
        return new Promise(resolve => {
            globalThis.chrome.runtime.sendMessage({
                type: 'geminibuddy-request-origin-permission',
                origin
            }, response => resolve(response?.granted === true));
        });
    }

    return Promise.resolve(normalizeAllowedOrigins(allowedOrigins).includes(origin));
}
