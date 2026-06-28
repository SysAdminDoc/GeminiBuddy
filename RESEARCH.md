# Research - GeminiBuddy

## Executive Summary
GeminiBuddy is a local-first Gemini productivity enhancer that currently ships as a Tampermonkey/Violentmonkey userscript and a new Chrome/Firefox MV3 package. Its strongest shape is fast prompt insertion, prompt grouping, sharing, Gist sync, Gemini-mode shortcuts, clipboard attachment paste, and a low-friction in-page panel. Highest-value direction: harden trust and portability before adding more surface area. Top opportunities, in order: repair MV3 options storage drift, minimize wildcard network permissions, remove native browser confirmations/alerts, protect API/Gist secrets, add validated import/export with recovery, add clean-profile extension smoke tests, add modal/focus accessibility, formalize storage migrations, add diagnostics export, and add account-scoped prompt profiles.

## Product Map
- Core workflows: manage grouped/tagged prompts; insert or auto-send prompts into Gemini; run chained follow-ups; launch Gemini model/Canvas/Deep Research/Gem flows; import/export/share/sync prompt libraries.
- User personas: heavy Gemini web users; prompt-library maintainers; operators moving prompt sets between browsers; users who need local prompt backup without a hosted service.
- Platforms and distribution: direct userscript at `GeminiBuddy.user.js`; MV3 package under `chrome_extension/`; ZIP built by `chrome_extension/build-extension.js`; README positions Tampermonkey plus unpacked extension install.
- Key integrations and data flows: Gemini DOM injection; `GM_*` storage and `chrome.storage.sync` shim; GitHub Gist pull/push; remote marketplace JSON import; Google Generative Language API call for prompt enhancement; clipboard file/text read/write.

## Competitive Landscape
- Gemini Voyager: strong foldering, prompt vault, cloud sync, timeline navigation, export, Mermaid rendering, default model control, cross-browser packaging, and localization. Learn from its account isolation, store-ready packaging, and feature segmentation; avoid decorative effects and broad suite sprawl already covered by prior roadmap items.
- Synapse: combines prompt management, version history, full-text search, chat collection, snippets, multi-format export, Google Drive sync, and many UI languages. Learn from version restore, i18n, and dashboard organization; avoid multi-platform expansion that would dilute GeminiBuddy's Gemini-specific speed.
- prompts.chat Extension: excels at side-panel prompt browsing, variables, category/tag filtering, live preview, copy/run actions, and store distribution. Learn from variable preview and side-panel mode; avoid analytics defaults because GeminiBuddy's trust position is local-first.
- Gemini Chat Exporter projects: focus on Markdown/JSON export fidelity, long-history loading, verifier checks, duplicate-body detection, and Takeout reconciliation. Learn from fail-loud verification and corruption detection; avoid turning GeminiBuddy into a full archival toolkit when a prompt-manager backup verifier is enough.
- AI-UX-Customizer and Gemini-Better-UI: small userscripts prove narrow UI fixes can be popular when they survive Gemini DOM churn. Learn from scoped CSS variables and single-purpose toggles; avoid fragile class-name targeting where structural selectors can work.
- AIPRM, PromptFolder, and similar commercial prompt managers: private/team prompt libraries, sharing, variables, history, and analytics are monetized features. Learn that trust, backup, import/export, and library governance are product differentiators; avoid hosted account requirements.

## Security, Privacy, and Reliability
- Verified: `chrome_extension/manifest.json:14-19` grants `https://*/*`; `GeminiBuddy.user.js:16` grants `@connect *`; import and sync code can fetch arbitrary user-entered marketplace/import URLs via `GeminiBuddy.user.js:2089`, `GeminiBuddy.user.js:3525`, and `chrome_extension/gm-shim.js:104`.
- Verified: `chrome_extension/options.js:5` uses `gemini_panel_settings_v24` while `chrome_extension/src/config.js:5` uses `gemini_panel_settings_v25`; the MV3 options page can edit stale settings.
- Verified: `chrome_extension/options.js:100-130` assumes prompts are a JSON array, but `chrome_extension/src/features/prompts.js:14-30` stores grouped prompt objects serialized as JSON strings. The options page can fail or rewrite storage in an incompatible shape.
- Verified: `GeminiBuddy.user.js:79`, `GeminiBuddy.user.js:1705-1727`, `chrome_extension/src/config.js:34`, and `chrome_extension/src/ui/settingsUI.js:302-305` store API keys and Gist tokens inside the general settings object, which the MV3 shim backs with `chrome.storage.sync || chrome.storage.local`.
- Verified: `chrome_extension/src/features/api.js:91` sends the Gemini API key in the request URL; Google documents API-key restriction practices, so this should move to a safer request pattern and local-only secret storage.
- Verified: native blocking dialogs remain in `chrome_extension/src/features/api.js:64`, `chrome_extension/src/features/prompts.js:34`, `chrome_extension/src/features/prompts.js:289`, `chrome_extension/src/ui/modals.js:161`, and `chrome_extension/src/ui/mainPanel.js:327`. They conflict with the repo's no-confirmation-dialog UX rule and are not themeable or accessible.
- Missing guardrails: no import schema migration layer, no checksum/export manifest, no duplicate ID handling, no dry-run import preview, no rollback file before destructive prompt replacement, no clean-profile extension smoke test, and no permission-regression check.
- Recovery needs: one-click export before Gist replace/import, undo for prompt delete/restore, token/key removal path, storage migration logs, and a diagnostics bundle that excludes secrets.

