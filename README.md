<img src="assets/icon128.png" width="64" height="64" alt="">

# Free AI Sidebar — Chat & Page Agent

Chrome side-panel extension like Claude for Chrome / Google Ask Gemini. Chat in the sidebar, and let the model edit the current page (style, content, scripts) with LM Studio, Ollama, or any LLM endpoint. No build step.

## Load unpacked

1. Open `chrome://extensions`, enable **Developer mode**.
2. Click **Load unpacked**, select this folder.
3. Click the toolbar icon (or `Ctrl/Cmd+Shift+Y`) on any page.

## Models

- **Auto (default):** probes LM Studio `http://localhost:1234/v1` and Ollama `http://localhost:11434` on open, picks the healthy one with the smartest chat model (embeddings/whisper excluded, instruct/chat + size scored), lowest latency wins ties.
- **Any endpoint:** Settings → Add endpoint — name, base URL, protocol (OpenAI-compatible / Ollama / Anthropic / Gemini), auth (Bearer / x-api-key / custom header / query / none), API key. **Test & list models** before adding.
- **Presets:** OpenAI, Anthropic, Gemini, OpenRouter, Groq — paste a key in Settings, pick a model or leave Smart pick.
- Model pill (top-left) switches provider/model any time. Keys live only in `chrome.storage.local`.

## Page agent

- Mode **Agent** (default): say `make headings blue`, `hide the cookie banner`, `change the CTA text to Buy now`. The model emits action blocks; each shows as a card with payload.
- **Safe mode** (default on): mutating actions need **Apply**. Turn off in Settings for auto-apply. Read-only actions run free.
- Actions: `apply_css`, `apply_js`, `edit_text`, `set_html`, `click`, `fill`, `remove`, `highlight`, `scroll`.
- **◎ Pick** — click any element on the page to target it. **↩ Undo** rolls back edits (stack kept in page). **Page ✓** toggles whether page text/DOM outline is sent as context.
- Suggestion chips: Summarize, Dark mode, Readability, Extract data, Remove distractions.
- Right-click: *Ask Free AI* on selected text, *Summarize this page* on any page.
- Blocked on `chrome://` and Web Store pages (Chrome forbids scripting there); chat still works.

## Files

| File | Job |
|---|---|
| [manifest.json](manifest.json) | MV3 manifest, side panel, permissions |
| [background.js](background.js) | Opens panel, context menus, pending prompts |
| [sidepanel.html](sidepanel.html) / [sidepanel.css](sidepanel.css) / [sidepanel.js](sidepanel.js) | Gemini-style UI, chat, agent loop, settings |
| [lib/providers.js](lib/providers.js) | Detection, smart model scoring, streaming (OpenAI/Ollama/Anthropic/Gemini) |
| [lib/page-agent.js](lib/page-agent.js) | Page snapshot, element picker, action executor, undo |

See [PLAN.md](PLAN.md) for architecture and rejected alternatives.
