const fs = require('fs');
const path = require('path');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function extract(text, pattern, label) {
  const match = text.match(pattern);
  if (!match) throw new Error(`Could not find ${label}.`);
  return match[1];
}

function assertSynchronizedValues(values, label) {
  const uniqueValues = [...new Set(values)];
  if (uniqueValues.length !== 1) {
    throw new Error(`${label} drift detected: ${uniqueValues.join(', ')}`);
  }
  return uniqueValues[0];
}

function assertVersionConsistency(repoRoot = path.resolve(__dirname, '..')) {
  const extensionRoot = path.join(repoRoot, 'chrome_extension');
  const userscript = readText(path.join(repoRoot, 'GeminiBuddy.user.js'));
  const config = readText(path.join(extensionRoot, 'src', 'config.js'));
  const storageSchema = readText(path.join(extensionRoot, 'storage-schema.js'));
  const webpackConfig = readText(path.join(extensionRoot, 'webpack.config.js'));
  const readme = readText(path.join(repoRoot, 'README.md'));
  const changelog = readText(path.join(repoRoot, 'CHANGELOG.md'));
  const packageJson = readJson(path.join(extensionRoot, 'package.json'));
  const packageJs = readJson(path.join(extensionRoot, 'package.js'));
  const manifest = readJson(path.join(extensionRoot, 'manifest.json'));

  const version = assertSynchronizedValues([
    extract(userscript, /@version\s+([0-9]+\.[0-9]+\.[0-9]+)/, 'userscript @version'),
    extract(userscript, /const PROJECT_VERSION\s*=\s*['"]([^'"]+)/, 'userscript project version'),
    extract(config, /export const PROJECT_VERSION\s*=\s*['"]([^'"]+)/, 'modular project version'),
    extract(storageSchema, /const PROJECT_VERSION\s*=\s*['"]([^'"]+)/, 'storage schema project version'),
    packageJson.version,
    packageJs.version,
    manifest.version,
    packageJson.version,
    extract(readme, /badge\/version-v([0-9]+\.[0-9]+\.[0-9]+)-blue/, 'README version badge'),
    extract(changelog, /^## \[v?([0-9]+\.[0-9]+\.[0-9]+)\]/m, 'current changelog version')
  ], 'Version');

  if (!/version:\s*packageInfo\.version/.test(webpackConfig)) {
    throw new Error('Webpack userscript version must be sourced from package.js.');
  }

  const storageKeys = {
    prompts: assertSynchronizedValues([
      extract(userscript, /const GM_PROMPTS_KEY\s*=\s*['"]([^'"]+)/, 'userscript prompt key'),
      extract(config, /export const GM_PROMPTS_KEY\s*=\s*['"]([^'"]+)/, 'modular prompt key'),
      extract(storageSchema, /const PROMPTS_KEY\s*=\s*['"]([^'"]+)/, 'storage schema prompt key')
    ], 'Prompt storage key'),
    settings: assertSynchronizedValues([
      extract(userscript, /const GM_SETTINGS_KEY\s*=\s*['"]([^'"]+)/, 'userscript settings key'),
      extract(config, /export const GM_SETTINGS_KEY\s*=\s*['"]([^'"]+)/, 'modular settings key'),
      extract(storageSchema, /const SETTINGS_KEY\s*=\s*['"]([^'"]+)/, 'storage schema settings key')
    ], 'Settings storage key'),
    history: assertSynchronizedValues([
      extract(userscript, /const GM_HISTORY_KEY\s*=\s*['"]([^'"]+)/, 'userscript history key'),
      extract(config, /export const GM_HISTORY_KEY\s*=\s*['"]([^'"]+)/, 'modular history key'),
      extract(storageSchema, /const HISTORY_KEY\s*=\s*['"]([^'"]+)/, 'storage schema history key')
    ], 'History storage key'),
    profiles: assertSynchronizedValues([
      extract(userscript, /const GM_PROFILES_KEY\s*=\s*['"]([^'"]+)/, 'userscript profiles key'),
      extract(config, /export const GM_PROFILES_KEY\s*=\s*['"]([^'"]+)/, 'modular profiles key')
    ], 'Profiles storage key')
  };

  return { version, storageKeys };
}

if (require.main === module) {
  const result = assertVersionConsistency();
  console.log(`GeminiBuddy ${result.version}: version and storage keys are synchronized.`);
}

module.exports = { assertSynchronizedValues, assertVersionConsistency };