## Architecture Assessment
- The root userscript and the modular extension source drift: `GeminiBuddy.user.js` still uses settings key v24, while `chrome_extension/src/config.js` uses v25. Choose one source of truth and add a build/assertion that fails on version/key drift.
- The MV3 options page duplicates storage chunking logic from `chrome_extension/gm-shim.js`. Extract shared storage helpers or generate options from the same storage module to avoid key/schema drift.
- The test suite is narrow: `tests/chained-prompts.test.js` exercises helper functions but not MV3 options, Gist sync, marketplace import, permissions, modals, storage chunk roundtrip, or DOM injection survival.
- The extension package has no lockfile, and `npm audit --json` currently fails with `ENOLOCK`; `chrome_extension/package.js` pins older Babel/Webpack dependencies while npm reports newer releases. Add a lockfile and dependency review cadence before broadening the build.
- Modal/UI accessibility is incomplete by inspection: custom modals are plain `div` overlays without `role="dialog"`, `aria-modal`, focus trapping, Escape close behavior, or guaranteed focus return; prompt buttons are clickable `div` controls in `chrome_extension/src/features/prompts.js`.
- Existing roadmap already covers prompt vault, timeline navigation, folder organization, export, Canvas layout, and tab-title ideas; new work should prioritize trust, schema, packaging, accessibility, and diagnostics.

## Rejected Ideas
- Keyboard-shortcut panel summon: rejected because `Roadmap_Blocked.md` already blocks this under the global no-keyboard-shortcuts rule.
- Full multi-platform chat archive suite: rejected because Synapse and dedicated exporter tools already cover broad collection/export, while GeminiBuddy's fit is prompt operation inside Gemini.
- Hosted team accounts and telemetry: rejected because commercial prompt managers use that path, but GeminiBuddy's current value is local-first and no-account.
- Decorative seasonal effects: rejected because Gemini Voyager already offers this and it does not improve prompt safety, portability, or reliability.
- CRX-first self-distribution: rejected because current Chromium self-host behavior favors ZIP plus Load Unpacked unless using store or enterprise flows.

## Sources
OSS competitors:
- https://github.com/Nagi-ovo/gemini-voyager
- https://github.com/yviscool/Synapse
- https://github.com/fatihsolhan/prompts-chat-extension
- https://github.com/AstridStark25963/gemini-chat-exporter
- https://github.com/davidmalko87/gemini-chat-exporter
- https://github.com/p65536/AI-UX-Customizer
- https://github.com/Jonathan881005/Gemini-Better-UI
- https://github.com/jinfan-luo/Gemini-Navigation
- https://github.com/flesler/ai-prompts

Commercial and prompt libraries:
- https://www.aiprm.com/
- https://www.promptfolder.com/
- https://prompts.chat/

Platform, standards, and security:
- https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
- https://developer.chrome.com/docs/extensions/reference/api/storage
- https://developer.chrome.com/docs/extensions/reference/api/sidePanel
- https://developer.chrome.com/docs/extensions/reference/api/i18n
- https://www.tampermonkey.net/documentation.php
- https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API
- https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- https://ai.google.dev/gemini-api/docs/api-key

Dependencies:
- https://github.com/webpack/webpack/releases
- https://www.npmjs.com/package/webpack-userscript
- https://www.npmjs.com/package/@babel/core
- https://www.npmjs.com/package/babel-loader

## Open Questions
- Needs live validation: which Gemini DOM selectors currently fail in a clean Chrome and Firefox profile after installing the MV3 ZIP?
- Needs live validation: should the MV3 build target Chrome Web Store/Firefox Add-ons review, or remain ZIP/unpacked-only for this repo?
