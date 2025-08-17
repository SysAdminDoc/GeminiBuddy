// /src/GM_wrappers.js

/**
 * In `@grant none` mode, we must replace GM functions with Web API equivalents.
 */

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
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Error saving to localStorage", e);
  }
};

// Replaces GM_getValue using localStorage
export const GM_getValue = async (key, defaultValue) => {
  try {
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