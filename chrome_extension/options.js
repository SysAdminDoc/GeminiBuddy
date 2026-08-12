(function() {
  'use strict';

  const schema = globalThis.GeminiBuddyStorageSchema;
  if (!schema) throw new Error('GeminiBuddy storage schema is unavailable.');

  const {
    PROMPTS_KEY,
    SETTINGS_KEY,
    LEGACY_PROMPT_KEYS,
    LEGACY_SETTINGS_KEYS,
    defaultSettings,
    normalizePromptLibrary,
    normalizeSettings,
    normalizeAllowedImportOrigins,
    createPromptExport,
    parsePromptImport
  } = schema;
  const storage = chrome.storage.sync || chrome.storage.local;
  const CHUNK_SIZE = 7000;

  const statusEl = document.getElementById('status');
  const promptsJsonEl = document.getElementById('prompts-json');
  const themeNameEl = document.getElementById('theme-name');
  const panelPositionEl = document.getElementById('panel-position');
  const panelWidthEl = document.getElementById('panel-width');
  const gistUrlEl = document.getElementById('gist-url');
  const gistFileNameEl = document.getElementById('gist-file-name');
  const marketplaceUrlEl = document.getElementById('marketplace-url');
  const allowedImportOriginsEl = document.getElementById('allowed-import-origins');

  let settings = {};

  function setStatus(message, type = '') {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`.trim();
  }

  function chunkKey(key, index) {
    return `${key}__chunk_${index}`;
  }

  function getStorage(keys) {
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

  function setStorage(values) {
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

  function removeStorage(keys) {
    return new Promise(resolve => storage.remove(keys, resolve));
  }

  async function removeOldChunks(key, previousMeta, keepCount = 0) {
    if (!previousMeta || previousMeta.__gbChunked !== true || !Number.isInteger(previousMeta.count)) return;
    const keys = [];
    for (let index = keepCount; index < previousMeta.count; index += 1) {
      keys.push(chunkKey(key, index));
    }
    if (keys.length) await removeStorage(keys);
  }

  async function removeStoredValue(key, previousMeta) {
    const keys = [key];
    if (previousMeta && previousMeta.__gbChunked === true && Number.isInteger(previousMeta.count)) {
      for (let index = 0; index < previousMeta.count; index += 1) {
        keys.push(chunkKey(key, index));
      }
    }
    await removeStorage(keys);
  }

  async function getStoredValue(key, defaultValue) {
    const values = await getStorage([key]);
    if (!Object.prototype.hasOwnProperty.call(values, key)) return defaultValue;
    const storedValue = values[key];
    if (storedValue && storedValue.__gbChunked === true && Number.isInteger(storedValue.count)) {
      const keys = Array.from({ length: storedValue.count }, (_, index) => chunkKey(key, index));
      const chunkValues = await getStorage(keys);
      const serialized = keys.map(currentKey => chunkValues[currentKey] || '').join('');
      return JSON.parse(serialized);
    }
    return storedValue;
  }

  async function setStoredValue(key, value) {
    const previous = (await getStorage([key]))[key];
    const serialized = JSON.stringify(value);
    if (serialized.length <= CHUNK_SIZE) {
      await setStorage({ [key]: value });
      await removeOldChunks(key, previous);
      return;
    }

    const count = Math.ceil(serialized.length / CHUNK_SIZE);
    const values = {};
    for (let index = 0; index < count; index += 1) {
      values[chunkKey(key, index)] = serialized.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE);
    }
    values[key] = { __gbChunked: true, count, updatedAt: Date.now() };
    await setStorage(values);
    await removeOldChunks(key, previous, count);
  }

  async function loadCanonicalValue(key, defaultValue, legacyKeys, normalize) {
    const currentMeta = await getStorage([key]);
    if (Object.prototype.hasOwnProperty.call(currentMeta, key)) {
      const rawValue = await getStoredValue(key, defaultValue);
      const value = normalize(rawValue);
      if (key === SETTINGS_KEY && rawValue && (Object.prototype.hasOwnProperty.call(rawValue, 'geminiAPIKey') || Object.prototype.hasOwnProperty.call(rawValue, 'gistToken'))) {
        await setStoredValue(key, value);
        return { value, migrated: true };
      }
      return { value, migrated: false };
    }

    for (const legacyKey of legacyKeys) {
      const legacyMeta = await getStorage([legacyKey]);
      if (!Object.prototype.hasOwnProperty.call(legacyMeta, legacyKey)) continue;

      const value = normalize(await getStoredValue(legacyKey, defaultValue));
      await setStoredValue(key, value);
      await removeStoredValue(legacyKey, legacyMeta[legacyKey]);
      return { value, migrated: true };
    }

    return { value: normalize(defaultValue), migrated: false };
  }

  function formatPrompts(prompts) {
    return JSON.stringify(prompts, null, 2);
  }

  async function loadState() {
    const promptState = await loadCanonicalValue(PROMPTS_KEY, '{}', LEGACY_PROMPT_KEYS, normalizePromptLibrary);
    const settingsState = await loadCanonicalValue(SETTINGS_KEY, defaultSettings, LEGACY_SETTINGS_KEYS, normalizeSettings);
    const prompts = promptState.value;
    settings = settingsState.value;

    promptsJsonEl.value = formatPrompts(prompts);
    themeNameEl.value = settings.themeName || 'dark';
    panelPositionEl.value = settings.position || 'left';
    panelWidthEl.value = Number(settings.panelWidth || 320);
    gistUrlEl.value = settings.gistURL || '';
    gistFileNameEl.value = settings.gistFileName || 'gemini-prompts.json';
    marketplaceUrlEl.value = settings.marketplaceURL || '';
    allowedImportOriginsEl.value = (settings.allowedImportOrigins || []).join(', ');
    setStatus(settingsState.migrated ? 'Migrated settings to the current storage schema' : 'Loaded from sync storage', 'success');
  }

  async function savePromptsFromTextarea() {
    const prompts = normalizePromptLibrary(promptsJsonEl.value);
    await setStoredValue(PROMPTS_KEY, JSON.stringify(prompts));
    promptsJsonEl.value = formatPrompts(prompts);
    const promptCount = Object.values(prompts).flat().length;
    setStatus(`Saved ${promptCount} prompts`, 'success');
  }

  async function saveSettings() {
    settings = {
      ...settings,
      themeName: themeNameEl.value,
      position: panelPositionEl.value,
      panelWidth: Number(panelWidthEl.value || 320),
      gistURL: gistUrlEl.value.trim(),
      gistFileName: gistFileNameEl.value.trim() || 'gemini-prompts.json',
      marketplaceURL: marketplaceUrlEl.value.trim(),
      allowedImportOrigins: normalizeAllowedImportOrigins(allowedImportOriginsEl.value)
    };
    await setStoredValue(SETTINGS_KEY, settings);
    setStatus('Saved settings to sync storage', 'success');
  }

  async function exportPrompts() {
    const prompts = normalizePromptLibrary(promptsJsonEl.value);
    const exportData = await createPromptExport(prompts);
    const blob = new Blob([formatPrompts(exportData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'geminibuddy-prompts.json';
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus(`Exported ${exportData.manifest.promptCount} verified prompts`, 'success');
  }

  function importPrompts(file) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const preview = await parsePromptImport(reader.result);
        const prompts = preview.prompts;
        promptsJsonEl.value = formatPrompts(prompts);
        setStatus(`Dry-run import: ${preview.promptCount} prompts in ${preview.groupCount} groups; review and save to sync`, 'success');
      } catch (error) {
        setStatus(error.message, 'error');
      }
    };
    reader.onerror = () => setStatus('Could not read import file', 'error');
    reader.readAsText(file);
  }

  document.getElementById('reload-prompts').addEventListener('click', () => {
    loadState().catch(error => setStatus(error.message, 'error'));
  });
  document.getElementById('save-prompts').addEventListener('click', () => {
    savePromptsFromTextarea().catch(error => setStatus(error.message, 'error'));
  });
  document.getElementById('export-prompts').addEventListener('click', () => {
    exportPrompts().catch(error => setStatus(error.message, 'error'));
  });
  document.getElementById('import-prompts').addEventListener('change', event => {
    const [file] = event.target.files || [];
    if (file) importPrompts(file);
    event.target.value = '';
  });

  [themeNameEl, panelPositionEl, panelWidthEl, gistUrlEl, gistFileNameEl, marketplaceUrlEl, allowedImportOriginsEl].forEach(control => {
    control.addEventListener('change', () => saveSettings().catch(error => setStatus(error.message, 'error')));
  });

  loadState().catch(error => setStatus(error.message, 'error'));

  if (globalThis.__GEMINIBUDDY_OPTIONS_TEST_HOOKS__) {
    Object.assign(globalThis.__GEMINIBUDDY_OPTIONS_TEST_HOOKS__, {
      formatPrompts,
      loadCanonicalValue,
      loadState,
      saveSettings,
      savePromptsFromTextarea,
      normalizePromptLibrary,
      normalizeSettings,
      createPromptExport,
      parsePromptImport
    });
  }
})();
