# Smart LocalAI — Plan

## Goal
Chrome MV3 side-panel extension like Claude for Chrome / Google Ask Gemini.
Chat in sidebar + agent controls live page (style, content, script) via any LLM.

## Architecture
- `manifest.json` — MV3, sidePanel, scripting, storage, tabs, `<all_urls>` host access (needed for localhost LLM + page injection).
- `background.js` — service worker. Opens panel on toolbar click, relays tab updates.
- `src/` — React + Vite sidebar UI (load unpacked from `dist/`) (see ARCHITECTURE.md for the feature-folder layout).
- `src/models/providers.js` — provider registry, detection, model scoring, streaming chat.
- `src/page/` — page snapshot, element picker, action executor, undo stack (injected via `chrome.scripting`).

## Provider strategy
- Auto-detect on open + on demand, 1.2s timeout per probe:
  - LM Studio `http://localhost:1234/v1/models` (OpenAI-compatible)
  - Ollama `http://localhost:11434/api/tags` + `/v1/models`
- Auto mode picks healthy provider with best model; lowest latency wins ties.
- Custom endpoints: name, base URL, API key, auth style (Bearer / x-api-key / none / custom header), protocol (OpenAI-compatible / Anthropic / Gemini / Ollama native).
- Built-in presets (key only): OpenAI, Anthropic, Gemini, OpenRouter, Groq.
- Smart model pick: exclude embedding/rerank/whisper/moderation, bonus for chat/instruct + known families + parameter size, latency tiebreak. User can override per provider.
- Keys in `chrome.storage.local` only. Never sent except to chosen endpoint.

## Page agent protocol
- LLM never gets raw eval access silently. It emits fenced `agent` JSON blocks:
  `{"action":"apply_css|apply_js|edit_text|set_html|click|fill|scroll|highlight|remove|get_snapshot","selector":"...","value":"...","css":"...","js":"..."}`
- Panel parses blocks, shows action card (what + target + payload).
- Safe mode (default): user approves each mutating action. Auto-apply toggle for power users. Read-only actions run free.
- Executor runs in page via `chrome.scripting.executeScript`. Every mutation pushes inverse onto `window.__freeAiUndo` + panel undo stack. Undo button restores.
- Context sent to model: title, URL, selection, visible text (8k cap), DOM outline (headings/buttons/inputs, 120 nodes cap). Refresh per turn + on tab change.
- Element picker: inject hover overlay, click returns best selector (id > data-testid > unique class path > nth-of-type path).

## UX (Ask Gemini match)
- Light surface, pill composer, sparkle mark, model pill top-left, suggestion chips, rounded-28 chat bubbles absent for AI (Gemini uses plain text), user bubble light blue.
- Top bar: model selector, page-context chip (live tab title), picker, undo, history, settings, theme.
- Empty state greeting + 4 page-aware chips (Summarize, Dark mode, Extract data, Restyle).
- Settings drawer: providers, detection status dots, add-endpoint form, agent toggles.

## Safety / limits
- Blocked on `chrome://`, Web Store, extension pages (no scripting) — panel says so, chat still works.
- `apply_js` gated behind approval always in Safe mode; payload shown verbatim.
- Max 5 agent loop iterations per turn. Actions truncated in card, full in title attr.

## Rejected alternatives
- Content-script always-on: rejected, injection on demand is lighter + fewer permissions prompts.
- OpenAI function-calling only: rejected, local models vary; fenced JSON works on every endpoint. Native tools can layer later.

## Revisions

- Superseded: the sidebar is a React + Vite build, not zero-build. Context-menu prompts travel via `chrome.storage.session` (`pendingPrompt`); a panel that is already open listens to `storage.onChanged`.
