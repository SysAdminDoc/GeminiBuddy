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

console.log('chained prompt helpers passed');
