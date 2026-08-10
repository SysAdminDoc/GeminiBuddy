# ROADMAP

Actionable work only. Historical and completed roadmap material is archived in CHANGELOG.md; blocked work is kept in Roadmap_Blocked.md.

## Actionable Items

### Port to extension
- **Keyboard-shortcut command** registered with the browser (`chrome.commands`) to summon the
  panel.

- [ ] P0 - Repair MV3 options storage schema drift
  Why: The options page can read stale settings and reject or rewrite the grouped prompt library shape.
  Evidence: `chrome_extension/options.js:4-130`, `chrome_extension/src/config.js:4-5`, `chrome_extension/src/features/prompts.js:14-30`, RESEARCH.md
  Touches: `chrome_extension/options.js`, `chrome_extension/gm-shim.js`, `chrome_extension/src/config.js`, `tests/`
  Acceptance: Options loads grouped prompt objects from the same keys as the content script, saves settings that the panel immediately sees, preserves chunked storage, and has tests for grouped prompts plus settings migration.
  Complexity: M

- [ ] P0 - Minimize wildcard network permissions
  Why: The MV3 package and userscript request broad remote access for import/sync paths that can be constrained or made optional.
  Evidence: `chrome_extension/manifest.json:14-19`, `GeminiBuddy.user.js:16`, Chrome permission guidance, Tampermonkey connect docs
  Touches: `chrome_extension/manifest.json`, `GeminiBuddy.user.js`, `chrome_extension/gm-shim.js`, `chrome_extension/src/features/api.js`, `chrome_extension/src/ui/modals.js`
  Acceptance: No default `https://*/*` or `@connect *`; Gist/default/raw marketplace fetches still work; arbitrary import URLs require an explicit allowlist or optional permission grant; permission-regression test fails on wildcard reintroduction.
  Complexity: M

- [ ] P0 - Replace native confirm and alert flows
  Why: Blocking browser dialogs break the project's no-confirmation-dialog rule and bypass themed, recoverable UX.
  Evidence: `chrome_extension/src/features/api.js:64`, `chrome_extension/src/features/prompts.js:34`, `chrome_extension/src/features/prompts.js:289`, `chrome_extension/src/ui/modals.js:161`, `chrome_extension/src/ui/mainPanel.js:327`
  Touches: `chrome_extension/src/ui/modals.js`, `chrome_extension/src/features/prompts.js`, `chrome_extension/src/features/api.js`, `GeminiBuddy.user.js`
  Acceptance: Prompt delete, Gist replace, default-prompt import, version restore, and fatal-load handling use themed in-panel flows with toast/status feedback and undo or backup where destructive; `rg "confirm\\(|alert\\("` returns no runtime uses.
  Complexity: M

- [ ] P0 - Store API keys and Gist tokens outside synced general settings
  Why: Secrets are currently saved in the same settings object used by sync-backed storage and one API path puts the key in the request URL.
  Evidence: `GeminiBuddy.user.js:79`, `GeminiBuddy.user.js:1705-1727`, `chrome_extension/src/config.js:34`, `chrome_extension/src/features/api.js:91`, Google API key guidance
  Touches: `chrome_extension/src/config.js`, `chrome_extension/src/state.js`, `chrome_extension/src/features/api.js`, `chrome_extension/src/ui/settingsUI.js`, `GeminiBuddy.user.js`
  Acceptance: API keys and Gist tokens persist in local-only secret storage, never in exported prompt/settings JSON, can be cleared from UI, use a safer request header where supported, and migration removes old synced secret fields.
  Complexity: M

- [ ] P1 - Add verified prompt import/export with rollback
  Why: Competitor exporters emphasize fail-loud verification, while GeminiBuddy imports arbitrary JSON without schema versioning, checksum manifests, duplicate-ID handling, or pre-replace backup.
  Evidence: `chrome_extension/src/ui/modals.js:446-535`, Gemini Chat Exporter verifier patterns, Synapse import/merge positioning
  Touches: `chrome_extension/src/ui/modals.js`, `chrome_extension/src/features/prompts.js`, `chrome_extension/src/state.js`, `tests/`
  Acceptance: Import supports dry-run preview, validates grouped/array/marketplace shapes, normalizes IDs, reports rejected entries, writes an automatic rollback snapshot before destructive changes, and export includes schema version plus checksum manifest.
  Complexity: L

- [ ] P1 - Add storage migrations and version assertions
  Why: Current key drift shows the userscript, modular source, options page, README badge, manifest, and package versions can diverge without failing tests.
  Evidence: `GeminiBuddy.user.js:2-4`, `GeminiBuddy.user.js:61-62`, `chrome_extension/src/config.js:4-5`, `chrome_extension/options.js:4-5`, `chrome_extension/manifest.json:3`
  Touches: `GeminiBuddy.user.js`, `chrome_extension/src/config.js`, `chrome_extension/options.js`, `chrome_extension/manifest.json`, `chrome_extension/package.json`, `tests/`
  Acceptance: A migration table upgrades old settings/prompt keys, stale keys are read once then retired, and a local check fails when version strings or storage constants differ across source, package, manifest, and README.
  Complexity: M

