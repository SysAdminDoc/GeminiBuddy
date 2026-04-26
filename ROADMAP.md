# ROADMAP

Backlog for Gemini Prompt Panel userscript. Extends the slide-out panel with richer prompt
management, templating, and model-aware features.

## Planned Features

### Prompt system
- **Prompt folders / categories** — group prompts, collapse/expand, drag between groups.
- **Variable substitution** — `{clipboard}`, `{selection}`, `{date}`, `{title}`, user-defined
  `{{var}}` placeholders with a prompt-before-send dialog.
- **Chained prompts** — define a sequence where each step's response feeds the next (runs via
  Gemini's own input; detect response completion via DOM mutation on the response container).
- **Conditional auto-send** per-variable (only auto-send if no `{{vars}}` remain).
- **Prompt version history** — per-prompt edit history with diff and rollback.
- **Usage stats** — last-used timestamp, count, sortable.

### Model / Gemini-specific
- **Model picker shortcut** — quick-switch between 1.5 Flash / 2.0 Pro / 2.5 Pro from the panel.
- **Canvas insert shortcut** — button to push the current prompt into Canvas mode.
- **Gem trigger** — allow prompts to auto-open a specific Gem URL.
- **Deep Research launcher** — one-click Deep Research with a prompt.
- **Attachment paste** — programmatic drop of image/file from clipboard into Gemini's upload zone.

### UX
- **Resizable panel** with drag-edge handle, remembered width.
- **Quick-search prompts** (`Ctrl+P` inside panel) with fuzzy matching.
- **Favorites row** pinned at the top of the panel.
- **Prompt preview on hover** without clicking.
- **Toast feedback** on insert / auto-send; currently silent.

### Sharing / import
- **GitHub Gist sync** — bidirectional sync of prompt library via user-supplied gist ID and PAT.
- **Prompt marketplace JSON** — import from a remote curated list (PromptCompanion format).
- **Share-link generator** — produce a URL that, when visited, imports a specific prompt into
  the panel (for team sharing).

### Reliability
- **Trusted Types policy** for all DOM injection so the script survives Gemini CSP changes.
- **MutationObserver scoping** — observe only the input container, not document, to reduce
  overhead on long sessions.
- **Debounced save** of position/theme state.

### Port to extension
- **Chrome / Firefox MV3 extension build** mirroring the userscript, with an options page and
  `chrome.storage.sync` for cross-device prompts.
- **Keyboard-shortcut command** registered with the browser (`chrome.commands`) to summon the
  panel.

## Competitive Research

- **AIPRM / PromptPerfect / FlowGPT browser extensions** — show prompt libraries work at scale;
  borrow categorization + variable systems. Don't replicate their paywall model.
- **ChatGPT Prompt Genius / Superpower ChatGPT** — rich UX for OpenAI-side prompt mgmt; cue for
  history, folders, import/export.
- **PromptCompanion (sibling project)** — reuse its JSONL prompt format so users can shuttle
  prompts between desktop library and browser.
- **Gemini's native "Saved info" and Gems** — official but limited; the panel's value is the
  workflow speed, not storage.

## Nice-to-Haves

- **Inline "explain this cell"** button on code blocks in Gemini responses that sends a canned
  follow-up.
- **Clipboard history** fed as `{clipboard_prev_N}` variables.
- **Screenshot-and-send** — capture region of the current page with html2canvas, attach to the
  next Gemini message.
- **Voice input** via Web Speech API targeting the Gemini composer.
- **Response export** buttons per Gemini message (copy as markdown, as plain text, as HTML).
- **Dark-mode toggle sync** with system `prefers-color-scheme`.

## Open-Source Research (Round 2)

### Related OSS Projects
- **AI-UX-Customizer** — https://github.com/p65536/AI-UX-Customizer — Userscripts for ChatGPT + Gemini; per-chat speaker names, icons, bubble styles, backgrounds.
- **Gemini-Better-UI** — https://github.com/Jonathan881005/Gemini-Better-UI — Dynamic tab title, adjustable chat width, 5-state canvas layout toggle.
- **Gemini-Enter-for-Newline** — https://github.com/hayaokuri/Gemini-Enter-for-Newline — Rebinds Enter → newline, Shift+Enter → send.
- **gemini-voyager** — https://github.com/Nagi-ovo/gemini-voyager — Full browser extension: timeline navigation, folder hierarchy, prompt vault, cloud-sync, mermaid render, export JSON/MD/PDF.
- **geminui** — https://github.com/lemonberrylabs/geminui — Chrome extension that captures chat titles/URLs for local search of past chats.
- **ai-chat-exporter** — https://github.com/revivalstack/ai-chat-exporter — Tampermonkey export for ChatGPT/Claude/Copilot/Gemini/Grok; TOC + YAML metadata.
- **ChatGPT-History-Search / Prompt-Library userscripts** — https://github.com/topics/chatgpt-userscript — Patterns translate directly to Gemini.

### Features to Borrow
- Prompt Vault with cloud-sync (`gemini-voyager`) — Google Drive sync of saved prompts + variables; cross-device.
- Timeline-node navigator (`gemini-voyager`) — a minimap of messages with "star" / "branch" markers; massive UX win on long chats.
- Two-level folder organization of chats (`gemini-voyager`, `geminui`) — Gemini natively has none; observer-driven title capture + local index.
- Per-chat persona styling (`AI-UX-Customizer`) — custom speaker names/icons/bubble colors per conversation; useful for multi-role prompts.
- Markdown/PDF/JSON export with mermaid render (`gemini-voyager`, `ai-chat-exporter`) — TOC, YAML front matter, images inlined.
- Canvas 5-state layout toggle (`Gemini-Better-UI`) — cycle code/canvas split sizes with a hotkey.
- Dynamic browser tab title = conversation name (`Gemini-Better-UI`) — restores browser-tab triage.

### Patterns & Architectures Worth Studying
- **Sidebar MutationObserver for chat metadata capture** (`geminui`): watch the conversation list DOM, upsert title + URL + timestamp into `chrome.storage.local` keyed by chat id. Single source of truth for folder/search features.
- **Slot-aware CSS variable theme** (`AI-UX-Customizer`): define colors/spacing as `--gbp-*` vars on `:root`, let themes override. Themes become 20-line diffs instead of 500-line stylesheets.
- **Userscript → MV3 extension dual-build**: same core logic with a thin shim for `GM_*` vs `chrome.storage.*`. `ai-chat-exporter` and `gemini-voyager` both structure this way.
- **Trusted Types policy** on `innerHTML` writes — Gemini runs under a TT CSP; required pattern is `trustedTypes.createPolicy('gbp', {createHTML: s => s})`. Mandatory or panels silently fail.
