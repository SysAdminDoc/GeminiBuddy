import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const userscript = await readFile(new URL('../GeminiBuddy.user.js', import.meta.url), 'utf8');
const modularUtils = await readFile(new URL('../chrome_extension/src/utils.js', import.meta.url), 'utf8');
const modularPrompts = await readFile(new URL('../chrome_extension/src/features/prompts.js', import.meta.url), 'utf8');
const modularStyles = await readFile(new URL('../chrome_extension/src/styles.js', import.meta.url), 'utf8');

test('modal implementations expose dialog semantics and keyboard focus management', () => {
    for (const source of [userscript, modularUtils]) {
        assert.match(source, /setAttribute\('role', destructive \? 'alertdialog' : 'dialog'\)/);
        assert.match(source, /setAttribute\('aria-modal', 'true'\)/);
        assert.match(source, /event\.key (?:===|!==) 'Tab'/);
        assert.match(source, /event\.key === 'Escape'/);
        assert.match(source, /previousFocus/);
        assert.match(source, /isConnected/);
    }
});

test('prompt rows are native keyboard controls with visible focus affordances', () => {
    for (const source of [userscript, modularPrompts]) {
        assert.match(source, /const btn = document\.createElement\('button'\)/);
        assert.match(source, /btn\.type = 'button'/);
        assert.match(source, /Use prompt: \$\{promptData\.name\}/);
        assert.match(source, /wrapper\.insertBefore\(btn, wrapper\.firstChild\)/);
        assert.match(source, /header\.setAttribute\('role', 'button'\)/);
        assert.match(source, /header\.setAttribute\('tabindex', '0'\)/);
        assert.match(source, /e\.key === 'Enter' \|\| e\.key === ' '/);
    }
    assert.match(userscript, /\.prompt-button:focus-visible/);
    assert.match(userscript, /\.prompt-button-wrapper:focus-within/);
    assert.match(modularStyles, /\.prompt-button:focus-visible/);
});

test('group renaming does not fall back to native blocking prompts', async () => {
    assert.doesNotMatch(userscript, /\bprompt\s*\(/);
    assert.doesNotMatch(modularPrompts, /\bprompt\s*\(/);
    assert.match(userscript, /showTextInputDialog/);
    assert.match(modularPrompts, /showTextInputDialog/);
});
