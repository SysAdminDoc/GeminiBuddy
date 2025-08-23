// ==UserScript==
// @name         VEO AI Scraper Pro 2
// @namespace    http://tampermonkey.net/
// @version      4.2
// @description  Advanced scraper for Facebook group video posts. Features proactive "See More" expansion for more reliable data capture.
// @author       You & Gemini
// @match        https://www.facebook.com/*
// @grant        GM_download
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        GM_openInTab
// @grant        window.focus
// @grant        window.close
// ==/UserScript==

(function () {
  'use strict';

  // =========================================================================
  // CONFIGURATION & STATE
  // =========================================================================
  const DEFAULTS = {
    scrollIntervalMs: 3000,
    scanIntervalMs: 1500,
    reclickCooldownMs: 5000,
    minCharCount: 100,
    workerWaitDelayMs: 5000,    // allow network to fire
    workerTimeoutMs: 60000,     // total per-post limit
    theme: 'dark',
    backoffMaxMs: 8000,         // dynamic scroll backoff cap
    backoffStepMs: 1000,        // how much to add each no-new-post pass
    pauseWhenHidden: true,
  };

  let state = {
    isProcessing: false,
    isPaused: false,
    seeMoreIntervalId: null,
    scrapedDataMap: new Map(),   // key: permalink, val: { prompt, post_url, ... }
    postQueue: [],
    activeWorkerTab: null,
    valueChangeListener: null,   // listener id (number)
    workerTimeout: null,
    settings: { ...DEFAULTS },
    noNewPostPasses: 0,
  };

  const STORAGE_KEYS = {
    get data() {
      try {
        const m = window.location.pathname.match(/\/groups\/([a-zA-Z0-9._]+)/);
        if (m && m[1]) return `veo_scraped_data_${m[1]}`;
      } catch (_) {}
      const urlParams = new URLSearchParams(window.location.search);
      const groupId = urlParams.get('group_id');
      return groupId ? `veo_scraped_data_${groupId}` : 'veo_scraped_data_default';
    },
    task: 'veo_worker_task',
    result: 'veo_worker_result',
    settings: 'veo_settings',
    seenHashes: 'veo_seen_hashes',
  };

  const lastClickMap = new WeakMap();

  // =========================================================================
  // UI ELEMENTS & ICONS
  // =========================================================================
  let ui, statusText, startButton, stopButton, exportButton, dataCountBadge,
    settingsButton, settingsModal, themeToggleButton, toastContainer,
    dataContainer;

  const settingsInputs = {};

  const ICONS = {
    play: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
    stop: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>`,
    download: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
    settings: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
    close: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    sun: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.93"></line></svg>`,
    moon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`,
    trash: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    spinner: `<svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`
  };

  // =========================================================================
  // SCRIPT INITIALIZATION
  // =========================================================================
  async function initialize() {
    const task = await GM_getValue(STORAGE_KEYS.task, null);
    if (task) {
      await runWorker(task);
    } else {
      if (window.location.pathname.includes('/groups/')) {
        const FBINJECTIONCHECK = setInterval(async () => {
          if (document.querySelector('div[role="feed"]')) {
            clearInterval(FBINJECTIONCHECK);
            injectStyles();
            await createUI();
            console.log('VEO AI Scraper Pro: Controller UI Injected.');
          }
        }, 500);
      }
    }
  }

  // =========================================================================
  // WORKER LOGIC (Unchanged)
  // =========================================================================
  async function runWorker(task) {
    console.log('VEO Worker: Started for task:', task.post_url);
    await GM_deleteValue(STORAGE_KEYS.task);

    try {
      const savedSettings = await GM_getValue(STORAGE_KEYS.settings, {});
      state.settings = { ...DEFAULTS, ...savedSettings };
    } catch (_) {}

    const foundLinks = new Set();
    const normalize = (u) => {
      try {
        const url = new URL(u, location.href);
        if (!/^https?:\/\/video/i.test(url.href)) return null;
        url.searchParams.delete('bytestart');
        url.searchParams.delete('byteend');
        return url.href;
      } catch { return null; }
    };

    const realFetch = window.fetch;
    window.fetch = function (url, opts) {
      const u = typeof url === 'string' ? url : (url && url.url) || '';
      const full = normalize(u);
      if (full && !foundLinks.has(full)) foundLinks.add(full);
      return realFetch.apply(this, arguments);
    };

    (function () {
      const RealXHR = window.XMLHttpRequest;
      function XHR() {
        const xhr = new RealXHR();
        let capturedUrl = null;
        const open = xhr.open;
        xhr.open = function (method, url) {
          capturedUrl = url;
          return open.apply(xhr, arguments);
        };
        xhr.addEventListener('loadstart', function () {
          const full = normalize(capturedUrl || '');
          if (full && !foundLinks.has(full)) foundLinks.add(full);
        });
        return xhr;
      }
      window.XMLHttpRequest = XHR;
      XHR.prototype = RealXHR.prototype;
    })();

    function sweepPerformance() {
      try {
        performance.getEntriesByType('resource').forEach(e => {
          const full = normalize(e.name);
          if (full && !foundLinks.has(full)) foundLinks.add(full);
        });
      } catch {}
    }

    function tryAutoplay() {
      const video = document.querySelector('video');
      if (!video) return;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.style.visibility = 'hidden';
      video.play().catch(() => {});
    }

    const waitMs = Math.max(1000, state.settings.workerWaitDelayMs);
    const t0 = Date.now();
    while (Date.now() - t0 < waitMs) {
      tryAutoplay();
      sweepPerformance();
      if (foundLinks.size > 0) break;
      await sleep(300);
    }
    sweepPerformance();

    const mediaLinks = Array.from(foundLinks);
    const thumbnailUrl = document.querySelector('meta[property="og:image"]')?.content || null;
    const postContentElement = document.querySelector('div[data-ad-preview="message"], div[data-ad-id]');
    const prompt = postContentElement ? postContentElement.innerText.trim() : task.prompt;

    const result = {
      ...task,
      prompt,
      post_url: cleanUrl(window.location.href),
      video_url: mediaLinks[0] || null,
      audio_url: mediaLinks[1] || null,
      thumbnail_url: thumbnailUrl,
      status: mediaLinks.length ? 'completed' : 'failed: no-media'
    };

    console.log('VEO Worker: Result', result);
    await GM_setValue(STORAGE_KEYS.result, result);
    try { window.close(); } catch (_) {}
  }

  // =========================================================================
  // CONTROLLER LOGIC
  // =========================================================================
  async function controllerManager() {
    if (state.isPaused || !state.isProcessing) return;

    if (state.postQueue.length === 0) {
      updateStatus('No new video posts found. Scrolling...', true);
      window.scrollTo(0, document.body.scrollHeight);
      const backoff =
        Math.min(state.settings.scrollIntervalMs + state.noNewPostPasses * state.settings.backoffStepMs, state.settings.backoffMaxMs);
      await sleep(backoff);

      const newCount = await findNewVideoPosts();
      if (newCount === 0) {
        state.noNewPostPasses++;
      } else {
        state.noNewPostPasses = 0;
      }
    }

    if (state.postQueue.length > 0) {
      processNextInQueue();
    } else if (state.isProcessing) {
      setTimeout(controllerManager, 100);
    } else {
      stopProcess('No more posts found.');
    }
  }

  async function findNewVideoPosts() {
    updateStatus('Scanning for new video posts...', true);
    const feedNodes = document.querySelectorAll('div[role="feed"] > div, div[data-pagelet*="FeedUnit"]');
    let newPostsFound = 0;

    const seenHashes = new Set(await GM_getValue(STORAGE_KEYS.seenHashes, []));

    for (const post of feedNodes) {
      const videoLinkElement = post.querySelector('a[href*="/videos/"], a[href*="/watch/"], a[href*="/reel/"]');
      if (!videoLinkElement || !videoLinkElement.href) continue;

      const permalink = cleanUrl(videoLinkElement.href);
      if (state.scrapedDataMap.has(permalink) || state.postQueue.some(p => p.post_url === permalink)) continue;

      // UPDATED LOGIC: Proactively find, click, and wait for "See More" to disappear.
      const seeMoreButton = Array.from(post.querySelectorAll('div[role="button"]'))
                                 .find(el => /^(see\s*more|continue\s*reading)$/i.test(el.innerText));

      if (seeMoreButton) {
          console.log(`Found "See More" for ${permalink}. Attempting immediate expansion...`);
          seeMoreButton.click();
          await waitForExpansion(post); // Wait for the button to disappear before proceeding
      }

      const postContentElement = post.querySelector('div[data-ad-preview="message"], div[data-ad-id]');
      const prompt = postContentElement ? postContentElement.innerText.trim() : '';
      if (prompt.length < state.settings.minCharCount) continue;

      const h = simpleHash(prompt);
      if (seenHashes.has(h)) continue;

      const task = { prompt, post_url: permalink, status: 'queued' };
      state.scrapedDataMap.set(permalink, task);
      state.postQueue.push(task);
      seenHashes.add(h);
      newPostsFound++;
    }

    await GM_setValue(STORAGE_KEYS.seenHashes, Array.from(seenHashes));

    renderScrapedData();
    updateDataCount();
    if (newPostsFound) showToast(`${newPostsFound} new video posts added to queue.`);
    return newPostsFound;
  }

  async function processNextInQueue() {
    if (!state.isProcessing || state.isPaused || state.postQueue.length === 0) {
      if (state.isProcessing && !state.isPaused) controllerManager();
      return;
    }

    const task = state.postQueue.shift();
    updateStatus(`Opening worker for post... (${state.postQueue.length + 1} left)`, true);

    const currentData = state.scrapedDataMap.get(task.post_url) || task;
    currentData.status = 'processing';
    state.scrapedDataMap.set(task.post_url, currentData);
    renderScrapedData();

    state.workerTimeout = setTimeout(() => {
      console.error(`Worker for ${task.post_url} timed out.`);
      if (state.activeWorkerTab) {
        try { state.activeWorkerTab.close(); } catch (_) {}
        state.activeWorkerTab = null;
      }
      handleWorkerResult(STORAGE_KEYS.result, null, { post_url: task.post_url, status: 'failed: timeout' });
    }, state.settings.workerTimeoutMs);

    await GM_setValue(STORAGE_KEYS.task, task);
    state.activeWorkerTab = GM_openInTab(task.post_url, { active: false });
  }

  function handleWorkerResult(name, oldValue, newValue, remote) {
    if (name !== STORAGE_KEYS.result || !newValue || typeof newValue !== 'object') return;

    clearTimeout(state.workerTimeout);
    state.workerTimeout = null;
    state.activeWorkerTab = null;

    const result = newValue;
    state.scrapedDataMap.set(result.post_url, result);
    saveScrapedData();
    renderScrapedData();
    updateDataCount();
    updateStatus(`Scraped ${result.post_url}`);

    if (state.isProcessing && !state.isPaused) {
        setTimeout(processNextInQueue, 600);
    }
  }

  // =========================================================================
  // UI & STYLES
  // =========================================================================
  function injectStyles() {
    GM_addStyle(`
      :root {
        --bg-primary: #1A1B1E; --bg-secondary: #2A2B2F; --bg-tertiary: #3A3B3F;
        --border-color: #36373A; --text-primary: #E4E6EB; --text-secondary: #B0B3B8;
        --accent-primary: #4F7EFF; --accent-primary-hover: #6A95FF;
        --accent-secondary: #3A3B3F; --accent-secondary-hover: #4E4F50;
        --destructive: #FA3E3E; --destructive-hover: #FF5252;
        --success: #32A852; --warning: #ffc107;
        --shadow-color: rgba(0,0,0,0.4); --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      }
      .veo-pro-panel.light-mode, .veo-modal.light-mode {
        --bg-primary: #FFFFFF; --bg-secondary: #F0F2F5; --bg-tertiary: #E4E6EB;
        --border-color: #CED0D4; --text-primary: #050505; --text-secondary: #65676B;
        --accent-secondary: #E4E6EB; --accent-secondary-hover: #D8DADF;
        --shadow-color: rgba(0, 0, 0, 0.15);
      }
      .veo-pro-panel {
        position: fixed; top: 80px; right: 20px; z-index: 999999; width: 480px;
        background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-color);
        box-shadow: 0 8px 24px var(--shadow-color); font-family: var(--font-sans);
        color: var(--text-primary); display: flex; flex-direction: column;
        transition: all 0.2s ease-in-out; max-height: 80vh;
      }
      .veo-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border-color); background: var(--bg-secondary); border-radius: 12px 12px 0 0;}
      .veo-title { margin: 0; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
      .veo-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; font-size: 12px; font-weight: 500; border-radius: 999px; background: var(--bg-tertiary); color: var(--text-secondary); }
      .veo-badge b { color: var(--text-primary); }
      .veo-header-actions { display: flex; gap: 8px; }
      .veo-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; padding: 0; border: none; border-radius: 8px; background: var(--accent-secondary); color: var(--text-secondary); cursor: pointer; transition: background-color 0.2s, color 0.2s; }
      .veo-icon-btn:hover { background: var(--accent-secondary-hover); color: var(--text-primary); }
      .veo-body { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
      .veo-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .veo-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 10px 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s; }
      .veo-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .veo-btn.primary { background: var(--accent-primary); color: white; box-shadow: 0 2px 8px rgba(79, 126, 255, 0.2); }
      .veo-btn.primary:not(:disabled):hover { background: var(--accent-primary-hover); transform: translateY(-1px); }
      .veo-btn.destructive { background: var(--destructive); color: white; }
      .veo-btn.destructive:not(:disabled):hover { background: var(--destructive-hover); }
      .veo-btn.secondary { background: var(--accent-secondary); color: var(--text-primary); }
      .veo-btn.secondary:not(:disabled):hover { background: var(--accent-secondary-hover); }
      .veo-btn.full-width { grid-column: 1 / -1; }
      .veo-status { font-size: 13px; color: var(--text-secondary); text-align: center; min-height: 20px; line-height: 1.4; display: flex; align-items: center; justify-content: center; gap: 6px; }
      .veo-data-container { border-top: 1px solid var(--border-color); background: var(--bg-secondary); overflow-y: auto; flex-grow: 1; }
      .veo-data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
      .veo-data-table th, .veo-data-table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--border-color); }
      .veo-data-table th { font-weight: 600; color: var(--text-secondary); background: var(--bg-tertiary); position: sticky; top: 0; z-index: 1; }
      .veo-data-table td { color: var(--text-primary); vertical-align: top; }
      .veo-data-table .prompt-cell { max-width: 220px; white-space: pre-wrap; word-break: break-word; font-size: 11px; }
      .veo-data-table .url-cell { word-break: break-all; }
      .veo-data-table .url-cell a { color: var(--accent-primary); text-decoration: none; display: block; margin-bottom: 4px; }
      .veo-data-table .url-cell a:hover { text-decoration: underline; }
      .veo-data-table .status-cell { font-weight: bold; }
      .veo-data-table .status-completed { color: var(--success); }
      .veo-data-table .status-processing, .veo-data-table .status-queued, .veo-data-table .status-re-queued { color: var(--warning); }
      .veo-data-table .status-failed { color: var(--destructive); }
      .veo-data-table .action-cell { width: 40px; text-align: center; }
      .veo-delete-btn { background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px; border-radius: 4px; }
      .veo-delete-btn:hover { background: var(--destructive); color: white; }
      .veo-data-empty { text-align: center; padding: 20px; color: var(--text-secondary); }
      .veo-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000000; opacity: 0; visibility: hidden; transition: opacity 0.2s, visibility 0.2s; }
      .veo-modal-backdrop.visible { opacity: 1; visibility: visible; }
      .veo-modal { background: var(--bg-primary); border-radius: 12px; width: 480px; max-width: 90vw; box-shadow: 0 10px 30px rgba(0,0,0,0.25); border: 1px solid var(--border-color); transform: scale(0.95); transition: transform 0.2s; }
      .veo-modal-backdrop.visible .veo-modal { transform: scale(1); }
      .veo-modal-header { padding: 12px 16px; background: var(--bg-secondary); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; border-radius: 12px 12px 0 0; }
      .veo-modal-title { margin: 0; font-size: 16px; font-weight: 600; }
      .veo-modal-body { padding: 20px; font-size: 14px; color: var(--text-primary); display: flex; flex-direction: column; gap: 16px; max-height: 60vh; overflow-y: auto;}
      .veo-setting-group h4 { font-size: 12px; text-transform: uppercase; color: var(--text-secondary); margin: 0 0 12px 0; padding-bottom: 4px; border-bottom: 1px solid var(--border-color); }
      .veo-setting { display: flex; flex-direction: column; gap: 4px; }
      .veo-setting-row { display: flex; justify-content: space-between; align-items: center; width: 100%; }
      .veo-setting label { font-weight: 500; }
      .veo-setting input[type="number"] { width: 100px; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); }
      .veo-setting p { font-size: 12px; color: var(--text-secondary); margin: 0; }
      .veo-toggle-switch { display: flex; align-items: center; gap: 10px; }
      .veo-toggle-switch .switch { position: relative; display: inline-block; width: 40px; height: 22px; }
      .veo-toggle-switch .switch input { opacity: 0; width: 0; height: 0; }
      .veo-toggle-switch .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--bg-tertiary); transition: .4s; border-radius: 22px; }
      .veo-toggle-switch .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
      .veo-toggle-switch input:checked + .slider { background-color: var(--accent-primary); }
      .veo-toggle-switch input:checked + .slider:before { transform: translateX(18px); }
      .veo-modal-footer { padding: 12px 16px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-secondary); border-radius: 0 0 12px 12px; }
      .veo-data-actions { display: flex; gap: 8px; }
      .veo-data-actions button, .veo-modal-footer button { font-size: 13px; padding: 8px 12px; }
      .veo-toast-container { position: fixed; bottom: 20px; right: 20px; z-index: 1000001; display: flex; flex-direction: column; gap: 10px; }
      .veo-toast { padding: 12px 18px; background: var(--bg-secondary); color: var(--text-primary); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.35); border: 1px solid var(--border-color); font-size: 14px; opacity: 0; transform: translateX(100%); animation: slideIn 0.3s forwards, fadeOut 0.3s 2.7s forwards; }
      @keyframes slideIn { to { opacity: 1; transform: translateX(0); } }
      @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
      @keyframes spin { to { transform: rotate(360deg); } }
      .spinner { animation: spin 1s linear infinite; }
    `);
  }

  async function createUI() {
    ui = document.createElement('div');
    ui.className = 'veo-pro-panel';
    ui.innerHTML = `
      <div class="veo-header">
        <h3 class="veo-title">VEO Scraper Pro</h3>
        <div class="veo-header-actions">
          <span class="veo-badge">Scraped: <b id="veo-data-badge">0</b></span>
          <button class="veo-icon-btn" id="veo-theme-toggle" title="Toggle Theme">${ICONS.sun}</button>
          <button class="veo-icon-btn" id="veo-settings-btn" title="Settings">${ICONS.settings}</button>
        </div>
      </div>
      <div class="veo-body">
        <div class="veo-controls">
          <button class="veo-btn primary" id="veo-start-btn">${ICONS.play} Start</button>
          <button class="veo-btn destructive" id="veo-stop-btn" disabled>${ICONS.stop} Stop</button>
          <button class="veo-btn secondary full-width" id="veo-export-btn" disabled>${ICONS.download} Export Scraped Data</button>
        </div>
        <div class="veo-status">Ready to begin.</div>
      </div>
      <div class="veo-data-container">
        <table class="veo-data-table">
          <thead><tr><th>Prompt</th><th>Links</th><th>Status</th><th class="action-cell"></th></tr></thead>
          <tbody><tr><td colspan="4" class="veo-data-empty">No data scraped yet.</td></tr></tbody>
        </table>
      </div>
    `;
    document.body.appendChild(ui);

    settingsModal = document.createElement('div');
    settingsModal.className = 'veo-modal-backdrop';
    settingsModal.innerHTML = `
      <div class="veo-modal">
        <div class="veo-modal-header">
          <h3 class="veo-modal-title">Settings</h3>
          <button class="veo-icon-btn" id="veo-modal-close-btn" title="Close">${ICONS.close}</button>
        </div>
        <div class="veo-modal-body">
          <div class="veo-setting-group">
            <h4>Scraping Behavior</h4>
            <div class="veo-setting">
              <div class="veo-setting-row">
                <label for="veo-minCharCount-input">Min. Character Count</label>
                <input type="number" id="veo-minCharCount-input" min="0" step="10">
              </div>
              <p>Posts with text shorter than this will be skipped.</p>
            </div>
             <div class="veo-setting">
                <div class="veo-setting-row">
                    <label for="veo-pauseWhenHidden-input">Pause when tab is hidden</label>
                    <div class="veo-toggle-switch">
                        <label class="switch">
                            <input type="checkbox" id="veo-pauseWhenHidden-input">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                <p>Automatically pause/resume when switching tabs to save resources.</p>
            </div>
          </div>
          <div class="veo-setting-group">
            <h4>Performance</h4>
            <div class="veo-setting">
              <div class="veo-setting-row">
                <label for="veo-scrollIntervalMs-input">Scroll Delay (ms)</label>
                <input type="number" id="veo-scrollIntervalMs-input" min="500" step="100">
              </div>
              <p>Base wait time after scrolling to find new posts.</p>
            </div>
            <div class="veo-setting">
              <div class="veo-setting-row">
                <label for="veo-workerWaitDelayMs-input">Worker Wait (ms)</label>
                <input type="number" id="veo-workerWaitDelayMs-input" min="500" step="100">
              </div>
              <p>How long the worker tab waits for media requests.</p>
            </div>
             <div class="veo-setting">
              <div class="veo-setting-row">
                <label for="veo-backoffStepMs-input">Backoff Step (ms)</label>
                <input type="number" id="veo-backoffStepMs-input" min="100" step="100">
              </div>
              <p>Increase scroll delay by this much on each empty pass.</p>
            </div>
             <div class="veo-setting">
              <div class="veo-setting-row">
                <label for="veo-backoffMaxMs-input">Backoff Max (ms)</label>
                <input type="number" id="veo-backoffMaxMs-input" min="1000" step="500">
              </div>
              <p>Maximum scroll delay the backoff can reach.</p>
            </div>
          </div>
        </div>
        <div class="veo-modal-footer">
            <button class="veo-btn secondary" id="veo-reset-defaults-btn">Reset Defaults</button>
            <div class="veo-data-actions">
              <button class="veo-btn secondary" id="veo-import-btn" title="Import data from a previously exported JSON file">Import JSON</button>
              <button class="veo-btn secondary" id="veo-rescan-btn" title="Re-queue posts that may have been scraped before expanding">Rescan Incomplete</button>
              <button class="veo-btn destructive" id="veo-clear-data-btn" title="Delete all scraped data for this group">Clear Data</button>
            </div>
            <button class="veo-btn primary" id="veo-settings-save-btn">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(settingsModal);

    toastContainer = document.createElement('div');
    toastContainer.className = 'veo-toast-container';
    document.body.appendChild(toastContainer);

    statusText = ui.querySelector('.veo-status');
    startButton = ui.querySelector('#veo-start-btn');
    stopButton = ui.querySelector('#veo-stop-btn');
    exportButton = ui.querySelector('#veo-export-btn');
    dataCountBadge = ui.querySelector('#veo-data-badge');
    dataContainer = ui.querySelector('.veo-data-table tbody');
    settingsButton = ui.querySelector('#veo-settings-btn');
    themeToggleButton = ui.querySelector('#veo-theme-toggle');

    settingsInputs.minCharCount = settingsModal.querySelector('#veo-minCharCount-input');
    settingsInputs.pauseWhenHidden = settingsModal.querySelector('#veo-pauseWhenHidden-input');
    settingsInputs.scrollIntervalMs = settingsModal.querySelector('#veo-scrollIntervalMs-input');
    settingsInputs.workerWaitDelayMs = settingsModal.querySelector('#veo-workerWaitDelayMs-input');
    settingsInputs.backoffStepMs = settingsModal.querySelector('#veo-backoffStepMs-input');
    settingsInputs.backoffMaxMs = settingsModal.querySelector('#veo-backoffMaxMs-input');

    addEventListeners();
    await loadSettings();
    await loadScrapedData();
  }

  function addEventListeners() {
    startButton.addEventListener('click', startProcess);
    stopButton.addEventListener('click', () => stopProcess('User stopped process.'));
    exportButton.addEventListener('click', () => downloadJSON(Array.from(state.scrapedDataMap.values())));

    settingsButton.addEventListener('click', openSettingsModal);
    settingsModal.querySelector('#veo-modal-close-btn').addEventListener('click', () => settingsModal.classList.remove('visible'));
    settingsModal.querySelector('#veo-settings-save-btn').addEventListener('click', saveSettings);
    settingsModal.querySelector('#veo-reset-defaults-btn').addEventListener('click', resetSettingsToDefaults);
    settingsModal.addEventListener('click', e => {
      if (e.target === settingsModal) settingsModal.classList.remove('visible');
    });

    settingsModal.querySelector('#veo-import-btn').addEventListener('click', handleImport);
    settingsModal.querySelector('#veo-rescan-btn').addEventListener('click', rescanIncompletePosts);
    settingsModal.querySelector('#veo-clear-data-btn').addEventListener('click', handleClearData);
    themeToggleButton.addEventListener('click', toggleTheme);

    dataContainer.addEventListener('click', e => {
      const deleteButton = e.target.closest('.veo-delete-btn');
      if (deleteButton) {
        const permalink = deleteButton.dataset.permalink;
        if (permalink && state.scrapedDataMap.has(permalink)) {
          state.scrapedDataMap.delete(permalink);
          saveScrapedData();
          renderScrapedData();
          updateDataCount();
        }
      }
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  // =========================================================================
  // PROCESS CONTROL
  // =========================================================================
  function startProcess() {
    state.isProcessing = true;
    state.isPaused = false;
    startButton.disabled = true;
    stopButton.disabled = false;
    exportButton.disabled = true;
    state.noNewPostPasses = 0;

    state.seeMoreIntervalId = setInterval(scanAndClickSeeMore, state.settings.scanIntervalMs);
    state.valueChangeListener = GM_addValueChangeListener(STORAGE_KEYS.result, handleWorkerResult);

    if (document.hidden && state.settings.pauseWhenHidden) {
        handleVisibilityChange();
    } else {
        updateStatus('Starting scraper...', true);
        controllerManager();
    }
  }

  function stopProcess(reason = 'Process stopped.') {
    state.isProcessing = false;
    state.isPaused = false;
    clearTimeout(state.workerTimeout);
    if (state.activeWorkerTab) {
      try { state.activeWorkerTab.close(); } catch (_) {}
      state.activeWorkerTab = null;
    }
    if (state.seeMoreIntervalId) clearInterval(state.seeMoreIntervalId);
    if (state.valueChangeListener) {
      GM_removeValueChangeListener(state.valueChangeListener);
      state.valueChangeListener = null;
    }
    updateStatus(reason);
    startButton.disabled = false;
    stopButton.disabled = true;
    exportButton.disabled = state.scrapedDataMap.size === 0;
    state.postQueue = [];
  }

  function handleVisibilityChange() {
      if (!state.isProcessing || !state.settings.pauseWhenHidden) return;

      if (document.hidden) {
          state.isPaused = true;
          updateStatus('Paused. Tab is not active.');
      } else {
          state.isPaused = false;
          updateStatus('Resuming scraper...', true);
          controllerManager();
      }
  }

  // =========================================================================
  // SETTINGS & THEME
  // =========================================================================
  function populateSettingsInputs(settings) {
      settingsInputs.minCharCount.value = settings.minCharCount;
      settingsInputs.pauseWhenHidden.checked = settings.pauseWhenHidden;
      settingsInputs.scrollIntervalMs.value = settings.scrollIntervalMs;
      settingsInputs.workerWaitDelayMs.value = settings.workerWaitDelayMs;
      settingsInputs.backoffStepMs.value = settings.backoffStepMs;
      settingsInputs.backoffMaxMs.value = settings.backoffMaxMs;
  }

  function openSettingsModal() {
      populateSettingsInputs(state.settings);
      settingsModal.classList.add('visible');
  }

  async function loadSettings() {
    const savedSettings = await GM_getValue(STORAGE_KEYS.settings, {});
    state.settings = { ...DEFAULTS, ...savedSettings };
    setTheme(state.settings.theme);
  }

  function saveSettings() {
    state.settings.minCharCount = parseInt(settingsInputs.minCharCount.value, 10) || DEFAULTS.minCharCount;
    state.settings.pauseWhenHidden = settingsInputs.pauseWhenHidden.checked;
    state.settings.scrollIntervalMs = parseInt(settingsInputs.scrollIntervalMs.value, 10) || DEFAULTS.scrollIntervalMs;
    state.settings.workerWaitDelayMs = parseInt(settingsInputs.workerWaitDelayMs.value, 10) || DEFAULTS.workerWaitDelayMs;
    state.settings.backoffStepMs = parseInt(settingsInputs.backoffStepMs.value, 10) || DEFAULTS.backoffStepMs;
    state.settings.backoffMaxMs = parseInt(settingsInputs.backoffMaxMs.value, 10) || DEFAULTS.backoffMaxMs;

    GM_setValue(STORAGE_KEYS.settings, state.settings);
    showToast('Settings saved!');
    settingsModal.classList.remove('visible');
  }

  function resetSettingsToDefaults() {
      if (confirm('Are you sure you want to reset all settings to their default values?')) {
          populateSettingsInputs(DEFAULTS);
          showToast('Settings reset to defaults. Click Save to apply.');
      }
  }

  function setTheme(theme) {
    state.settings.theme = theme;
    const isLight = theme === 'light';
    ui.classList.toggle('light-mode', isLight);
    settingsModal.querySelector('.veo-modal').classList.toggle('light-mode', isLight);
    themeToggleButton.innerHTML = isLight ? ICONS.moon : ICONS.sun;
    GM_setValue(STORAGE_KEYS.settings, state.settings);
  }

  function toggleTheme() {
    setTheme(state.settings.theme === 'dark' ? 'light' : 'dark');
  }

  // =========================================================================
  // DATA MANAGEMENT & UI RENDERING
  // =========================================================================
  async function loadScrapedData() {
    const savedJSON = await GM_getValue(STORAGE_KEYS.data, '[]');
    try {
      const dataArray = JSON.parse(savedJSON);
      dataArray.forEach(item => {
        if (item[1].status === 'processing') item[1].status = 'queued';
      });
      state.scrapedDataMap = new Map(dataArray);
      console.log(`Loaded ${state.scrapedDataMap.size} posts from storage.`);
    } catch (e) {
      console.error('Failed to load or parse scraped data:', e);
      state.scrapedDataMap = new Map();
    }
    renderScrapedData();
    updateDataCount();
  }

  async function saveScrapedData() {
    const dataArray = Array.from(state.scrapedDataMap.entries());
    await GM_setValue(STORAGE_KEYS.data, JSON.stringify(dataArray));
  }

  async function rescanIncompletePosts() {
    if (state.isProcessing) {
        showToast('Please stop the current process before rescanning.');
        return;
    }

    console.log('Starting rescan of incomplete posts...');
    updateStatus('Rescanning for incomplete posts...');

    const seeMoreRegex = /\.\.\.\s*see\s*more$/i;
    let requeuedCount = 0;
    const seenHashes = new Set(await GM_getValue(STORAGE_KEYS.seenHashes, []));

    for (const [permalink, data] of state.scrapedDataMap.entries()) {
        if (data.prompt && (seeMoreRegex.test(data.prompt) || data.status.startsWith('failed'))) {
            const oldHash = simpleHash(data.prompt);
            seenHashes.delete(oldHash);

            const task = { prompt: data.prompt, post_url: permalink, status: 're-queued' };
            state.postQueue.unshift(task);
            state.scrapedDataMap.set(permalink, task);
            requeuedCount++;
        }
    }

    if (requeuedCount > 0) {
        await GM_setValue(STORAGE_KEYS.seenHashes, Array.from(seenHashes));
        await saveScrapedData();
        renderScrapedData();
        updateDataCount();
        showToast(`${requeuedCount} posts were re-queued for scraping.`);
        settingsModal.classList.remove('visible');
        startProcess();
    } else {
        showToast('No incomplete posts found to rescan.');
        updateStatus('Ready to begin.');
    }
  }

  function handleClearData() {
    if (confirm(`Are you sure you want to delete all ${state.scrapedDataMap.size} scraped posts from this group's memory? This cannot be undone.`)) {
      state.scrapedDataMap.clear();
      GM_setValue(STORAGE_KEYS.seenHashes, []);
      saveScrapedData();
      renderScrapedData();
      updateDataCount();
      showToast('Scraped data cleared!');
    }
  }

  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = readerEvent => {
        try {
          const importedData = JSON.parse(readerEvent.target.result);
          if (!Array.isArray(importedData)) throw new Error('Imported file is not a valid data array.');
          let importedCount = 0;
          for (const item of importedData) {
            if (item && item.post_url) {
              state.scrapedDataMap.set(item.post_url, item);
              importedCount++;
            }
          }
          saveScrapedData();
          renderScrapedData();
          updateDataCount();
          showToast(`Successfully imported and merged ${importedCount} posts.`);
        } catch (err) {
          console.error('Import failed:', err);
          showToast('Import failed. Check console for errors.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function updateDataCount() {
    const count = state.scrapedDataMap.size;
    if (dataCountBadge) dataCountBadge.textContent = count;
    if (exportButton) exportButton.disabled = count === 0;
  }

  function renderScrapedData() {
    if (!dataContainer) return;
    dataContainer.innerHTML = '';
    if (state.scrapedDataMap.size === 0) {
      dataContainer.innerHTML = `<tr><td colspan="4" class="veo-data-empty">No data scraped yet.</td></tr>`;
      return;
    }

    const sortedData = Array.from(state.scrapedDataMap.entries()).reverse();
    for (const [permalink, data] of sortedData) {
      const row = document.createElement('tr');
      const statusClass = `status-${(data.status || '').split(':')[0]}`;
      const linksHTML = `
        ${data.post_url ? `<a href="${data.post_url}" target="_blank" rel="noopener noreferrer">Post</a>` : ''}
        ${data.video_url ? `<a href="${data.video_url}" target="_blank" rel="noopener noreferrer">Video</a>` : ''}
        ${data.audio_url ? `<a href="${data.audio_url}" target="_blank" rel="noopener noreferrer">Audio</a>` : ''}
        ${data.thumbnail_url ? `<a href="${data.thumbnail_url}" target="_blank" rel="noopener noreferrer">Thumbnail</a>` : ''}
      `;
      row.innerHTML = `
        <td class="prompt-cell">${escapeHTML(data.prompt || '')}</td>
        <td class="url-cell">${linksHTML}</td>
        <td class="status-cell ${statusClass}">${data.status || 'N/A'}</td>
        <td class="action-cell">
          <button class="veo-delete-btn" data-permalink="${permalink}" title="Delete Entry">${ICONS.trash}</button>
        </td>
      `;
      dataContainer.appendChild(row);
    }
  }

  function downloadJSON(data) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const groupName = document.querySelector('h1')?.innerText.replace(/\s+/g, '_') || 'facebook_group';
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
    const filename = `${groupName}_Scraped_Posts_EXPORT_${timestamp}.json`;

    updateStatus(`Downloading ${data.length} posts...`);
    showToast(`Downloading ${filename}`);

    try {
      GM_download({
        url, name: filename,
        onload: () => {
          URL.revokeObjectURL(url);
          updateStatus(`Download complete! ${data.length} posts saved.`);
        },
        onerror: (err) => {
          console.error('GM_download error:', err);
          fallbackDownload(url, filename, data.length);
        }
      });
    } catch (e) {
      console.error('GM_download failed, using fallback:', e);
      fallbackDownload(url, filename, data.length);
    }
  }

  // =========================================================================
  // HELPER FUNCTIONS
  // =========================================================================
  function updateStatus(text, isBusy = false) {
    if (statusText) statusText.innerHTML = isBusy ? `${ICONS.spinner} ${text}` : text;
  }

  // NEW helper function to wait for a post to expand
  async function waitForExpansion(postElement, timeout = 3000, interval = 200) {
      const startTime = Date.now();
      return new Promise(resolve => {
          const poll = () => {
              const seeMoreButton = Array.from(postElement.querySelectorAll('div[role="button"]'))
                                       .find(el => /^(see\s*more|continue\s*reading)$/i.test(el.innerText));
              if (!seeMoreButton) {
                  // Button is gone, expansion is successful
                  return resolve(true);
              }
              if (Date.now() - startTime > timeout) {
                  // Timeout reached
                  console.warn('Timed out waiting for post to expand.');
                  return resolve(false);
              }
              // Check again after interval
              setTimeout(poll, interval);
          };
          poll();
      });
  }

  function scanAndClickSeeMore() {
    if (!state.isProcessing || state.isPaused) return;
    const seeMoreRegex = /^(see\s*more|continue\s*reading)$/i;
    const candidates = document.querySelectorAll('div[role="button"]:not(a div[role="button"])');

    for (const el of candidates) {
      if (!el || !el.isConnected) continue;
      if (el.closest('a[href*="/reels/"]') || el.closest('div[data-pagelet*="Reels"]')) continue;

      const text = (el.innerText || el.textContent || '').trim();
      if (seeMoreRegex.test(text)) {
        const lastClickTime = lastClickMap.get(el) || 0;
        if (Date.now() - lastClickTime > state.settings.reclickCooldownMs) {
          try {
            el.click();
            lastClickMap.set(el, Date.now());
          } catch (_) {}
        }
      }
    }
  }

  function cleanUrl(urlString) {
    try {
      const url = new URL(urlString, location.href);
      url.search = '';
      return url.toString().replace(/\/$/, '');
    } catch (e) { return urlString; }
  }

  function fallbackDownload(url, filename, count) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    updateStatus(`Download complete! ${count} posts saved.`);
  }

  function showToast(message) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'veo-toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function escapeHTML(str) {
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function simpleHash(str) {
    let h = 0;
    if (!str || str.length === 0) return '0';
    for (let i = 0; i < str.length; i++) {
      const chr = str.charCodeAt(i);
      h = ((h << 5) - h) + chr;
      h |= 0;
    }
    return String(h);
  }

  // =========================================================================
  // START SCRIPT
  // =========================================================================
  initialize();

})();
