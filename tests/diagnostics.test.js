import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const userscript = await readFile(new URL('../GeminiBuddy.user.js', import.meta.url), 'utf8');
const state = await readFile(new URL('../chrome_extension/src/state.js', import.meta.url), 'utf8');
const api = await readFile(new URL('../chrome_extension/src/features/api.js', import.meta.url), 'utf8');
const options = await readFile(new URL('../chrome_extension/options.js', import.meta.url), 'utf8');
const shim = await readFile(new URL('../chrome_extension/gm-shim.js', import.meta.url), 'utf8');

test('diagnostic reports contain operational metadata but exclude secrets and prompt payloads', () => {
    for (const source of [userscript, state, options]) {
        assert.match(source, /schemaVersion: 1/);
        assert.match(source, /userAgent/);
        assert.match(source, /storage/);
        assert.match(source, /selectors/);
        assert.match(source, /events/);
    }
    assert.match(state, /delete safeSettings\.geminiAPIKey/);
    assert.match(state, /delete safeSettings\.gistToken/);
    assert.match(options, /redacted/i);
    const reportSource = options.slice(options.indexOf('async function getDiagnosticsReport'), options.indexOf('async function downloadDiagnostics'));
    assert.doesNotMatch(reportSource, /geminiAPIKey|gistToken/);
});

test('storage telemetry and failure events are wired into the support report', () => {
    assert.match(shim, /chunkedReads/);
    assert.match(shim, /chunkedWrites/);
    assert.match(shim, /lastError/);
    assert.match(api, /recordDiagnosticEvent\('sync'/);
    assert.match(api, /recordDiagnosticEvent\('api'/);
    assert.match(userscript, /recordDiagnosticEvent\('import'/);
    assert.match(userscript, /recordDiagnosticEvent\('marketplace'/);
});
