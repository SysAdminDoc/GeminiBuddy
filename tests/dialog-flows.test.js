const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');

const repoRoot = path.join(__dirname, '..');
const runtimeFiles = [
  'GeminiBuddy.user.js',
  'chrome_extension/src/features/api.js',
  'chrome_extension/src/features/prompts.js',
  'chrome_extension/src/ui/mainPanel.js',
  'chrome_extension/src/ui/modals.js'
];

test('runtime code contains no blocking native dialog calls', () => {
  const source = runtimeFiles
    .map(file => fs.readFileSync(path.join(repoRoot, file), 'utf8'))
    .join('\n');
  assert.doesNotMatch(source, /\b(?:confirm|alert)\s*\(/);
  assert.match(source, /showDecisionDialog/);
  assert.match(source, /showFatal(?:Load)?(?:Error)?Dialog/);
});
