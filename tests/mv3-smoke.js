const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { execFileSync, spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const extensionSource = path.join(repoRoot, 'chrome_extension', 'dist', 'geminibuddy-mv3');

function findBrowser() {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const playwrightBrowsers = path.join(localAppData, 'ms-playwright');
  const bundledChromium = fs.existsSync(playwrightBrowsers)
    ? fs.readdirSync(playwrightBrowsers)
      .filter(name => /^chromium-\d+$/.test(name))
      .sort()
      .reverse()
      .map(name => path.join(playwrightBrowsers, name, 'chrome-win64', 'chrome.exe'))
    : [];
  const candidates = [
    process.env.GEMINIBUDDY_CHROME,
    ...bundledChromium,
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ].filter(Boolean);
  const browser = candidates.find(candidate => fs.existsSync(candidate));
  if (!browser) throw new Error('Chrome or Edge was not found. Set GEMINIBUDDY_CHROME to run the MV3 smoke test.');
  return browser;
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} while reading ${url}`);
  return response.json();
}

async function waitForJson(url, predicate, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const value = await getJson(url);
      if (predicate(value)) return value;
    } catch (_error) {
      // Chrome is still starting its debugging endpoint.
    }
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function createBrowserTarget(debugPort, url) {
  const browserInfo = await getJson(`http://127.0.0.1:${debugPort}/json/version`);
  const browserSession = new CdpSession(browserInfo.webSocketDebuggerUrl);
  await browserSession.connect();
  const { targetId } = await browserSession.send('Target.createTarget', { url });
  browserSession.close();
  const targets = await waitForJson(
    `http://127.0.0.1:${debugPort}/json/list`,
    values => values.some(target => target.id === targetId)
  );
  return targets.find(target => target.id === targetId);
}

class CdpSession {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async connect() {
    this.socket = new WebSocket(this.webSocketUrl);
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
        return;
      }
      for (const listener of this.listeners.get(message.method) || []) listener(message.params || {});
    });
    await new Promise((resolve, reject) => {
      const onOpen = () => {
        this.socket.removeEventListener('error', onError);
        resolve();
      };
      const onError = event => reject(new Error(`CDP connection failed: ${event.message || 'unknown error'}`));
      this.socket.addEventListener('open', onOpen, { once: true });
      this.socket.addEventListener('error', onError, { once: true });
    });
  }

  on(method, listener) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(listener);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket?.close();
  }
}

async function evaluate(session, expression) {
  const result = await session.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Runtime evaluation failed.');
  }
  return result.result?.value;
}

async function waitForExpression(session, expression, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (await evaluate(session, expression)) return;
    } catch (_error) {
      // The document can be between navigation contexts during the first polls.
    }
    await wait(100);
  }
  throw new Error(`Timed out waiting for browser expression: ${expression}`);
}

async function findGeminiBuddyWorker(debugPort, browserStderr = []) {
  const deadline = Date.now() + 30000;
  let targets = [];
  while (Date.now() < deadline) {
    targets = await getJson(`http://127.0.0.1:${debugPort}/json/list`).catch(() => []);
    for (const target of targets.filter(item => item.type === 'service_worker' && item.url.startsWith('chrome-extension://'))) {
      const session = new CdpSession(target.webSocketDebuggerUrl);
      try {
        await session.connect();
        await session.send('Runtime.enable');
        const name = await evaluate(session, 'globalThis.chrome?.runtime?.getManifest?.()?.name || ""');
        if (name === 'GeminiBuddy') return target;
      } catch (_error) {
        // Component service workers can expose a debugger target without extension APIs.
      } finally {
        session.close();
      }
    }
    await wait(100);
  }
  throw new Error(`GeminiBuddy service worker was not found. Targets: ${JSON.stringify(targets)}; browser=${browserStderr.join('').trim()}`);
}

