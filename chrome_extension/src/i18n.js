export function i18nMessage(key, fallback = '', substitutions) {
    return globalThis.GeminiBuddyI18n?.get?.(key, fallback, substitutions) || fallback || key;
}