- [ ] P1 - Add clean-profile MV3 smoke testing
  Why: The new MV3 ZIP builds, but there is no automated proof that it loads in a fresh profile, content scripts inject, options read storage, and permissions are acceptable.
  Evidence: `chrome_extension/build-extension.js`, `chrome_extension/manifest.json`, Chrome extension packaging docs, current single helper test
  Touches: `chrome_extension/build-extension.js`, `tests/`, `chrome_extension/package.json`
  Acceptance: A local smoke command builds the ZIP, loads the unpacked extension in a clean Chromium profile, opens a Gemini fixture or mocked host page, verifies panel/options initialization, and fails on console errors.
  Complexity: L

- [ ] P1 - Expand tests around sync, imports, and core DOM actions
  Why: `tests/chained-prompts.test.js` covers helper functions but not Gist sync, marketplace import, options storage, clipboard attachment fallback, modals, or prompt insertion.
  Evidence: `tests/chained-prompts.test.js`, `chrome_extension/src/features/api.js`, `chrome_extension/src/ui/modals.js`, `chrome_extension/src/ui/mainPanel.js`
  Touches: `tests/`, `chrome_extension/src/`, `GeminiBuddy.user.js`
  Acceptance: Tests cover Gist URL parsing/push failure, marketplace normalization, grouped prompt storage, option saves, import rejection, prompt insertion fallback, and clipboard unsupported paths.
  Complexity: M

- [ ] P1 - Make modals and prompt controls accessible
  Why: WAI dialog guidance requires modal focus management and semantics; current UI uses plain overlays and clickable div prompt controls.
  Evidence: `chrome_extension/src/ui/modals.js`, `chrome_extension/src/features/prompts.js:219-244`, WAI dialog pattern, WCAG focus appearance guidance
  Touches: `chrome_extension/src/ui/modals.js`, `chrome_extension/src/features/prompts.js`, `chrome_extension/src/styles.js`, `GeminiBuddy.user.js`
  Acceptance: Modals use `role="dialog"`/`aria-modal`, focus is trapped and restored, Escape closes non-destructive dialogs, prompt rows expose real button semantics, focus indicators meet contrast/size guidance, and keyboard-only tab traversal reaches all controls.
  Complexity: L

- [ ] P2 - Add account-scoped prompt profiles
  Why: Gemini Voyager's account isolation highlights a real multi-account problem; GeminiBuddy currently stores one global prompt library per browser profile.
  Evidence: Gemini Voyager account isolation, `chrome_extension/src/config.js:4-5`, `chrome_extension/src/state.js`
  Touches: `chrome_extension/src/state.js`, `chrome_extension/src/features/prompts.js`, `chrome_extension/src/ui/settingsUI.js`, `GeminiBuddy.user.js`
  Acceptance: Users can keep separate prompt/settings profiles per detected Gemini account or manual profile name, switch profiles without data loss, and export/import a single profile or all profiles.
  Complexity: L

- [ ] P2 - Add diagnostics and safe support export
  Why: Current fatal and storage failures go to console/toast only, making DOM breakage, quota errors, and sync failures hard to report.
  Evidence: `chrome_extension/gm-shim.js:93-100`, `chrome_extension/src/ui/mainPanel.js:327`, Chrome storage quota docs
  Touches: `chrome_extension/gm-shim.js`, `chrome_extension/src/utils.js`, `chrome_extension/src/ui/settingsUI.js`, `GeminiBuddy.user.js`
  Acceptance: A diagnostics panel shows extension/userscript version, browser, storage backend, quota/chunk stats, last sync/import errors, selector health, and exports a redacted JSON report with secrets removed.
  Complexity: M

- [ ] P2 - Add marketplace catalog trust metadata
  Why: Remote prompt marketplace import is useful, but trusted catalogs need source identity, schema version, update timestamps, and preview before merge.
  Evidence: `GeminiBuddy.user.js:3525-3549`, `chrome_extension/src/ui/settingsUI.js:314`, prompts.chat catalog patterns
  Touches: `chrome_extension/src/features/api.js`, `chrome_extension/src/ui/modals.js`, `chrome_extension/src/ui/settingsUI.js`, `Prompts/defaultpromptlist.json`
  Acceptance: Marketplace imports display source URL, schema version, item count, duplicate count, and changed prompts before save; approved catalogs can be pinned, removed, refreshed, and exported with provenance.
  Complexity: M

- [ ] P2 - Offer Chrome side panel mode for the MV3 build
  Why: Prompt competitors use browser side panels to keep libraries visible without injecting all management UI into the target page.
  Evidence: prompts.chat Extension side-panel mode, Chrome sidePanel API docs, `chrome_extension/options.html`
  Touches: `chrome_extension/manifest.json`, `chrome_extension/options.html`, `chrome_extension/options.js`, `chrome_extension/src/ui/mainPanel.js`
  Acceptance: MV3 users can open a side panel prompt browser/editor that uses the same storage and insertion bridge as the in-page panel; userscript behavior remains unchanged.
  Complexity: L

- [ ] P2 - Add i18n resource structure for extension UI
  Why: Gemini competitors ship localized UI, while GeminiBuddy hardcodes all UI strings in source.
  Evidence: Synapse locale list, Chrome i18n API docs, `chrome_extension/options.html`, `chrome_extension/src/ui/`
  Touches: `chrome_extension/_locales/`, `chrome_extension/manifest.json`, `chrome_extension/options.html`, `chrome_extension/options.js`, `chrome_extension/src/ui/`
  Acceptance: Manifest/options/core panel strings load from locale resources with English default, missing keys fail a local check, and adding a new locale does not require source edits outside locale files.
  Complexity: L
