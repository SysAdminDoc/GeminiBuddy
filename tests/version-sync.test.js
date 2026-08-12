const assert = require('assert');
const test = require('node:test');
const { assertSynchronizedValues, assertVersionConsistency } = require('../chrome_extension/version-check.js');

test('version and storage contracts stay synchronized across source and packaging', () => {
  const result = assertVersionConsistency();
  assert.match(result.version, /^\d+\.\d+\.\d+$/);
  assert.strictEqual(result.storageKeys.prompts, 'gemini_custom_prompts_v6');
  assert.strictEqual(result.storageKeys.settings, 'gemini_panel_settings_v25');
  assert.strictEqual(result.storageKeys.history, 'gemini_prompt_history_v1');
  assert.strictEqual(result.storageKeys.profiles, 'gemini_prompt_profiles_v1');
});

test('the local consistency helper rejects drift instead of choosing a winner', () => {
  assert.throws(
    () => assertSynchronizedValues(['53.0.0', '52.0.0'], 'Version'),
    /Version drift detected/
  );
});
