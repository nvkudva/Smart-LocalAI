<img src="public/assets/icon128.png" width="64" height="64" alt="">

# Smart LocalAI

Chrome Sidebar extension — chat & page agent like Claude for Chrome / Google Ask Gemini. Chat in the sidebar, and let the model edit the current page (style, content, scripts) with LM Studio, Ollama, or any LLM endpoint. The sidebar UI is built with React and Vite.

## Build and load unpacked

1. Run `bun install` and `bun run build`.
2. Open `chrome://extensions`, enable **Developer mode**.
3. Click **Load unpacked**, select the generated `dist` folder.
4. Click the toolbar icon (or `Ctrl/Cmd+Shift+Y`) on any page.

For development, run `bun run dev`, then rebuild before reloading the unpacked extension.

## Models

- **Built-in (if available):** Settings → Built-in model uses Chrome's on-device Gemini Nano. Free, no key. Enabling it disables the endpoint card.
- **Endpoint card:** pick a provider (LM Studio, Ollama, Anthropic, OpenAI, DeepSeek, Custom). URL prefills and stays editable. Enter the API key, press **Refresh models**, pick a model or leave Smart pick. Your model choice is remembered per provider.
- Model pill (top-left) switches model any time. Keys live only in `chrome.storage.local`.

## Page agent

- Mode **Agent** (default): say `make headings blue`, `hide the cookie banner`, `change the CTA text to Buy now`. The model emits action blocks; each shows as a card with payload.
- **Safe mode** (default on): mutating actions need **Apply**. Turn off in Settings for auto-apply. Read-only actions run free.
- Actions: `apply_css`, `apply_js`, `edit_text`, `set_html`, `click`, `fill`, `remove`, `highlight`, `scroll`.
- **◎ Pick** — click any element on the page to target it. **↩ Undo** rolls back edits (stack kept in page). **Page ✓** toggles whether page text/DOM outline is sent as context.
- Suggestion chips: Summarize, Dark mode, Readability, Extract data, Remove distractions.
- Right-click: *Ask Smart LocalAI* on selected text, *Summarize this page* on any page.
- Blocked on `chrome://` and Web Store pages (Chrome forbids scripting there); chat still works.

## Project layout

| Path | Job |
|---|---|
| [src/App.jsx](src/App.jsx) | App state, chat loop, endpoint and thread actions |
| [src/components](src/components) | Header, menus, messages, composer, settings and action cards |
| [src/hooks/usePageContext.js](src/hooks/usePageContext.js) | Active tab, page snapshot, picker and undo state |
| [src/services/providers.js](src/services/providers.js) | Provider registry, Nano, detection, smart model scoring and streaming |
| [src/services/pageAgent.js](src/services/pageAgent.js) | Page snapshot, element picker, action executor and undo |
| [src/lib](src/lib) | Storage, endpoint state, page context and shared constants |
| [public/manifest.json](public/manifest.json) | MV3 manifest copied into `dist` |
| [public/background.js](public/background.js) | Opens panel, context menus and pending prompts |

See [PLAN.md](PLAN.md) for architecture and rejected alternatives.
