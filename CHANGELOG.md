# Changelog

All notable changes to GeminiBuddy will be documented in this file.

## [v54.0.1] (2026-09-13)

- Reworked the injected panel, side panel, and options page around a calmer navy and cyan visual system with clearer hierarchy and focus states.
- Moved the saved prompt list ahead of the side-panel editor so opening the panel starts with the user's library.
- Added a transparent GeminiBuddy monogram, complete browser icon sizes, a version-free README hero, and verified product screenshots.
- Replaced the placeholder-heavy README with direct install paths, permission notes, workflow examples, and release links.
- Added marketing asset checks and a dated concept archive with starting material, rejected directions, editable capture source, and review notes.
- Added local ZIP and CRX3 release packaging with stable signing and a SHA-256 manifest.

## [v54.0.0] (2026-08-12)

- Repaired MV3 options storage schema drift with grouped prompt handling, chunk-safe settings migration, and shared storage keys.
- Limited remote access to built-in GitHub/Google origins, with explicit HTTPS origin allowlists and optional MV3 host permissions for custom imports.
- Replaced native confirmation and alert dialogs with themed, keyboard-dismissible flows and automatic rollback snapshots for destructive prompt changes.
- Moved Google AI and GitHub Gist credentials to local-only secret storage, added clear controls, and removed API keys from request URLs.
- Added verified prompt backups with schema versions, SHA-256 manifests, dry-run import previews, rejected-entry reports, duplicate-ID repair, and rollback snapshots.
- Added shared storage migration tables for legacy prompt/settings keys and a build/test guard for version and storage-key drift.
- Added a dependency-free MV3 clean-profile smoke command that exercises a mocked Gemini host, panel injection, options initialization, and browser console error handling.
- Expanded deterministic coverage for Gist transport failures, marketplace/import normalization, options saves, prompt insertion fallbacks, and unsupported clipboard paths.
- Added accessible modal focus management, keyboard-operable prompt/category controls, visible focus indicators, and an accessible group-rename dialog across both runtime surfaces.
- Added account-aware and manual prompt profiles with isolated settings/history, lossless switching, and single/all profile backup and restore.
- Added redacted diagnostics views and JSON exports with runtime metadata, selector health, storage telemetry, profile/data counts, and recent sync/import/API failures.
- Added marketplace catalog provenance and approval previews with schema/timestamp/count metadata, duplicate/change detection, rollback-protected merges, and catalog pin/refresh/remove/export controls.
- Added an English-default MV3 i18n resource structure for the manifest, options page, side panel, and core panel, with a missing-key consistency check for future locale additions.
- Added a Chrome MV3 side panel prompt browser/editor with shared profiles and storage, prompt insertion messaging, and clean-profile smoke coverage.

## [v53.0.0] (2026-06-27)

- Added a Chrome/Firefox MV3 extension build with GM compatibility shims, sync-backed storage, an options page, and ZIP packaging.

## [v52.0.0] (2026-06-27)

- Added per-prompt share links that import shared prompts from URL hashes.

## [v51.0.0] (2026-06-27)

- Added remote prompt marketplace JSON import with flexible PromptCompanion-style field mapping.

## [v50.0.0] (2026-06-27)

- Added token-backed push support for bidirectional GitHub Gist prompt sync.

## [v49.0.0] (2026-06-27)

- Added clipboard attachment paste for image/file clipboard items.

## [v48.0.0] (2026-06-27)

- Added a Deep Research launcher that selects Gemini Deep Research and sends the current prompt when ready.

## [v47.0.0] (2026-06-27)

- Added per-prompt Gem URLs that navigate to the target Gem and replay the prompt after Gemini initializes.

## [v46.0.0] (2026-06-27)

- Added a Canvas shortcut button that activates Gemini Canvas mode for the current prompt.

## [v45.0.0] (2026-06-27)

- Added quick model-switch buttons for Gemini 1.5 Flash, 2.0 Pro, and 2.5 Pro.

## [v44.0.0] (2026-06-27)

- Added chained prompt workflows with follow-up steps and previous-response handoff.
- Fixed clipboard access by separating the post navigator state from `window.navigator`.
