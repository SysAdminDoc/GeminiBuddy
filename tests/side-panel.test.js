import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const manifest = JSON.parse(await readFile(new URL('../chrome_extension/manifest.json', import.meta.url), 'utf8'));
const sidePanel = await readFile(new URL('../chrome_extension/sidepanel.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../chrome_extension/sidepanel.html', import.meta.url), 'utf8');
const userscript = await readFile(new URL('../GeminiBuddy.user.js', import.meta.url), 'utf8');

test('MV3 side panel is packaged with shared storage and insertion bridge permissions', () => {
    assert.deepEqual(manifest.permissions.includes('sidePanel'), true);
    assert.deepEqual(manifest.permissions.includes('activeTab'), true);
    assert.equal(manifest.side_panel.default_path, 'sidepanel.html');
    assert.equal(manifest.action.default_title, '__MSG_actionOpenSidePanel__');
    assert.match(html, /id="profile-select"/);
    assert.match(html, /id="prompt-text"/);
    assert.match(sidePanel, /gemini_prompt_profile_prompts_v1_/);
    assert.match(sidePanel, /geminibuddy-insert-prompt/);
    assert.match(sidePanel, /geminibuddy-switch-profile/);
    assert.match(sidePanel, /geminibuddy-refresh-profile/);
});

test('userscript exposes the side panel message bridge without changing userscript-only behavior', () => {
    assert.match(userscript, /geminibuddy-insert-prompt/);
    assert.match(userscript, /geminibuddy-switch-profile/);
    assert.match(userscript, /geminibuddy-refresh-profile/);
    assert.match(userscript, /onMessage\.addListener/);
});