function prepareSmokeExtension(baseUrl, tempRoot) {
  execFileSync(process.execPath, ['chrome_extension/build-extension.js'], { cwd: repoRoot, stdio: 'inherit' });

  const extensionDir = path.join(tempRoot, 'extension');
  fs.cpSync(extensionSource, extensionDir, { recursive: true });
  fs.writeFileSync(path.join(extensionDir, 'smoke-marker.js'), "document.documentElement.dataset.geminibuddySmoke = 'loaded';");

  const manifestPath = path.join(extensionDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.content_scripts[0].matches.push('http://*/*');
  manifest.content_scripts[0].js.unshift('smoke-marker.js');
  manifest.host_permissions = [...new Set([...(manifest.host_permissions || []), 'http://*/*'])];
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const userscriptPath = path.join(extensionDir, 'GeminiBuddy.user.js');
  let userscript = fs.readFileSync(userscriptPath, 'utf8');
  userscript = userscript.replace(
    /const DEFAULT_PROMPTS_URL = "[^"]+";/,
    `const DEFAULT_PROMPTS_URL = "${baseUrl}/default.json";`
  );
  userscript = userscript.replace(
    /const VEO_PROMPTS_URL = "[^"]+";/,
    `const VEO_PROMPTS_URL = "${baseUrl}/veo.json";`
  );
  fs.writeFileSync(userscriptPath, userscript);

  const shimPath = path.join(extensionDir, 'gm-shim.js');
  let shim = fs.readFileSync(shimPath, 'utf8');
  shim = shim.replace(
    'globalThis.GM_getValue = function(key, defaultValue) {',
    `globalThis.GM_getValue = function(key, defaultValue) {
    if (key === 'gemini_custom_prompts_v6' && typeof defaultValue === 'undefined') {
      return Promise.resolve(JSON.stringify({ Smoke: [{ id: 'smoke-prompt', name: 'Smoke prompt', text: 'Smoke prompt' }] }));
    }`
  );
  fs.writeFileSync(shimPath, shim);

  const policyPath = path.join(extensionDir, 'network-policy.js');
  let policy = fs.readFileSync(policyPath, 'utf8');
  policy = policy.replace(
    "const BUILTIN_ORIGINS = Object.freeze([",
    `const BUILTIN_ORIGINS = Object.freeze(['${baseUrl}',`
  );
  policy = policy.replace(
    "return url.protocol === 'https:' ? url : null;",
    `return url.protocol === 'https:' || url.origin === '${baseUrl}' ? url : null;`
  );
  fs.writeFileSync(policyPath, policy);
  return extensionDir;
}

