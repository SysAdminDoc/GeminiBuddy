const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const { assertI18nConsistency, collectMessageKeys } = require('../chrome_extension/i18n-check.js');

const repoRoot = path.resolve(__dirname, '..');

test('extension i18n catalogs cover every referenced UI message', () => {
  const result = assertI18nConsistency(repoRoot);
  assert.ok(result.locales.includes('en'));
  assert.ok(result.keys.length > 100);
  assert.ok(result.keys.includes('extensionName'));
  assert.ok(result.keys.includes('panelTitle'));
});

test('localized extension surfaces load the runtime and reference locale keys', () => {
  const optionsHtml = fs.readFileSync(path.join(repoRoot, 'chrome_extension', 'options.html'), 'utf8');
  const sidePanelHtml = fs.readFileSync(path.join(repoRoot, 'chrome_extension', 'sidepanel.html'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'chrome_extension', 'manifest.json'), 'utf8'));
  assert.match(optionsHtml, /<script src="i18n\.js"><\/script>/);
  assert.match(sidePanelHtml, /<script src="i18n\.js"><\/script>/);
  assert.equal(manifest.default_locale, 'en');
  assert.match(manifest.name, /^__MSG_[A-Za-z0-9_]+__$/);
  assert.match(manifest.action.default_title, /^__MSG_[A-Za-z0-9_]+__$/);
  assert.ok(collectMessageKeys(repoRoot).includes('actionOpenSidePanel'));
});

test('the i18n check fails when a referenced key is missing', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'geminibuddy-i18n-'));
  try {
    const localeDir = path.join(tempRoot, 'chrome_extension', '_locales', 'en');
    fs.mkdirSync(localeDir, { recursive: true });
    fs.writeFileSync(path.join(localeDir, 'messages.json'), '{}');
    fs.writeFileSync(path.join(tempRoot, 'GeminiBuddy.user.js'), "i18nMessage('missingGateProbe', 'Missing');\n");
    assert.throws(() => assertI18nConsistency(tempRoot), /Missing English i18n keys: missingGateProbe/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
