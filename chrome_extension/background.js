importScripts('network-policy.js');

(function() {
  'use strict';

  const policy = globalThis.GeminiBuddyNetworkPolicy;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'geminibuddy-request-origin-permission' || !policy) return false;

    const origin = policy.getOrigin(message.origin);
    if (!origin || policy.isBuiltinUrl(origin)) {
      sendResponse({ granted: !!origin });
      return false;
    }

    chrome.permissions.request({ origins: [`${origin}/*`] }, granted => {
      sendResponse({ granted: granted === true });
    });
    return true;
  });
})();