async function main() {
  const browser = findBrowser();
  const fixturePort = await getFreePort();
  const debugPort = await getFreePort();
  const fixtureUrl = `http://127.0.0.1:${fixturePort}/gemini`;
  const baseUrl = `http://127.0.0.1:${fixturePort}`;
  const fixtureServer = http.createServer((request, response) => {
    if (request.url === '/veo.json') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end('[]');
      return;
    }
    if (request.url === '/default.json') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end('{}');
      return;
    }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end('<!doctype html><html><body><main><div class="chat-history"></div><rich-textarea></rich-textarea></main></body></html>');
  });
  await new Promise((resolve, reject) => {
    fixtureServer.once('error', reject);
    fixtureServer.listen(fixturePort, '127.0.0.1', resolve);
  });

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'geminibuddy-mv3-smoke-'));
  const profileDir = path.join(tempRoot, 'profile');
  const extensionDir = prepareSmokeExtension(baseUrl, tempRoot);
  const browserProcess = spawn(browser, [
    ...(process.env.GEMINIBUDDY_HEADED === '1' ? [] : ['--headless=new']),
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-popup-blocking',
    '--user-data-dir=' + profileDir,
    '--remote-debugging-port=' + debugPort,
    '--load-extension=' + extensionDir,
    '--disable-extensions-except=' + extensionDir,
    'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
  const browserStderr = [];
  browserProcess.stderr.on('data', chunk => browserStderr.push(String(chunk)));

  let pageSession;
  const consoleErrors = [];
  try {
    await waitForJson(
      `http://127.0.0.1:${debugPort}/json/list`,
      values => values.some(target => target.type === 'page')
    );
    const workerTarget = await findGeminiBuddyWorker(debugPort, browserStderr);
    const extensionId = new URL(workerTarget.url).hostname;
    const pageTarget = await createBrowserTarget(debugPort, `${fixtureUrl}?smoke=ready`);
    pageSession = new CdpSession(pageTarget.webSocketDebuggerUrl);
    await pageSession.connect();
    pageSession.on('Runtime.consoleAPICalled', event => {
      if (event.type === 'error') consoleErrors.push(event.args?.map(arg => arg.value || arg.description).join(' '));
    });
    pageSession.on('Runtime.exceptionThrown', event => {
      consoleErrors.push(event.exceptionDetails?.text || 'Unhandled page exception');
    });
    pageSession.on('Log.entryAdded', event => {
      if (event.entry?.level === 'error') consoleErrors.push(event.entry.text || 'Browser log error');
    });
    await pageSession.send('Runtime.enable');
    await pageSession.send('Log.enable');
    await pageSession.send('Page.navigate', { url: `${fixtureUrl}?smoke=ready` });
    try {
      await waitForExpression(pageSession, "document.documentElement.dataset.geminibuddySmoke === 'loaded'", 10000);
      await waitForExpression(pageSession, "Boolean(document.querySelector('#gemini-prompt-panel-main') && document.querySelector('.prompt-button'))", 15000);
    } catch (error) {
      const pageState = await evaluate(pageSession, `({
        title: document.title,
        bodyLength: document.body?.innerHTML.length || 0,
        readyState: document.readyState
      })`).catch(evaluationError => ({ evaluationError: evaluationError.message }));
      const debugTargets = await getJson(`http://127.0.0.1:${debugPort}/json/list`).catch(targetError => ({ targetError: targetError.message }));
      throw new Error(`${error.message}; page=${JSON.stringify(pageState)}; console=${JSON.stringify(consoleErrors)}; targets=${JSON.stringify(debugTargets)}; browser=${browserStderr.join('').trim()}`);
    }
    const panelState = await evaluate(pageSession, `({
      panel: Boolean(document.querySelector('#gemini-prompt-panel-main')),
      prompt: Boolean(document.querySelector('.prompt-button')),
      fixture: Boolean(document.querySelector('main .chat-history'))
    })`);
    if (!panelState.panel || !panelState.prompt || !panelState.fixture) throw new Error('Gemini fixture did not initialize the panel and prompt controls.');

    await pageSession.send('Page.navigate', { url: `chrome-extension://${extensionId}/options.html` });
    await waitForExpression(pageSession, "Boolean(document.querySelector('#status'))", 10000);
    const optionsState = await evaluate(pageSession, `({
      status: document.querySelector('#status')?.textContent || '',
      prompts: Boolean(document.querySelector('#prompts-json')),
      settings: Boolean(document.querySelector('#theme-name'))
    })`);
    if (!optionsState.prompts || !optionsState.settings || !/Loaded|Migrated/.test(optionsState.status)) {
      throw new Error(`Options page did not initialize: ${JSON.stringify(optionsState)}`);
    }

    await pageSession.send('Page.navigate', { url: `chrome-extension://${extensionId}/sidepanel.html` });
    await waitForExpression(pageSession, "(document.querySelector('#profile-select')?.options.length || 0) > 0 || Boolean(document.querySelector('#status.error'))", 10000);
    const sidePanelState = await evaluate(pageSession, `({
      title: document.title,
      profileOptions: document.querySelector('#profile-select')?.options.length || 0,
      promptList: Boolean(document.querySelector('#prompt-list')),
      editor: Boolean(document.querySelector('#prompt-text')),
      status: document.querySelector('#status')?.textContent || ''
    })`);
    if (!sidePanelState.promptList || !sidePanelState.editor || sidePanelState.profileOptions < 1) {
      throw new Error(`Side panel did not initialize: ${JSON.stringify(sidePanelState)}`);
    }

    await wait(500);
    if (consoleErrors.length) throw new Error(`Browser console errors:\n${consoleErrors.join('\n')}`);
    console.log(`MV3 smoke passed: panel, prompt fixture, options, and side panel initialized in a clean profile (${extensionId}).`);
  } finally {
    pageSession?.close();
    if (browserProcess.pid) {
      try {
        execFileSync('taskkill.exe', ['/PID', String(browserProcess.pid), '/T', '/F'], { stdio: 'ignore' });
      } catch (_error) {
        browserProcess.kill();
      }
    }
    await wait(300);
    await new Promise(resolve => fixtureServer.close(() => resolve()));
    try {
      fs.rmSync(tempRoot, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
    } catch (cleanupError) {
      console.warn(`MV3 smoke cleanup deferred: ${cleanupError.message}`);
    }
  }
}

main().catch(error => {
  console.error(`MV3 smoke failed: ${error.message}`);
  process.exitCode = 1;
});
