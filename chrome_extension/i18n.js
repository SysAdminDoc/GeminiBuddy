(function(global) {
  'use strict';

  function get(key, fallback = '', substitutions) {
    const api = global.chrome?.i18n;
    try {
      const message = substitutions === undefined ? api?.getMessage?.(key) : api?.getMessage?.(key, substitutions);
      if (message) return message;
    } catch (_error) {
      // Userscript and non-extension contexts use the inline English fallback.
    }
    return fallback || key;
  }

  function apply(root = global.document) {
    if (!root?.querySelectorAll) return;
    const elements = root.querySelectorAll('[data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-aria-label]');
    elements.forEach(element => {
      const textKey = element.dataset.i18n;
      if (textKey) element.textContent = get(textKey, element.textContent.trim());
      const placeholderKey = element.dataset.i18nPlaceholder;
      if (placeholderKey) element.placeholder = get(placeholderKey, element.placeholder || '');
      const titleKey = element.dataset.i18nTitle;
      if (titleKey) element.title = get(titleKey, element.title || '');
      const ariaLabelKey = element.dataset.i18nAriaLabel;
      if (ariaLabelKey) element.setAttribute('aria-label', get(ariaLabelKey, element.getAttribute('aria-label') || ''));
    });
  }

  global.GeminiBuddyI18n = Object.freeze({
    get,
    apply,
    locale: () => global.chrome?.i18n?.getUILanguage?.() || global.navigator?.language || 'en'
  });
})(globalThis);
