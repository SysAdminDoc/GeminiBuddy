(function(global) {
  'use strict';

  const BUILTIN_ORIGINS = Object.freeze([
    'https://api.github.com',
    'https://gist.githubusercontent.com',
    'https://raw.githubusercontent.com',
    'https://generativelanguage.googleapis.com'
  ]);

  function getUrl(value) {
    try {
      const url = new URL(String(value || ''));
      return url.protocol === 'https:' ? url : null;
    } catch (_error) {
      return null;
    }
  }

  function getOrigin(value) {
    const url = getUrl(value);
    return url ? url.origin : '';
  }

  function normalizeAllowedOrigins(values) {
    const input = Array.isArray(values) ? values : String(values || '').split(',');
    return [...new Set(input.map(value => getOrigin(value.trim())).filter(Boolean))];
  }

  function isBuiltinUrl(value) {
    return BUILTIN_ORIGINS.includes(getOrigin(value));
  }

  function isAllowedByList(value, allowedOrigins) {
    const origin = getOrigin(value);
    return !!origin && normalizeAllowedOrigins(allowedOrigins).includes(origin);
  }

  function requestPermission(value) {
    const origin = getOrigin(value);
    if (!origin || !global.chrome?.runtime?.sendMessage) return Promise.resolve(false);

    return new Promise(resolve => {
      global.chrome.runtime.sendMessage({
        type: 'geminibuddy-request-origin-permission',
        origin
      }, response => {
        if (global.chrome.runtime.lastError) {
          resolve(false);
          return;
        }
        resolve(response?.granted === true);
      });
    });
  }

  global.GeminiBuddyNetworkPolicy = Object.freeze({
    BUILTIN_ORIGINS,
    getOrigin,
    normalizeAllowedOrigins,
    isBuiltinUrl,
    isAllowedByList,
    requestPermission
  });
})(globalThis);
