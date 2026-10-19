export const DEFAULT_SETTINGS = {
  safeMode: true,
  includePage: true,
  smartModel: true,
  autoTldr: false,
  theme: "light",
  systemPrompt: "",
  thinkingLevel: "medium",
};

export const THINKING_LEVELS = [
  { id: "off", label: "Off" },
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

export const THINKING_HINTS = {
  off: "Answer directly, with no extended reasoning.",
  low: "Think briefly before answering.",
  medium: "Think step by step before answering.",
  high: "Think deeply and check edge cases before answering.",
};

export const THINKING_EFFORT = { off: "", low: "low", medium: "medium", high: "high" };

export const BUILTIN_PROMPTS = [
  { name: "Summarize page", text: "Summarize this page: key points, then a one-line TL;DR." },
  { name: "Explain simply", text: "Explain this in simple terms:\n\n{selection}" },
  { name: "Key points", text: "Extract the key points from this page as a short bulleted list." },
  { name: "Pros and cons", text: "List the pros and cons of what this page describes." },
  { name: "Draft email reply", text: "Draft a short professional email reply based on this:\n\n{selection}" },
  { name: "Translate to English", text: "Translate this to English:\n\n{selection}" },
  { name: "Fix grammar", text: "Fix the grammar and improve clarity, keep the meaning:\n\n{selection}" },
];

export const SUGGESTIONS = [
  { icon: "notes", label: "Summarize this page", prompt: "Summarize this page: key points, then a one-line TL;DR." },
  {
    icon: "moon",
    label: "Dark mode this page",
    mode: "agent",
    prompt: "Make this page easier to read: apply a clean dark mode with CSS. Keep layout intact.",
  },
  {
    icon: "type",
    label: "Improve readability",
    mode: "agent",
    prompt: "Improve readability of this page: larger comfortable font, wider line height, max-width on main text. Apply with CSS.",
  },
  { icon: "table", label: "Extract data as table", prompt: "Extract the main data from this page as a clean markdown table." },
  {
    icon: "hide",
    label: "Remove distractions",
    mode: "agent",
    prompt: "Remove distractions on this page: hide popups, sticky banners, and sidebars not needed for reading.",
  },
  { icon: "search", label: "What's on this page?", prompt: "What can I do on this page? List the main actions and content briefly." },
];

export const RESPONSE_FORMAT =
  "Format every answer with rich Markdown: short section headings, bullets for lists, **bold** for key terms, fenced code blocks with a language tag, tables for comparisons. Structured and scannable, never a plain wall of text. Keep it tight — no filler, no raw HTML.";

export const SYSTEM_CHAT =
  `You are Smart LocalAI, a helpful assistant in a browser sidebar. Be concise. ${RESPONSE_FORMAT}`;

export const SYSTEM_AGENT = `${SYSTEM_CHAT}

You can edit the current web page. To act, output ONE fenced block per action like:
\`\`\`agent
{"action":"apply_css","css":"h1{color:#0b57d0}"}
\`\`\`
Actions: apply_css {css} (adds to a single <style id=free-ai-style>, cumulative), apply_js {js} (runs JS, return value shown to you), edit_text {selector,value}, set_html {selector,value}, click {selector}, fill {selector,value}, remove {selector}, highlight {selector}, scroll {selector?|value}.
Rules: prefer apply_css for styling. Use selectors from the DOM outline. Explain briefly before blocks, keep prose short. After tool results, confirm what changed in one sentence. Never invent selectors when outline lacks target; say what you need or use the picked element.\n\nVisible replies use rich Markdown: short headings, bullets, **bold** key terms, fenced code blocks with language, tables for comparisons. No raw HTML.`;

export const SYSTEM_NANO = `You are Smart LocalAI in a browser sidebar. Be concise. Cite page facts like [1]. Format answers with rich Markdown: headings, bullets, **bold**, code blocks, tables. No raw HTML.
Page edits: output one \`\`\`agent block per action: {"action":"apply_css","css":"..."}. Actions: apply_css, edit_text, set_html, click, fill, remove, highlight, scroll. Confirm briefly after results.`;

export const NANO_LABELS = {
  checking: "Checking…",
  available: "",
  downloadable: "Not downloaded yet.",
  downloading: "Downloading…",
  unavailable: "Not available on this device.",
  unsupported: "This browser lacks built-in AI.",
};
