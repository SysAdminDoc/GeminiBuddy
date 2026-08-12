const fs = require('fs');
const path = require('path');

const SOURCE_FILES = [
  'GeminiBuddy.user.js',
  'chrome_extension/manifest.json',
  'chrome_extension/options.html',
  'chrome_extension/options.js',
  'chrome_extension/sidepanel.html',
  'chrome_extension/sidepanel.js',
  'chrome_extension/src/i18n.js',
  'chrome_extension/src/utils.js',
  'chrome_extension/src/ui/mainPanel.js',
  'chrome_extension/src/ui/modals.js',
  'chrome_extension/src/ui/settingsUI.js'
];

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function collectMessageKeys(repoRoot) {
  const keys = new Set();
  const patterns = [
    /__MSG_([A-Za-z0-9_]+)__/g,
    /data-i18n(?:-[a-z-]+)?\s*=\s*["']([A-Za-z0-9_]+)["']/g,
    /(?:i18nMessage|GeminiBuddyI18n\.get|\bmsg)\s*\(\s*["']([A-Za-z0-9_]+)["']/g
  ];
  SOURCE_FILES.forEach(relativePath => {
    const filePath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(filePath)) return;
    const text = readText(filePath);
    patterns.forEach(pattern => {
      for (const match of text.matchAll(pattern)) keys.add(match[1]);
    });
  });
  return [...keys].sort();
}

function assertI18nConsistency(repoRoot = path.resolve(__dirname, '..')) {
  const localesRoot = path.join(repoRoot, 'chrome_extension', '_locales');
  if (!fs.existsSync(localesRoot)) throw new Error('Missing chrome_extension/_locales directory.');
  const locales = fs.readdirSync(localesRoot).filter(name => fs.statSync(path.join(localesRoot, name)).isDirectory()).sort();
  if (!locales.includes('en')) throw new Error('English i18n locale is required.');

  const messagesByLocale = Object.fromEntries(locales.map(locale => [locale, readJson(path.join(localesRoot, locale, 'messages.json'))]));
  Object.entries(messagesByLocale).forEach(([locale, messages]) => {
    Object.entries(messages).forEach(([key, value]) => {
      if (!value || typeof value.message !== 'string' || !value.message.trim()) throw new Error(`Invalid i18n message ${locale}/${key}.`);
    });
  });

  const english = messagesByLocale.en;
  const sourceKeys = collectMessageKeys(repoRoot);
  const missingEnglish = sourceKeys.filter(key => !Object.prototype.hasOwnProperty.call(english, key));
  if (missingEnglish.length) throw new Error(`Missing English i18n keys: ${missingEnglish.join(', ')}`);

  locales.filter(locale => locale !== 'en').forEach(locale => {
    const missingLocale = sourceKeys.filter(key => !Object.prototype.hasOwnProperty.call(messagesByLocale[locale], key));
    if (missingLocale.length) throw new Error(`Missing ${locale} i18n keys: ${missingLocale.join(', ')}`);
    const unknownLocale = Object.keys(messagesByLocale[locale]).filter(key => !Object.prototype.hasOwnProperty.call(english, key));
    if (unknownLocale.length) throw new Error(`Unknown ${locale} i18n keys: ${unknownLocale.join(', ')}`);
  });
  return { locales, keys: sourceKeys };
}

if (require.main === module) {
  const result = assertI18nConsistency();
  console.log(`GeminiBuddy i18n check passed: ${result.keys.length} keys across ${result.locales.join(', ')}.`);
}

module.exports = { collectMessageKeys, assertI18nConsistency };
