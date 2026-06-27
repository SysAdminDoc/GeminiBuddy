(function() {
  'use strict';

  const PROMPTS_KEY = 'gemini_custom_prompts_v6';
  const SETTINGS_KEY = 'gemini_panel_settings_v24';
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

  function normalizePrompts(rawValue) {
    if (!rawValue) return [];
    const parsed = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
    if (!Array.isArray(parsed)) {
      throw new Error('Prompt library must be a JSON array.');
    }
    return parsed;
  }

  function formatPrompts(prompts) {
    return JSON.stringify(prompts, null, 2);
  }

  async function loadState() {
    const prompts = normalizePrompts(await getStoredValue(PROMPTS_KEY, '[]'));
    settings = await getStoredValue(SETTINGS_KEY, {});

    promptsJsonEl.value = formatPrompts(prompts);
    themeNameEl.value = settings.themeName || 'dark';
    panelPositionEl.value = settings.position || 'left';
    panelWidthEl.value = Number(settings.panelWidth || 320);
    gistUrlEl.value = settings.gistURL || '';
    gistFileNameEl.value = settings.gistFileName || 'gemini-prompts.json';
    marketplaceUrlEl.value = settings.marketplaceURL || '';
    setStatus('Loaded from sync storage', 'success');
  }

  async function savePromptsFromTextarea() {
    const prompts = normalizePrompts(promptsJsonEl.value);
    await setStoredValue(PROMPTS_KEY, JSON.stringify(prompts));
    promptsJsonEl.value = formatPrompts(prompts);
    setStatus(`Saved ${prompts.length} prompts`, 'success');
  }

  async function saveSettings() {
    settings = {
      ...settings,
      themeName: themeNameEl.value,
      position: panelPositionEl.value,
      panelWidth: Number(panelWidthEl.value || 320),
      gistURL: gistUrlEl.value.trim(),
      gistFileName: gistFileNameEl.value.trim() || 'gemini-prompts.json',
      marketplaceURL: marketplaceUrlEl.value.trim()
    };
    await setStoredValue(SETTINGS_KEY, settings);
    setStatus('Saved settings to sync storage', 'success');
  }

  function exportPrompts() {
    const prompts = normalizePrompts(promptsJsonEl.value);
    const blob = new Blob([formatPrompts(prompts)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'geminibuddy-prompts.json';
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus(`Exported ${prompts.length} prompts`, 'success');
  }

  function importPrompts(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const prompts = normalizePrompts(reader.result);
        promptsJsonEl.value = formatPrompts(prompts);
        setStatus(`Imported ${prompts.length} prompts, save to sync when ready`, 'success');
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
    try {
      exportPrompts();
    } catch (error) {
      setStatus(error.message, 'error');
    }
  });
  document.getElementById('import-prompts').addEventListener('change', event => {
    const [file] = event.target.files || [];
    if (file) importPrompts(file);
    event.target.value = '';
  });

  [themeNameEl, panelPositionEl, panelWidthEl, gistUrlEl, gistFileNameEl, marketplaceUrlEl].forEach(control => {
    control.addEventListener('change', () => saveSettings().catch(error => setStatus(error.message, 'error')));
  });

  loadState().catch(error => setStatus(error.message, 'error'));
})();
