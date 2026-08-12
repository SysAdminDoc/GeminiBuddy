const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');

const repoRoot = path.join(__dirname, '..');
const userscript = fs.readFileSync(path.join(repoRoot, 'GeminiBuddy.user.js'), 'utf8');
const modularSource = fs.readFileSync(path.join(repoRoot, 'chrome_extension', 'src', 'features', 'api.js'), 'utf8');
const settingsUiSource = fs.readFileSync(path.join(repoRoot, 'chrome_extension', 'src', 'ui', 'settingsUI.js'), 'utf8');
const shimSource = fs.readFileSync(path.join(repoRoot, 'chrome_extension', 'gm-shim.js'), 'utf8');

test('credentials are not part of synced settings or request URLs', () => {
  assert.doesNotMatch(userscript, /settings\.(?:geminiAPIKey|gistToken)/);
  assert.doesNotMatch(modularSource, /state\.settings\.geminiAPIKey/);
  assert.doesNotMatch(modularSource, /[?&]key=\$\{/);
  assert.match(userscript, /GM_SECRETS_KEY\s*=\s*['"]gemini_local_secrets_v1/);
  assert.match(userscript, /GM_setLocalValue|localStorage/);
  assert.match(settingsUiSource, /clearSecret/);
  assert.match(shimSource, /const secretStorage = chrome\.storage\.local/);
  assert.match(shimSource, /GM_setLocalValue/);
});

test('settings normalization strips legacy secret fields', () => {
  const sandbox = { URL, globalThis: null };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(repoRoot, 'chrome_extension', 'storage-schema.js'), 'utf8'), sandbox);
  const settings = sandbox.GeminiBuddyStorageSchema.normalizeSettings({
    themeName: 'light',
    geminiAPIKey: 'api-secret',
    gistToken: 'gist-secret'
  });
  assert.strictEqual(settings.themeName, 'light');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(settings, 'geminiAPIKey'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(settings, 'gistToken'), false);
});
