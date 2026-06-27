const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createElement(tagName = 'div') {
  const element = {
    tagName: tagName.toUpperCase(),
    style: {},
    children: [],
    attributes: {},
    className: '',
    id: '',
    textContent: '',
    innerText: '',
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; },
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    append(...children) {
      this.children.push(...children);
    },
    removeChild(child) {
      this.children = this.children.filter(item => item !== child);
      return child;
    },
    remove() {},
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; },
    getBoundingClientRect() {
      return { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 };
    },
    get firstChild() {
      return this.children[0] || null;
    },
  };
  return element;
}

const document = {
  readyState: 'loading',
  title: 'GeminiBuddy test',
  body: createElement('body'),
  createElement,
  createElementNS: (_namespace, tagName) => createElement(tagName),
  createTextNode: text => String(text),
  querySelector() { return null; },
  querySelectorAll() { return []; },
  addEventListener() {},
  execCommand() { return true; },
};

const window = {
  document,
  geminiPanelEnhanced: false,
  __GEMINIBUDDY_TEST_HOOKS__: {},
  addEventListener() {},
  matchMedia() {
    return { matches: false, addEventListener() {} };
  },
  navigator: {
    clipboard: {
      readText: async () => '',
      writeText: async () => {},
    },
  },
  location: { href: 'https://gemini.google.com/app' },
  getSelection: () => ({ toString: () => '' }),
  innerWidth: 1280,
  innerHeight: 720,
};

const sandbox = {
  console,
  document,
  window,
  trustedTypes: undefined,
  MutationObserver: class {
    observe() {}
    disconnect() {}
  },
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  requestAnimationFrame: callback => callback(),
  URL,
  btoa: value => Buffer.from(String(value), 'binary').toString('base64'),
  atob: value => Buffer.from(String(value), 'base64').toString('binary'),
  escape,
  unescape,
};

vm.createContext(sandbox);
const scriptPath = path.join(__dirname, '..', 'GeminiBuddy.user.js');
vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), sandbox, { filename: scriptPath });

const hooks = window.__GEMINIBUDDY_TEST_HOOKS__;

assert.deepStrictEqual(
  Array.from(hooks.parseChainStepsInput('Draft a summary\n---\nReview {previous_response}\n\n---\nCreate final answer')),
  ['Draft a summary', 'Review {previous_response}', 'Create final answer']
);

assert.deepStrictEqual(
  Array.from(hooks.normalizeChainSteps([' first ', '', null, 'second'])),
  ['first', 'second']
);

assert.strictEqual(
  hooks.formatChainStepsForInput(['one', 'two']),
  'one\n---\ntwo'
);

assert.strictEqual(
  hooks.injectPreviousResponse('Rewrite this: {previous_response}', 'Initial answer'),
  'Rewrite this: Initial answer'
);

assert.strictEqual(
  hooks.injectPreviousResponse('Summarize the result.', 'Initial answer'),
  'Summarize the result.\n\nPrevious response:\nInitial answer'
);

assert.strictEqual(
  hooks.normalizeModelText('  Gemini   2.5   Pro  '),
  'gemini 2.5 pro'
);

assert.strictEqual(
  hooks.textMatchesModelShortcut('Use Gemini 2.5 Pro with advanced reasoning', hooks.MODEL_SHORTCUTS[2]),
  true
);

assert.strictEqual(
  hooks.textMatchesModelShortcut('Gemini 1.5 Flash fast mode', hooks.MODEL_SHORTCUTS[1]),
  false
);

assert.strictEqual(
  hooks.textLooksLikeCanvasShortcut('Open in Canvas'),
  true
);

assert.strictEqual(
  hooks.textLooksLikeCanvasShortcut('Open model menu'),
  false
);

assert.strictEqual(
  hooks.textLooksLikeDeepResearchShortcut('Start Deep Research'),
  true
);

assert.strictEqual(
  hooks.textLooksLikeDeepResearchShortcut('Research notes'),
  false
);

assert.strictEqual(
  hooks.normalizeGemUrl('/gem/example-gem'),
  'https://gemini.google.com/gem/example-gem'
);

assert.strictEqual(
  hooks.normalizeGemUrl('https://example.com/gem/example-gem'),
  ''
);

assert.strictEqual(
  hooks.fileExtensionForMimeType('image/png'),
  'png'
);

assert.strictEqual(
  hooks.fileExtensionForMimeType('application/x-custom'),
  'xcustom'
);

assert.strictEqual(
  hooks.clipboardFileNameForType('image/jpeg', 1),
  'gemini-clipboard-2.jpg'
);

assert.strictEqual(
  hooks.extractGistIdFromUrl('https://gist.github.com/user/abcdef1234567890'),
  'abcdef1234567890'
);

assert.strictEqual(
  hooks.extractGistIdFromUrl('https://example.com/user/abcdef1234567890'),
  ''
);

const marketplaceGroups = JSON.parse(JSON.stringify(hooks.normalizeMarketplacePrompts({
  category: 'Team',
  prompts: [
    { title: 'Summarize', prompt: 'Summarize this.', tags: ['team', 'summary'] },
    { name: 'Skip empty', prompt: '' },
  ],
})));

assert.deepStrictEqual(Object.keys(marketplaceGroups), ['Team']);
assert.strictEqual(marketplaceGroups.Team.length, 1);
assert.strictEqual(marketplaceGroups.Team[0].name, 'Summarize');
assert.strictEqual(marketplaceGroups.Team[0].text, 'Summarize this.');
assert.strictEqual(marketplaceGroups.Team[0].tags, 'team, summary');

const sharePayload = { name: 'Shared', text: 'Use unicode: café', tags: 'team' };
const encodedSharePayload = hooks.encodeSharePayload(sharePayload);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(hooks.decodeSharePayload(encodedSharePayload))),
  sharePayload
);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(hooks.getShareHashPayload(`#gbp-import=${encodedSharePayload}`))),
  sharePayload
);
assert.strictEqual(
  hooks.normalizeSharedPrompt({ title: 'Shared title', prompt: 'Prompt text' }).name,
  'Shared title'
);

console.log('userscript helpers passed');
