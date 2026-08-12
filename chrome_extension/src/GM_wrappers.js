// /src/GM_wrappers.js

/**
 * In `@grant none` mode, we must replace GM functions with Web API equivalents.
 */

const storageDiagnostics = globalThis.GeminiBuddyStorageDiagnostics || {
  backend: 'localStorage',
  chunkSize: null,
  reads: 0,
  writes: 0,
  deletes: 0,
  errors: 0,
  chunkedReads: 0,
  chunkedWrites: 0,
  snapshot() { return { ...this }; }
};
globalThis.GeminiBuddyStorageDiagnostics = storageDiagnostics;

// Replaces GM_addStyle
export const GM_addStyle = (css) => {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  return style;
};

// Replaces GM_setValue using localStorage
export const GM_setValue = async (key, value) => {
  try {
    storageDiagnostics.writes += 1;
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    storageDiagnostics.errors += 1;
    console.error("Error saving to localStorage", e);
  }
};

// Replaces GM_getValue using localStorage
export const GM_getValue = async (key, defaultValue) => {
  try {
    storageDiagnostics.reads += 1;
    const value = localStorage.getItem(key);
    if (value === null) {
      return defaultValue;
    }
    return JSON.parse(value);
  } catch (e) {
    console.error("Error reading from localStorage", e);
    return defaultValue;
  }
};

// Replaces GM_xmlhttpRequest using the fetch API
export const GM_xmlhttpRequest = (details) => {
  const { method = 'GET', url, headers, data, onload, onerror } = details;

  fetch(url, {
    method,
    headers,
    body: data,
  })
  .then(response => {
    if (!response.ok) {
      // Create a response-like object for onerror
      const errorResponse = {
        status: response.status,
        statusText: response.statusText,
        finalUrl: response.url,
      };
      if (onerror) onerror(errorResponse);
      // Stop further processing
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text().then(responseText => {
      // Create a response object mimicking GM's for onload
      const successResponse = {
        status: response.status,
        statusText: response.statusText,
        finalUrl: response.url,
        responseText: responseText,
        responseHeaders: Object.fromEntries(response.headers.entries()),
      };
      if (onload) onload(successResponse);
    });
  })
  .catch(error => {
    // This catches network errors and the thrown error from !response.ok
    if (onerror) {
        onerror({
            status: -1,
            statusText: error.message
        });
    }
  });
};

export const GM_setLocalValue = async (key, value) => {
  try {
    storageDiagnostics.writes += 1;
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    storageDiagnostics.errors += 1;
    storageDiagnostics.errors += 1;
    console.error("Error saving local secret", e);
  }
};

export const GM_getLocalValue = async (key, defaultValue) => {
  try {
    storageDiagnostics.reads += 1;
    const value = localStorage.getItem(key);
    return value === null ? defaultValue : JSON.parse(value);
  } catch (e) {
    storageDiagnostics.errors += 1;
    console.error("Error reading local secret", e);
    return defaultValue;
  }
};

export const GM_deleteLocalValue = async (key) => {
  try {
    storageDiagnostics.deletes += 1;
    localStorage.removeItem(key);
  } catch (e) {
    storageDiagnostics.errors += 1;
    console.error("Error deleting local secret", e);
  }
};
