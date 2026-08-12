const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { webcrypto } = require('crypto');
const test = require('node:test');

const sourcePath = path.join(__dirname, '..', 'chrome_extension', 'src', 'features', 'transfer.js');
let source = fs.readFileSync(sourcePath, 'utf8')
  .replace(/export const /g, 'const ')
  .replace(/export async function /g, 'async function ')
  .replace(/export function /g, 'function ');
source += '\nthis.transfer = { normalizePromptImport, createPromptExport, parsePromptImport, mergePromptGroups };';

const sandbox = { URL, TextEncoder, crypto: webcrypto, globalThis: null };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: sourcePath });

test('modular transfer helper verifies exports and reports invalid entries', async () => {
  const transfer = sandbox.transfer;
  const preview = transfer.normalizePromptImport({
    Team: [
      { id: 'same', name: 'One', text: 'One' },
      { id: 'same', title: 'Two', prompt: 'Two' },
      { name: 'Bad', prompt: '' }
    ]
  });
  assert.strictEqual(preview.groups.Team.length, 2);
  assert.strictEqual(preview.adjustedIds.length, 1);
  assert.strictEqual(preview.rejected.length, 1);

  const exported = await transfer.createPromptExport(preview.groups);
  assert.strictEqual(exported.manifest.algorithm, 'SHA-256');
  const parsed = await transfer.parsePromptImport(JSON.stringify(exported));
  assert.strictEqual(parsed.promptCount, 2);
  exported.prompts.Team[0].text = 'tampered';
  await assert.rejects(() => transfer.parsePromptImport(JSON.stringify(exported)), /checksum verification failed/);
});
