const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');

const repoRoot = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'chrome_extension', 'manifest.json'), 'utf8'));
const userscript = fs.readFileSync(path.join(repoRoot, 'GeminiBuddy.user.js'), 'utf8');
const policySource = fs.readFileSync(path.join(repoRoot, 'chrome_extension', 'network-policy.js'), 'utf8');

test('remote permissions stay scoped to built-in origins', () => {
  assert.ok(!manifest.host_permissions.includes('https://*/*'));
  assert.ok(manifest.optional_host_permissions.includes('https://*/*'));
  assert.ok(!/^\/\/ @connect\s+\*$/m.test(userscript));
  assert.ok(userscript.includes('// @connect      api.github.com'));
  assert.ok(userscript.includes('// @connect      raw.githubusercontent.com'));
  assert.ok(userscript.includes('authorizeRemoteUrl(url)'));
  assert.ok(userscript.includes('allowedImportOrigins'));
});

test('network policy normalizes HTTPS origins and rejects unsafe URLs', () => {
  const sandbox = { URL, globalThis: null };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(policySource, sandbox);
  const policy = sandbox.GeminiBuddyNetworkPolicy;

  assert.strictEqual(policy.getOrigin('https://example.com/prompts.json'), 'https://example.com');
  assert.strictEqual(policy.getOrigin('http://example.com/prompts.json'), '');
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(policy.normalizeAllowedOrigins(['https://example.com/a', 'https://example.com', 'http://unsafe.test']))),
    ['https://example.com']
  );
  assert.strictEqual(policy.isBuiltinUrl('https://raw.githubusercontent.com/SysAdminDoc/GeminiBuddy/main/Prompts/defaultpromptlist.json'), true);
  assert.strictEqual(policy.isBuiltinUrl('https://example.com/prompts.json'), false);
});
