# Architecture

Feature folders, max three levels: `app/` composes the sidebar; `chat/` renders
messages and owns attachments; `models/` owns providers and streaming; `page/`
owns page context and injected actions; `settings/` owns configuration UI;
`threads/` owns history; `shared/` owns cross-feature utilities.

`App.jsx` renders `Header`, `MessageList`, `Composer`, and `SettingsDrawer`.
`useChatLoop.js` owns send, streaming, citations, and page-action iterations.
`providers.js` owns registry, scoring, capabilities, and model listing;
`streamTransports.js` owns protocol-specific streaming. `pageAgent.js` owns
sidebar-side wrappers; `injectedPage.js` owns serializable page functions.

Decisions: behavior-preserving refactor only; `git mv` preserves history; Biome
remains the formatter/linter; no test harness exists, so `bun run build` and
`bun run lint` verify each commit.
