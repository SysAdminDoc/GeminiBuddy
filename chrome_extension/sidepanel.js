(function() {
  'use strict';

  globalThis.GeminiBuddyI18n?.apply?.();
  const msg = (key, fallback, substitutions) => globalThis.GeminiBuddyI18n?.get?.(key, fallback, substitutions) || fallback;

  const storage = chrome.storage.sync || chrome.storage.local;
  const CHUNK_SIZE = 7000;
  const PROMPTS_KEY = 'gemini_custom_prompts_v6';
  const PROFILES_KEY = 'gemini_prompt_profiles_v1';
  const PROFILE_PROMPTS_PREFIX = 'gemini_prompt_profile_prompts_v1_';

  const profileSelect = document.getElementById('profile-select');
  const searchInput = document.getElementById('search-input');
  const promptName = document.getElementById('prompt-name');
  const promptCategory = document.getElementById('prompt-category');
  const promptText = document.getElementById('prompt-text');
  const savePromptButton = document.getElementById('save-prompt');
  const cancelEditButton = document.getElementById('cancel-edit');
  const refreshButton = document.getElementById('refresh-button');
  const promptList = document.getElementById('prompt-list');
  const status = document.getElementById('status');
  let prompts = {};
  let registry = { version: 1, activeProfileId: 'default', profiles: [{ id: 'default', name: 'Default' }] };
  let editing = null;
  let pendingDelete = null;

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.className = `status${isError ? ' error' : ''}`;
  }

  function chunkKey(key, index) {
    return `${key}__chunk_${index}`;
  }

  function getStorage(keys) {
    return new Promise((resolve, reject) => {
      storage.get(keys, result => {
        const error = chrome.runtime.lastError;
        if (error) reject(new Error(error.message));
        else resolve(result || {});
      });
    });
  }

  function setStorage(values) {
    return new Promise((resolve, reject) => {
      storage.set(values, () => {
        const error = chrome.runtime.lastError;
        if (error) reject(new Error(error.message));
        else resolve();
      });
    });
  }

  function removeStorage(keys) {
    return new Promise(resolve => storage.remove(keys, resolve));
  }

  async function getValue(key, fallback) {
    const values = await getStorage([key]);
    if (!Object.prototype.hasOwnProperty.call(values, key)) return fallback;
    const meta = values[key];
    if (meta?.__gbChunked === true && Number.isInteger(meta.count)) {
      const keys = Array.from({ length: meta.count }, (_, index) => chunkKey(key, index));
      const chunks = await getStorage(keys);
      return JSON.parse(keys.map(chunk => chunks[chunk] || '').join(''));
    }
    return meta;
  }

  async function setValue(key, value) {
    const previous = (await getStorage([key]))[key];
    const serialized = JSON.stringify(value);
    if (serialized.length <= CHUNK_SIZE) {
      await setStorage({ [key]: value });
      if (previous?.__gbChunked === true && Number.isInteger(previous.count)) {
        await removeStorage(Array.from({ length: previous.count }, (_, index) => chunkKey(key, index)));
      }
      return;
    }
    const values = {};
    const count = Math.ceil(serialized.length / CHUNK_SIZE);
    for (let index = 0; index < count; index += 1) values[chunkKey(key, index)] = serialized.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE);
    values[key] = { __gbChunked: true, count, updatedAt: Date.now() };
    await setStorage(values);
    if (previous?.__gbChunked === true && Number.isInteger(previous.count) && previous.count > count) {
      await removeStorage(Array.from({ length: previous.count - count }, (_, index) => chunkKey(key, count + index)));
    }
  }

  function parsePrompts(raw) {
    if (typeof raw === 'string') {
      try { return parsePrompts(JSON.parse(raw)); } catch (_error) { return {}; }
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw).filter(([, values]) => Array.isArray(values)).map(([group, values]) => [group, values.filter(prompt => prompt && typeof prompt === 'object')]));
  }

  function activeProfile() {
    return registry.profiles.find(profile => profile.id === registry.activeProfileId) || registry.profiles[0];
  }

  function profilePromptsKey() {
    return `${PROFILE_PROMPTS_PREFIX}${activeProfile().id}`;
  }

  function sendToActiveTab(message) {
    return new Promise(resolve => {
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
        const tab = tabs?.[0];
        if (!tab?.id) {
          resolve({ ok: false, error: 'No active tab.' });
          return;
        }
        chrome.tabs.sendMessage(tab.id, message, response => {
          const error = chrome.runtime.lastError;
          resolve(error ? { ok: false, error: error.message } : (response || { ok: true }));
        });
      });
    });
  }

  function resetEditor() {
    editing = null;
    promptName.value = '';
    promptCategory.value = msg('sidePanelGroup', 'Side Panel');
    promptText.value = '';
    savePromptButton.textContent = msg('addPrompt', 'Add prompt');
    cancelEditButton.hidden = true;
  }

  function beginEdit(prompt, group) {
    editing = { id: prompt.id, group };
    promptName.value = prompt.name || '';
    promptCategory.value = group;
    promptText.value = prompt.text || '';
    savePromptButton.textContent = msg('saveChanges', 'Save changes');
    cancelEditButton.hidden = false;
    promptName.focus();
  }

  function promptMatches(prompt, term) {
    const haystack = `${prompt.name || ''} ${prompt.text || ''} ${prompt.tags || ''}`.toLowerCase();
    return haystack.includes(term);
  }

  function createAction(label, handler, className = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    if (className) button.className = className;
    button.addEventListener('click', handler);
    return button;
  }

  function render() {
    while (promptList.firstChild) promptList.removeChild(promptList.firstChild);
    const term = searchInput.value.trim().toLowerCase();
    Object.entries(prompts).forEach(([group, groupPrompts]) => {
      const visible = groupPrompts.filter(prompt => promptMatches(prompt, term));
      if (!visible.length) return;
      const groupElement = document.createElement('section');
      groupElement.className = 'prompt-group';
      const heading = document.createElement('h2');
      heading.className = 'group-title';
      heading.textContent = group;
      groupElement.appendChild(heading);
      visible.forEach(prompt => {
        const card = document.createElement('article');
        card.className = 'prompt-card';
        const useButton = document.createElement('button');
        useButton.type = 'button';
        useButton.className = 'prompt-use';
        useButton.setAttribute('aria-label', msg('insertPromptAria', `Insert prompt: ${prompt.name}`, [prompt.name]));
        const name = document.createElement('span');
        name.className = 'prompt-name';
        name.textContent = prompt.name || msg('unnamedPrompt', 'Unnamed prompt');
        const preview = document.createElement('span');
        preview.className = 'prompt-preview';
        preview.textContent = prompt.text || '';
        useButton.append(name, preview);
        useButton.addEventListener('click', async () => {
          const result = await sendToActiveTab({ type: 'geminibuddy-insert-prompt', prompt: prompt.text, autoSend: !!prompt.autoSend });
          setStatus(result.ok ? `${msg('insertedPrompt', 'Inserted prompt.')} ${prompt.name}` : (result.error || msg('noActiveTab', 'Could not reach the Gemini tab.')), !result.ok);
        });
        const actions = document.createElement('div');
        actions.className = 'prompt-actions';
        actions.append(
          createAction(msg('edit', 'Edit'), () => beginEdit(prompt, group)),
          createAction(pendingDelete === prompt.id ? msg('confirmDelete', 'Confirm delete') : msg('delete', 'Delete'), async () => {
            if (pendingDelete !== prompt.id) {
              pendingDelete = prompt.id;
              render();
              return;
            }
            prompts[group] = prompts[group].filter(item => item.id !== prompt.id);
            if (!prompts[group].length) delete prompts[group];
            pendingDelete = null;
            await savePrompts();
            render();
          }, 'delete')
        );
        card.append(useButton, actions);
        groupElement.appendChild(card);
      });
      promptList.appendChild(groupElement);
    });
    if (!promptList.firstChild) {
      const empty = document.createElement('p');
      empty.textContent = term ? msg('noMatchingPrompts', 'No matching prompts.') : msg('noPromptsProfile', 'No prompts in this profile yet.');
      promptList.appendChild(empty);
    }
  }

  async function savePrompts() {
    await setValue(profilePromptsKey(), prompts);
    await setValue(PROMPTS_KEY, JSON.stringify(prompts));
    const response = await sendToActiveTab({ type: 'geminibuddy-refresh-profile' });
    setStatus(response.ok ? msg('promptLibrarySaved', 'Prompt library saved.') : msg('refreshGemini', 'Prompt library saved; reload Gemini to refresh the page panel.'), !response.ok);
  }

  async function load() {
    try {
      const storedRegistry = await getValue(PROFILES_KEY, registry);
      if (storedRegistry && Array.isArray(storedRegistry.profiles) && storedRegistry.profiles.length) registry = storedRegistry;
      const profile = activeProfile();
      profileSelect.replaceChildren();
      registry.profiles.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.name || item.id;
        profileSelect.appendChild(option);
      });
      profileSelect.value = profile.id;
      prompts = parsePrompts(await getValue(profilePromptsKey(), await getValue(PROMPTS_KEY, '{}')));
      resetEditor();
      render();
      setStatus(`${Object.values(prompts).flat().length} prompts · ${profile.name}`);
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  profileSelect.addEventListener('change', async event => {
    registry.activeProfileId = event.target.value;
    await setValue(PROFILES_KEY, registry);
    const response = await sendToActiveTab({ type: 'geminibuddy-switch-profile', profileId: registry.activeProfileId });
    await load();
    if (!response.ok) setStatus('Profile switched in storage; reload Gemini to refresh the page panel.', true);
  });
  searchInput.addEventListener('input', render);
  refreshButton.addEventListener('click', load);
  cancelEditButton.addEventListener('click', resetEditor);
  savePromptButton.addEventListener('click', async () => {
    const name = promptName.value.trim();
    const text = promptText.value.trim();
    const group = promptCategory.value.trim() || 'Side Panel';
    if (!name || !text) {
      setStatus(msg('requiredNameText', 'Name and text are required.'), true);
      return;
    }
    if (editing) {
      const original = prompts[editing.group]?.find(prompt => prompt.id === editing.id);
      if (original) prompts[editing.group] = prompts[editing.group].filter(prompt => prompt.id !== editing.id);
      if (!prompts[group]) prompts[group] = [];
      prompts[group].push({ ...(original || {}), id: editing.id, name, text });
      if (editing.group !== group && !prompts[editing.group]?.length) delete prompts[editing.group];
    } else {
      if (!prompts[group]) prompts[group] = [];
      prompts[group].push({ id: `sidepanel-${Date.now().toString(36)}`, name, text, tags: '', autoSend: false, pinned: false, usageCount: 0, lastUsed: null });
    }
    await savePrompts();
    resetEditor();
    render();
  });

  load();
})();
