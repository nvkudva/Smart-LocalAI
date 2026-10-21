# Privacy Policy — Smart LocalAI

**Last updated:** 21 October 2026
**Extension:** Smart LocalAI (Chrome Web Store)
**Source:** https://github.com/nvkudva/Smart-LocalAI

Smart LocalAI is a Chrome side panel that talks to an AI model **you choose**. It has no
servers of its own, no analytics, no ads, and no telemetry. This policy explains exactly
what leaves your machine and what does not.

## The short version

- With a **local model** (Chrome's built-in Gemini Nano, LM Studio, Ollama) — your pages
  and prompts never leave your computer.
- With a **cloud provider** (Anthropic, OpenAI, Gemini, DeepSeek, or any OpenAI-compatible
  endpoint) — the prompt and the page context you enabled are sent to that provider, using
  your own API key. That provider's own privacy policy applies to that request.
- Your API keys, settings and chat history live in `chrome.storage.local` in your browser
  profile. They are never sent anywhere except the endpoint you picked.

## What the extension reads

Only what the feature needs, and only on the page you are looking at:

| Data | When | Why |
|---|---|---|
| Page title and URL | Always, for the "Sharing …" bar | So you can see which page is in context |
| Visible page text (capped) | Only while **Page ✓** is on | To answer questions about the page |
| A DOM outline (headings, buttons, inputs) | Only while **Page ✓** is on | To find the right element for an edit |
| Your text selection | When you select text and use the right-click menu | To act on what you selected |
| Screenshots, PDFs, code files | Only files you attach | To let the model read them |

Turn **Page ✓** off in the panel and the page text and DOM outline are not sent at all.

## What the extension stores, and where

Everything is stored locally in `chrome.storage.local` — inside your browser profile, never
on a server:

- API keys, provider URL, selected model, per-provider model choices
- Settings: theme, safe mode, include-page, thinking level, auto-summary, custom system prompt
- Chat history and threads, saved prompts

A context-menu click parks one pending prompt in `chrome.storage.session`; it is read
immediately and deleted.

To erase everything: clear history in the extension's settings, or remove the extension —
that deletes its storage.

## What leaves your machine

Only requests to the endpoint you configured:

1. **Chrome built-in Gemini Nano** — runs on-device. No network request.
2. **LM Studio** (`http://localhost:1234/v1`) or **Ollama** (`http://localhost:11434`) —
   requests go to your own machine over localhost.
3. **A cloud provider** (Anthropic, OpenAI, Gemini, DeepSeek, custom) — the prompt, the
   enabled page context and any attachment are sent to that provider using the API key you
   entered. We do not proxy, log or copy these requests.

## Page edits

The extension can propose changes to the current page (CSS, text, hiding an element). Every
change is shown to you as a card with its exact payload, and is applied only when you
approve it. Every applied change can be undone from the panel. The extension never edits
a page on its own, and it never runs code that a model generated — only the fixed set of
actions listed in the panel.

## Permissions, and why each one is needed

| Permission | Why |
|---|---|
| `sidePanel` | The panel this extension lives in |
| `storage` | Keeping your keys, settings and history on your machine |
| `scripting` | Applying an edit you approved, and reading the page you asked about |
| `tabs` | Knowing which tab you are on, and refreshing context when you switch tabs |
| `contextMenus` | "Ask Smart LocalAI" on selected text, "Summarize this page" |
| Host access `<all_urls>` | Reaching a local model server on `localhost`/`127.0.0.1`, and applying approved edits on any page |

## What we do not do

No analytics, no crash reporting, no user tracking, no advertising, no selling or sharing
of data, no remote code, no background uploads of your browsing. We cannot read your data,
because we never receive it.

## Children

The extension is a general-purpose developer tool and is not directed at children.

## Changes to this policy

Any change will be published in this file in the repository, with the "Last updated" date
changed. Continuing to use the extension after a change means you accept it.

## Contact

Issues and privacy questions: https://github.com/nvkudva/Smart-LocalAI/issues

---

The use of information received from Google APIs will adhere to the Chrome Web Store User
Data Policy, including the Limited Use requirements.
