const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { test } = require('node:test');

function createElement() {
  return {
    value: '',
    textContent: '',
    className: '',
    disabled: false,
    addEventListener() {},
    click() {},
  };
}

const elementIds = [
  'status', 'prompts-json', 'theme-name', 'panel-position', 'panel-width',
  'gist-url', 'gist-file-name', 'marketplace-url', 'reload-prompts',
  'save-prompts', 'export-prompts', 'import-prompts'
];
const elements = Object.fromEntries(elementIds.map(id => [id, createElement()]));
const storageValues = {
  gemini_custom_prompts_v6: JSON.stringify({
    Work: [{ name: 'Summarize', text: 'Summarize this.' }],
    Personal: [{ name: 'Plan', text: 'Plan my day.' }]
  }),
  gemini_panel_settings_v24: {
    themeName: 'light',
    position: 'right',
    panelWidth: 420
  }
};

function storageGet(keys, callback) {
  const requested = Array.isArray(keys) ? keys : [keys];
  callback(Object.fromEntries(requested.filter(key => Object.prototype.hasOwnProperty.call(storageValues, key)).map(key => [key, storageValues[key]])));
}

function storageSet(values, callback) {
  Object.assign(storageValues, values);
  callback();
}

function storageRemove(keys, callback) {
  for (const key of (Array.isArray(keys) ? keys : [keys])) delete storageValues[key];
  callback();
}

const document = {
  getElementById(id) {
    return elements[id] || (elements[id] = createElement());
  },
  createElement,
};

const hooks = {};
const sandbox = {
  console,
  document,
  globalThis: null,
  __GEMINIBUDDY_OPTIONS_TEST_HOOKS__: hooks,
  chrome: {
    runtime: { lastError: null },
    storage: {
      sync: { get: storageGet, set: storageSet, remove: storageRemove },
      local: { get: storageGet, set: storageSet, remove: storageRemove }
    }
  },
  Blob: class Blob {},
  FileReader: class FileReader {},
  URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
  setTimeout,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const schemaPath = path.join(__dirname, '..', 'chrome_extension', 'storage-schema.js');
const optionsPath = path.join(__dirname, '..', 'chrome_extension', 'options.js');
vm.runInContext(fs.readFileSync(schemaPath, 'utf8'), sandbox, { filename: schemaPath });
vm.runInContext(fs.readFileSync(optionsPath, 'utf8'), sandbox, { filename: optionsPath });

test('options preserves grouped prompts and migrates settings storage', async () => {
  await hooks.loadState();

  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(hooks.normalizePromptLibrary(storageValues.gemini_custom_prompts_v6))),
    {
      Work: [{ name: 'Summarize', text: 'Summarize this.' }],
      Personal: [{ name: 'Plan', text: 'Plan my day.' }]
    }
  );
  assert.strictEqual(elements['prompts-json'].value.includes('"Work"'), true);
  assert.strictEqual(elements['theme-name'].value, 'light');
  assert.strictEqual(elements['panel-position'].value, 'right');
  assert.strictEqual(elements['panel-width'].value, 420);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(storageValues, 'gemini_panel_settings_v25'), true);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(storageValues, 'gemini_panel_settings_v24'), false);
  console.log('options storage schema passed');
});

test('options migrates the oldest prompt key once and retires it', async () => {
  delete storageValues.gemini_custom_prompts_v6;
  storageValues.gemini_custom_prompts_v2 = JSON.stringify([
    { name: 'Legacy prompt', text: 'Keep this prompt.' }
  ]);

  const migrated = await hooks.loadCanonicalValue(
    'gemini_custom_prompts_v6',
    '{}',
    ['gemini_custom_prompts_v5', 'gemini_custom_prompts_v2'],
    hooks.normalizePromptLibrary
  );

  assert.deepStrictEqual(JSON.parse(JSON.stringify(migrated.value)), {
    'Imported Prompts': [{ name: 'Legacy prompt', text: 'Keep this prompt.' }]
  });
  assert.strictEqual(migrated.migrated, true);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(storageValues, 'gemini_custom_prompts_v6'), true);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(storageValues, 'gemini_custom_prompts_v2'), false);
});
