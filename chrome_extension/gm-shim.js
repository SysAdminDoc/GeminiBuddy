(function() {
  'use strict';

  const storage = chrome.storage.sync || chrome.storage.local;
  const secretStorage = chrome.storage.local;
  const CHUNK_SIZE = 7000;

  function chunkKey(key, index) {
    return `${key}__chunk_${index}`;
  }

  function storageGet(keys) {
    return new Promise((resolve, reject) => {
      storage.get(keys, result => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve(result || {});
      });
    });
  }

  function storageSet(values) {
    return new Promise((resolve, reject) => {
      storage.set(values, () => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve();
      });
    });
  }

  function storageRemove(keys) {
    return new Promise((resolve, reject) => {
      storage.remove(keys, () => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve();
      });
    });
  }

  function secretStorageGet(key, defaultValue) {
    return new Promise((resolve, reject) => {
      secretStorage.get([key], result => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve(Object.prototype.hasOwnProperty.call(result || {}, key) ? result[key] : defaultValue);
      });
    });
  }

  function secretStorageSet(key, value) {
    return new Promise((resolve, reject) => {
      secretStorage.set({ [key]: value }, () => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve();
      });
    });
  }

  function secretStorageRemove(key) {
    return new Promise((resolve, reject) => {
      secretStorage.remove([key], () => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve();
      });
    });
  }

  async function removeOldChunks(key, previousMeta, keepCount = 0) {
    if (!previousMeta || previousMeta.__gbChunked !== true || !Number.isInteger(previousMeta.count)) return;
    const keys = [];
    for (let index = keepCount; index < previousMeta.count; index += 1) {
      keys.push(chunkKey(key, index));
    }
    if (keys.length) await storageRemove(keys);
  }

  async function readStoredValue(key, defaultValue) {
    const result = await storageGet([key]);
    if (!Object.prototype.hasOwnProperty.call(result, key)) return defaultValue;
    const storedValue = result[key];
    if (storedValue && storedValue.__gbChunked === true && Number.isInteger(storedValue.count)) {
      const keys = Array.from({ length: storedValue.count }, (_, index) => chunkKey(key, index));
      const chunkResult = await storageGet(keys);
      const serialized = keys.map(currentKey => chunkResult[currentKey] || '').join('');
      return JSON.parse(serialized);
    }
    return storedValue;
  }

  async function writeStoredValue(key, value) {
    const previous = (await storageGet([key]))[key];
    const serialized = JSON.stringify(value);
    if (serialized.length <= CHUNK_SIZE) {
      await storageSet({ [key]: value });
      await removeOldChunks(key, previous);
      return;
    }

    const chunks = {};
    const count = Math.ceil(serialized.length / CHUNK_SIZE);
    for (let index = 0; index < count; index += 1) {
      chunks[chunkKey(key, index)] = serialized.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE);
    }
    chunks[key] = { __gbChunked: true, count, updatedAt: Date.now() };
    await storageSet(chunks);
    await removeOldChunks(key, previous, count);
  }

  globalThis.GM_addStyle = function(css) {
    const style = document.createElement('style');
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
    return style;
  };

  globalThis.GM_getValue = function(key, defaultValue) {
    return readStoredValue(key, defaultValue).catch(error => {
      console.warn(`GeminiBuddy storage read failed for ${key}:`, error);
      return defaultValue;
    });
  };

  globalThis.GM_setValue = function(key, value) {
    return writeStoredValue(key, value).catch(error => {
      console.warn(`GeminiBuddy storage write failed for ${key}:`, error);
    });
  };

  globalThis.GM_deleteValue = function(key) {
    return storageRemove(key).catch(error => {
      console.warn(`GeminiBuddy storage delete failed for ${key}:`, error);
    });
  };

  globalThis.GM_getLocalValue = function(key, defaultValue) {
    return secretStorageGet(key, defaultValue).catch(error => {
      console.warn(`GeminiBuddy local secret read failed for ${key}:`, error);
      return defaultValue;
    });
  };

  globalThis.GM_setLocalValue = function(key, value) {
    return secretStorageSet(key, value).catch(error => {
      console.warn(`GeminiBuddy local secret write failed for ${key}:`, error);
    });
  };

  globalThis.GM_deleteLocalValue = function(key) {
    return secretStorageRemove(key).catch(error => {
      console.warn(`GeminiBuddy local secret delete failed for ${key}:`, error);
    });
  };

  globalThis.GM_xmlhttpRequest = function(options) {
    const performRequest = () => fetch(options.url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.data
    }).then(async response => {
      const responseText = await response.text();
      options.onload?.({
        status: response.status,
        statusText: response.statusText,
        responseText
      });
    }).catch(error => {
      options.onerror?.({
        statusText: error.message,
        error
      });
    });

    const policy = globalThis.GeminiBuddyNetworkPolicy;
    if (policy && !policy.isBuiltinUrl(options.url)) {
      policy.requestPermission(options.url).then(granted => {
        if (granted) performRequest();
        else options.onerror?.({ statusText: 'Remote origin permission was not granted.' });
      });
      return;
    }
    performRequest();
  };
})();
