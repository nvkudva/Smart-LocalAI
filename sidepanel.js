"use strict";

// ---- State ----
const $ = (id) => document.getElementById(id);
const els = {
  modelBtn: $("modelBtn"), modelLabel: $("modelLabel"), modelMenu: $("modelMenu"),
  thread: $("thread"), empty: $("emptyState"), messages: $("messages"),
  input: $("input"), composer: $("composer"), sendBtn: $("sendBtn"), stopBtn: $("stopBtn"),
  status: $("statusLine"), pageTitle: $("pageTitle"), pageDot: $("pageDot"),
  providerStatus: $("providerStatus"), settings: $("settings"),
  safeLabel: $("safeLabel"), pickedBar: $("pickedBar"), pickedLabel: $("pickedLabel")
};

const state = {
  endpoint: { type: "lmstudio", baseUrl: "", apiKey: "", models: [], model: "", remembered: {} },
  detection: {}, // presetId -> {ok, latencyMs, models, error}
  settings: { safeMode: true, includePage: true, smartModel: true, autoTldr: false, theme: "light" },
  history: [],
  threads: [],
  threadId: "",
  chunks: [],
  customPrompts: [],
  lastTldrKey: "",
  mode: "agent",
  attachPage: true,
  pickedSelector: "",
  snapshot: null,
  tabId: null,
  abort: null,
  busy: false
};

const SYSTEM_CHAT = "You are Free AI, a helpful assistant in a browser sidebar. Be concise. Use markdown sparingly.";
const SYSTEM_AGENT = SYSTEM_CHAT + "\n\n" +
  "You can edit the current web page. To act, output ONE fenced block per action like:\n" +
  "```agent\n{\"action\":\"apply_css\",\"css\":\"h1{color:#0b57d0}\"}\n```\n" +
  "Actions: apply_css {css} (adds to a single <style id=free-ai-style>, cumulative), apply_js {js} (runs JS, return value shown to you), " +
  "edit_text {selector,value}, set_html {selector,value}, click {selector}, fill {selector,value}, remove {selector}, highlight {selector}, scroll {selector?|value}.\n" +
  "Rules: prefer apply_css for styling. Use selectors from the DOM outline. Explain briefly before blocks, keep prose short. " +
  "After tool results, confirm what changed in one sentence. Never invent selectors when outline lacks target; say what you need or use the picked element.";

function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ---- Markdown + citation buttons ----
function renderMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (m, lang, code) => "<pre><code>" + code + "</code></pre>");
  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>");
  html = html.replace(/^#{1,3}\s+(.+)$/gm, "<b>$1</b>");
  html = html.replace(/^\s*[-*]\s+/gm, "• ");
  html = html.replace(/\[(\d{1,2})\]/g, (m, n) => {
    const idx = parseInt(n, 10);
    if (idx >= 1 && idx <= state.chunks.length) {
      return '<button class="cite-btn" data-cite="' + idx + '">[' + idx + "]</button>";
    }
    return m;
  });
  return html;
}

function wireCiteButtons(root) {
  root.querySelectorAll("[data-cite]").forEach((btn) => {
    btn.addEventListener("click", async (event) => {
      event.stopPropagation();
      const idx = parseInt(btn.dataset.cite, 10) - 1;
      const text = state.chunks[idx];
      if (!text || !state.tabId) return;
      setStatus("Scrolling to citation [" + (idx + 1) + "]…");
      try {
        const result = await PageAgent.scrollToChunk(state.tabId, text);
        setStatus(result.ok ? "Citation [" + (idx + 1) + "] shown on page." : result.message);
      } catch (e) { setStatus("Citation scroll failed: " + e.message); }
    });
  });
}

// ---- Persistence (threads + settings) ----
async function saveState() {
  persistThread();
  await chrome.storage.local.set({
    "freeai.endpoint": state.endpoint,
    "freeai.settings": state.settings,
    "freeai.history": state.history.slice(-40),
    "freeai.threads": state.threads.slice(0, 30),
    "freeai.activeThread": state.threadId,
    "freeai.customPrompts": state.customPrompts.slice(0, 50)
  });
}

// ---- Single endpoint ----
function defaultEndpoint(type) {
  const preset = Providers.PROVIDER_TYPES[type] || Providers.PROVIDER_TYPES.custom;
  return { type, baseUrl: preset.baseUrl, apiKey: "", models: [], model: "", remembered: {} };
}

async function loadState() {
  const data = await chrome.storage.local.get([
    "freeai.endpoint", "freeai.providers", "freeai.settings", "freeai.history",
    "freeai.threads", "freeai.activeThread", "freeai.customPrompts"
  ]);
  const saved = data["freeai.endpoint"];
  if (saved && Providers.PROVIDER_TYPES[saved.type]) {
    state.endpoint = Object.assign(defaultEndpoint(saved.type), saved);
  } else {
    // Migrate from the old provider list: prefer a remote endpoint that has a key.
    const old = data["freeai.providers"];
    const remote = Array.isArray(old) ? old.find((p) => !p.local && p.apiKey) : null;
    if (remote && Providers.PROVIDER_TYPES[remote.endpointType]) {
      state.endpoint = Object.assign(defaultEndpoint(remote.endpointType), {
        baseUrl: remote.baseUrl, apiKey: remote.apiKey, models: remote.models || [],
        model: remote.model || "", remembered: remote.model ? { [remote.endpointType]: remote.model } : {}
      });
    } else {
      state.endpoint = defaultEndpoint("lmstudio");
    }
  }
  Object.assign(state.settings, data["freeai.settings"] || {});
  state.threads = Array.isArray(data["freeai.threads"]) ? data["freeai.threads"] : [];
  state.customPrompts = Array.isArray(data["freeai.customPrompts"]) ? data["freeai.customPrompts"] : [];
  state.threadId = data["freeai.activeThread"] || "";
  const savedThread = state.threads.find((t) => t.id === state.threadId);
  if (savedThread) {
    state.history = savedThread.messages || [];
  } else {
    state.history = data["freeai.history"] || [];
    state.threadId = state.history.length ? ("t" + Date.now().toString(36)) : "";
    if (state.history.length) persistThread();
  }
  document.body.dataset.theme = state.settings.theme || "light";
  $("safeMode").checked = !!state.settings.safeMode;
  $("includePage").checked = !!state.settings.includePage;
  $("smartModel").checked = !!state.settings.smartModel;
  updateSafeLabel();
}

// Live provider object built from the single endpoint card.
function currentProvider() {
  const ep = state.endpoint;
  const preset = Providers.PROVIDER_TYPES[ep.type] || Providers.PROVIDER_TYPES.custom;
  return {
    id: ep.type, name: preset.name, protocol: preset.protocol,
    baseUrl: (ep.baseUrl || preset.baseUrl).trim(), auth: preset.auth,
    apiKey: (ep.apiKey || "").trim(), model: ep.model || ""
  };
}

function effectiveModel(provider) {
  if (!provider) return "";
  if (provider.model) return provider.model;
  const remembered = state.endpoint.remembered[provider.id];
  if (remembered) return remembered;
  const models = state.endpoint.models.length ? state.endpoint.models : (state.detection[provider.id]?.models || []);
  return state.settings.smartModel ? Providers.pickSmartModel(models) : (models[0] || "");
}

// Returns {provider, model} or null.
function resolveActive() {
  const provider = currentProvider();
  const model = provider.model || effectiveModel(provider);
  if (!model) return null;
  return { provider, model };
}

function updateModelLabel() {
  const active = resolveActive();
  els.modelLabel.textContent = active ? active.provider.name + " · " + active.model : "No model — configure endpoint";
  els.modelLabel.title = active ? active.provider.baseUrl : "";
  return active;
}

async function detectAndRender() {
  els.providerStatus.textContent = "Detecting local models…";
  const results = await Providers.detectLocal();
  for (const result of results) state.detection[result.preset.id] = result;
  const healthy = results.filter((r) => r.ok);
  els.providerStatus.innerHTML = healthy.length
    ? healthy.map((r) => "<b>● " + escapeHtml(r.preset.name) + "</b> " + r.models.length + " models · " + r.latencyMs + "ms").join(" &nbsp; ")
    : "No local model found. Start LM Studio / Ollama, or pick a cloud endpoint in Settings ⚙.";
  updateModelLabel();
  renderEndpoint();
  await saveState();
}

// ---- Model menu ----
const menuExpanded = new Set();
const MENU_PREVIEW_COUNT = 4;

function endpointModels() {
  const ep = state.endpoint;
  if (ep.models.length) return ep.models;
  return state.detection[ep.type]?.models || [];
}

function renderModelMenu() {
  const menu = els.modelMenu;
  const active = resolveActive();
  const provider = currentProvider();
  const models = endpointModels();
  const ranked = Providers.rankModels(models);
  const picked = state.endpoint.model || "";
  const autoActive = !picked;
  let html = '<button class="menu-provider' + (autoActive ? " active" : "") + '" data-auto="1"><span class="p-name">✦ Auto</span><span class="p-model">smart pick' +
    (models.length ? ": " + escapeHtml(Providers.pickSmartModel(models)) : "") + "</span>" +
    (autoActive ? '<span class="p-check">✓</span>' : "") + "</button>";
  html += '<div class="menu-section">' + escapeHtml(provider.name) + "</div>";
  if (!ranked.length) {
    html += '<div class="menu-empty">No models yet — open Settings ⚙ and press Refresh.</div>';
  } else {
    const expanded = menuExpanded.has("ep");
    const shown = expanded ? ranked.slice(0, 30) : ranked.slice(0, MENU_PREVIEW_COUNT);
    html += '<div class="menu-models">';
    for (const entry of shown) {
      const isActive = active && active.model === entry.name;
      html += '<button class="menu-item' + (isActive ? " active" : "") + '" data-model="' + escapeHtml(entry.name) + '"><span>' + escapeHtml(entry.name) + "</span>" +
        (isActive ? '<span class="tick">✓</span>' : "") + "</button>";
    }
    html += "</div>";
    if (ranked.length > MENU_PREVIEW_COUNT) {
      html += '<button class="menu-more" data-more="ep">' +
        (expanded ? "Show less" : "+" + (ranked.length - MENU_PREVIEW_COUNT) + " more") + "</button>";
    }
  }
  menu.innerHTML = html;
  menu.querySelectorAll("[data-auto]").forEach((item) => {
    item.addEventListener("click", async () => {
      state.endpoint.model = "";
      menu.classList.add("hidden");
      renderEndpoint();
      updateModelLabel();
      await saveState();
    });
  });
  menu.querySelectorAll(".menu-item[data-model]").forEach((item) => {
    item.addEventListener("click", async () => {
      rememberModel(item.dataset.model);
      menu.classList.add("hidden");
      renderEndpoint();
      updateModelLabel();
      await saveState();
    });
  });
  menu.querySelectorAll("[data-more]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (menuExpanded.has("ep")) menuExpanded.delete("ep");
      else menuExpanded.add("ep");
      renderModelMenu();
    });
  });
}

function rememberModel(model) {
  state.endpoint.model = model || "";
  if (model) state.endpoint.remembered[state.endpoint.type] = model;
}

// Render the single endpoint card controls. Never clobbers focused typing.
function renderEndpoint() {
  const ep = state.endpoint;
  const typeSel = $("epType");
  if (document.activeElement !== typeSel) typeSel.value = ep.type;
  const urlInput = $("epUrl");
  if (document.activeElement !== urlInput && !urlInput.dataset.dirty) urlInput.value = ep.baseUrl;
  const keyInput = $("epKey");
  if (document.activeElement !== keyInput) keyInput.value = ep.apiKey || "";
  const models = endpointModels();
  const smart = models.length ? Providers.pickSmartModel(models) : "";
  const sel = $("epModel");
  const current = ep.model || ep.remembered[ep.type] || "";
  sel.innerHTML = '<option value="">Smart pick' + (smart ? ": " + escapeHtml(smart) : "") + "</option>" +
    models.map((m) => '<option value="' + escapeHtml(m) + '"' + (current === m ? " selected" : "") + ">" + escapeHtml(m) + "</option>").join("");
  const detection = state.detection[ep.type];
  const preset = Providers.PROVIDER_TYPES[ep.type];
  const status = $("epStatus");
  if (!models.length) {
    status.textContent = preset && preset.local && !detection?.ok
      ? "Offline — start " + preset.name + ", then press Refresh."
      : "No models listed — press Refresh.";
  } else {
    status.textContent = models.length + " models" + (detection?.latencyMs != null ? " · " + detection.latencyMs + "ms" : "") + " · Smart: " + smart;
  }
}

// Fetch the model list via the models API for the current URL + key.
async function refreshEndpointModels() {
  const provider = currentProvider();
  if (!provider.baseUrl) { $("epStatus").textContent = "URL required for a custom endpoint."; return; }
  $("epStatus").textContent = "Fetching models…";
  $("epRefresh").disabled = true;
  try {
    const models = await Providers.listModels(provider);
    state.endpoint.models = models;
    if (!state.endpoint.model && !state.endpoint.remembered[state.endpoint.type]) {
      state.endpoint.model = "";
    }
    renderEndpoint();
    updateModelLabel();
    await saveState();
  } catch (e) {
    $("epStatus").textContent = "✗ " + e.message;
  }
  $("epRefresh").disabled = false;
}

function applyEndpointType() {
  const ep = state.endpoint;
  const type = $("epType").value;
  ep.type = type;
  const preset = Providers.PROVIDER_TYPES[type] || Providers.PROVIDER_TYPES.custom;
  ep.baseUrl = preset.baseUrl;
  delete $("epUrl").dataset.dirty;
  ep.models = [];
  ep.model = ep.remembered[type] || "";
  renderEndpoint();
  updateModelLabel();
  saveState();
  refreshEndpointModels();
}

let epFetchTimer = null;
function scheduleEndpointRefresh() {
  clearTimeout(epFetchTimer);
  epFetchTimer = setTimeout(refreshEndpointModels, 800);
}

// ---- Chat threads ----
function threadTitle(messages) {
  const first = (messages || []).find((m) => m.role === "user");
  if (!first) return "New chat";
  return first.content.slice(0, 40) + (first.content.length > 40 ? "…" : "");
}

function persistThread() {
  if (!state.threadId) {
    if (!state.history.length) return;
    state.threadId = "t" + Date.now().toString(36);
  }
  const existing = state.threads.find((t) => t.id === state.threadId);
  const record = { id: state.threadId, title: threadTitle(state.history), updated: Date.now(), messages: state.history.slice(-40) };
  if (existing) Object.assign(existing, record);
  else state.threads.unshift(record);
}

function renderThread() {
  els.thread.innerHTML = "";
  if (!state.history.length) els.empty.classList.remove("hidden");
  for (const item of state.history) addMessage(item.role === "user" ? "user" : "ai", item.content);
}

function startNewThread() {
  persistThread();
  state.threadId = "";
  state.history = [];
  state.chunks = [];
  els.thread.innerHTML = "";
  els.empty.classList.remove("hidden");
}

async function openThread(id) {
  persistThread();
  const thread = state.threads.find((t) => t.id === id);
  if (!thread) return;
  state.threadId = thread.id;
  state.history = (thread.messages || []).slice();
  state.chunks = [];
  renderThread();
  await saveState();
}

function renderHistoryMenu() {
  const query = ($("historySearch").value || "").toLowerCase();
  const list = $("historyList");
  const items = state.threads
    .filter((t) => !query || t.title.toLowerCase().includes(query) ||
      (t.messages || []).some((m) => m.content.toLowerCase().includes(query)));
  list.innerHTML = items.length ? "" : '<div class="menu-empty">No chats yet.</div>';
  for (const thread of items.slice(0, 30)) {
    const row = document.createElement("div");
    row.className = "hist-item" + (thread.id === state.threadId ? " active" : "");
    const date = new Date(thread.updated).toLocaleDateString();
    row.innerHTML = "<span></span><small>" + escapeHtml(date) + "</small>";
    row.querySelector("span").textContent = thread.title;
    row.querySelector("span").addEventListener("click", async () => {
      $("historyMenu").classList.add("hidden");
      await openThread(thread.id);
    });
    const del = document.createElement("button");
    del.className = "hist-del";
    del.textContent = "✕";
    del.title = "Delete chat";
    del.addEventListener("click", async (event) => {
      event.stopPropagation();
      state.threads = state.threads.filter((t) => t.id !== thread.id);
      if (state.threadId === thread.id) startNewThread();
      renderHistoryMenu();
      await saveState();
    });
    row.appendChild(del);
    list.appendChild(row);
  }
}

function downloadFile(name, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function exportThread(format) {
  if (!state.history.length) { setStatus("Nothing to export."); return; }
  const title = threadTitle(state.history);
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "csv") {
    const rows = [["role", "content"]].concat(state.history.map((m) => [m.role, m.content]));
    const csv = rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(",")).join("\n");
    downloadFile("freeai-" + stamp + ".csv", csv, "text/csv");
  } else {
    const md = "# " + title + "\n\n" + state.history.map((m) =>
      m.role === "user" ? "## You\n\n" + m.content : "## Free AI\n\n" + m.content).join("\n\n") + "\n";
    downloadFile("freeai-" + stamp + ".md", md, "text/markdown");
  }
  setStatus("Exported " + state.history.length + " messages.");
}

// ---- Prompt library + voice ----
const BUILTIN_PROMPTS = [
  { name: "Summarize page", text: "Summarize this page: key points, then a one-line TL;DR." },
  { name: "Explain simply", text: "Explain this in simple terms:\n\n{selection}" },
  { name: "Key points", text: "Extract the key points from this page as a short bulleted list." },
  { name: "Pros and cons", text: "List the pros and cons of what this page describes." },
  { name: "Draft email reply", text: "Draft a short professional email reply based on this:\n\n{selection}" },
  { name: "Translate to English", text: "Translate this to English:\n\n{selection}" },
  { name: "Fix grammar", text: "Fix the grammar and improve clarity, keep the meaning:\n\n{selection}" }
];

function fillPromptText(text) {
  const selection = (state.snapshot && state.snapshot.selection) || "";
  els.input.value = String(text).split("{selection}").join(selection).split("{page}").join(selection);
  els.input.focus();
  autoGrow();
}

function renderPromptsMenu() {
  const menu = $("promptsMenu");
  const all = BUILTIN_PROMPTS.concat(state.customPrompts.map((text) => ({ name: text.slice(0, 40), text, custom: true })));
  menu.innerHTML = "";
  for (const prompt of all) {
    const item = document.createElement("button");
    item.className = "menu-item";
    item.innerHTML = "<span></span>";
    item.querySelector("span").textContent = (prompt.custom ? "★ " : "") + prompt.name;
    item.addEventListener("click", () => {
      menu.classList.add("hidden");
      fillPromptText(prompt.text);
    });
    menu.appendChild(item);
  }
}

function renderCustomPromptList() {
  const list = $("customPromptList");
  list.innerHTML = state.customPrompts.length ? "" : '<div class="menu-empty">None yet.</div>';
  state.customPrompts.forEach((text, i) => {
    const row = document.createElement("div");
    row.className = "prompt-row";
    row.innerHTML = "<span></span>";
    row.querySelector("span").textContent = text;
    const del = document.createElement("button");
    del.className = "hist-del";
    del.textContent = "✕";
    del.addEventListener("click", async () => {
      state.customPrompts.splice(i, 1);
      renderCustomPromptList();
      await saveState();
    });
    row.appendChild(del);
    list.appendChild(row);
  });
}

function toggleVoice() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) { setStatus("Voice input not supported in this browser."); return; }
  if (toggleVoice.active) { toggleVoice.active.stop(); return; }
  const recognition = new Recognition();
  toggleVoice.active = recognition;
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.onresult = (event) => {
    const text = Array.from(event.results).map((r) => r[0].transcript).join(" ");
    els.input.value = (els.input.value ? els.input.value + " " : "") + text;
    autoGrow();
    els.input.focus();
  };
  recognition.onend = () => { toggleVoice.active = null; $("voiceBtn").textContent = "Voice"; };
  recognition.onerror = (event) => { setStatus("Voice error: " + event.error); toggleVoice.active = null; $("voiceBtn").textContent = "Voice"; };
  recognition.start();
  $("voiceBtn").textContent = "Stop";
}

async function maybeTldr() {
  if (!state.settings.autoTldr || state.history.length || state.busy) return;
  if (!state.snapshot || !state.tabId) return;
  const key = state.snapshot.url;
  if (state.lastTldrKey === key) return;
  state.lastTldrKey = key;
  sendUserText("Give a 3-line TL;DR of this page.", "chat");
}

function setStatus(text) { els.status.textContent = text || ""; }

// ---- Page context ----
async function refreshPage() {
  try {
    const tab = await PageAgent.activeTab();
    state.tabId = tab ? tab.id : null;
    if (!tab || PageAgent.isRestricted(tab.url)) {
      els.pageTitle.textContent = tab ? "Restricted page — chat only" : "No page attached";
      els.pageDot.className = "dot dot-off";
      state.snapshot = null;
      return;
    }
    els.pageTitle.textContent = tab.title || tab.url;
    els.pageTitle.title = tab.url;
    els.pageDot.className = "dot dot-ok";
    if (state.settings.includePage && state.attachPage) {
      state.snapshot = await PageAgent.getSnapshot(tab.id);
      updateSelBar();
    } else {
      state.snapshot = null;
      updateSelBar();
    }
  } catch (e) {
    els.pageDot.className = "dot dot-off";
  }
}

function updateSelBar() {
  const bar = $("selBar");
  if (!bar) return;
  const selection = (state.snapshot && state.snapshot.selection || "").trim();
  if (selection && state.attachPage) {
    $("selLabel").textContent = "Selection attached: " + (selection.length > 90 ? selection.slice(0, 90) + "…" : selection);
    bar.classList.remove("hidden");
  } else {
    bar.classList.add("hidden");
  }
}

function chunkPageText(text) {
  const chunks = [];
  const clean = String(text || "").replace(/\n{3,}/g, "\n\n");
  for (let i = 0; i < clean.length && chunks.length < 12; i += 600) {
    chunks.push(clean.slice(i, i + 600));
  }
  return chunks;
}

function pageContextText() {
  if (!state.snapshot) return "";
  const snap = state.snapshot;
  let text = "\n\n[Current page]\nTitle: " + snap.title + "\nURL: " + snap.url;
  if (snap.selection) text += "\n\n[User-selected text on the page — prioritize this]\n" + snap.selection;
  if (state.pickedSelector) text += "\nPicked element selector: " + state.pickedSelector;
  state.chunks = chunkPageText(snap.text);
  if (state.chunks.length) {
    text += "\n\nPage passages (cite facts as [n]):\n" +
      state.chunks.map((c, i) => "[" + (i + 1) + "] " + c).join("\n");
    text += "\n\nWhen you state a fact from the page, cite it like [2].";
  }
  text += "\n\nDOM outline:\n" + snap.outline;
  return text;
}

// ---- Messages ----
function addMessage(role, text, modelName) {
  els.empty.classList.add("hidden");
  const wrap = document.createElement("div");
  wrap.className = "msg " + role;
  if (role === "user") {
    wrap.innerHTML = '<div class="bubble"></div>';
    wrap.querySelector(".bubble").textContent = text;
  } else {
    wrap.innerHTML = '<div class="ai-label"><span class="sparkle">✦</span><span>' + escapeHtml(modelName || "Free AI") + '</span></div><div class="body"></div>' +
      '<div class="msg-actions"><button class="mini-btn" data-copy>Copy</button></div>';
    wrap.querySelector(".body").innerHTML = renderMarkdown(PageAgent.stripAgentBlocks(text) || text);
    wireCiteButtons(wrap);
    wrap.querySelector("[data-copy]").addEventListener("click", () => navigator.clipboard.writeText(text));
  }
  els.thread.appendChild(wrap);
  els.messages.scrollTop = els.messages.scrollHeight;
  return wrap;
}

function createAiStreamBubble(modelName) {
  els.empty.classList.add("hidden");
  const wrap = document.createElement("div");
  wrap.className = "msg ai";
  wrap.innerHTML = '<div class="ai-label"><span class="sparkle">✦</span><span>' + escapeHtml(modelName) + '</span></div><div class="body"><span class="typing">Thinking…</span></div>';
  els.thread.appendChild(wrap);
  els.messages.scrollTop = els.messages.scrollHeight;
  const body = wrap.querySelector(".body");
  let raw = "";
  return {
    push(chunk) {
      raw += chunk;
      body.innerHTML = renderMarkdown(PageAgent.stripAgentBlocks(raw)) || '<span class="typing">Working…</span>';
      els.messages.scrollTop = els.messages.scrollHeight;
    },
    finish() {
      const visible = PageAgent.stripAgentBlocks(raw);
      body.innerHTML = visible ? renderMarkdown(visible) : '<span class="typing">Done — see action cards below.</span>';
      wireCiteButtons(wrap);
      return raw;
    },
    fail(message) {
      wrap.classList.add("error");
      body.textContent = message;
    }
  };
}

// ---- Page agent ----
function actionSummary(action) {
  const payload = action.css || action.js || action.value || "";
  return { title: action.action, target: action.selector || "page", payload: String(payload).slice(0, 900) };
}

// Shows card. Resolves true (apply) / false (skip).
function showActionCard(action, autoApply) {
  return new Promise((resolve) => {
    const summary = actionSummary(action);
    const card = document.createElement("div");
    card.className = "action-card";
    card.innerHTML = "<h4>Page action · " + escapeHtml(summary.title) + '</h4><div class="target">' + escapeHtml(summary.target) + "</div>" +
      (summary.payload ? "<pre></pre>" : "") +
      '<div class="row"><button class="btn primary" data-apply>Apply</button><button class="btn" data-skip>Skip</button></div><div class="result"></div>';
    if (summary.payload) card.querySelector("pre").textContent = summary.payload;
    els.thread.appendChild(card);
    els.messages.scrollTop = els.messages.scrollHeight;
    const resultEl = card.querySelector(".result");
    card.querySelector("[data-apply]").addEventListener("click", () => resolve({ ok: true, card, resultEl }));
    card.querySelector("[data-skip]").addEventListener("click", () => {
      resultEl.textContent = "Skipped by user.";
      card.querySelectorAll("button").forEach((b) => (b.disabled = true));
      resolve({ ok: false, card, resultEl });
    });
    if (autoApply) {
      card.querySelectorAll("button").forEach((b) => (b.disabled = true));
      resultEl.textContent = "Auto-applying…";
      resolve({ ok: true, card, resultEl });
    }
  });
}

async function runActionWithCard(action) {
  const readOnly = PageAgent.READ_ONLY.has(action.action);
  const autoApply = !state.settings.safeMode || readOnly;
  const decision = await showActionCard(action, autoApply);
  if (!decision.ok) return { action: action.action, ok: false, message: "Skipped by user" };
  if (!state.tabId) {
    decision.resultEl.textContent = "No page attached.";
    decision.resultEl.className = "result fail";
    return { action: action.action, ok: false, message: "No page attached" };
  }
  if (action.action === "get_snapshot") {
    await refreshPage();
    decision.resultEl.textContent = "Snapshot refreshed.";
    decision.resultEl.className = "result ok";
    return { action: action.action, ok: true, message: "Snapshot refreshed" };
  }
  try {
    const result = await PageAgent.executeAction(state.tabId, action);
    decision.resultEl.textContent = (result.ok ? "✓ " : "✗ ") + result.message;
    decision.resultEl.className = "result " + (result.ok ? "ok" : "fail");
    return { action: action.action, ...result };
  } catch (e) {
    decision.resultEl.textContent = "✗ " + e.message;
    decision.resultEl.className = "result fail";
    return { action: action.action, ok: false, message: String(e.message || e) };
  }
}

// ---- Chat send loop ----
async function sendUserText(rawText, forceMode) {
  const text = String(rawText || "").trim();
  if (!text || state.busy) return;
  const active = updateModelLabel();
  if (!active || !active.model) {
    addMessage("ai", "No model available. Open Settings ⚙, pick a provider, enter the API key if needed, and press Refresh.", "Free AI");
    els.settings.classList.remove("hidden");
    return;
  }
  const mode = forceMode || state.mode;
  if (state.settings.includePage && state.attachPage) await refreshPage();
  addMessage("user", text);
  state.history.push({ role: "user", content: text });
  els.input.value = "";
  autoGrow();
  state.busy = true;
  els.sendBtn.disabled = true;
  els.stopBtn.classList.remove("hidden");
  state.abort = new AbortController();

  const system = (mode === "agent" ? SYSTEM_AGENT : SYSTEM_CHAT) + pageContextText();
  let messages = [{ role: "system", content: system }, ...state.history.slice(-12)];
  let finalText = "";

  try {
    for (let iteration = 0; iteration < 5; iteration++) {
      const bubble = createAiStreamBubble(active.provider.name + " · " + active.model);
      setStatus(active.provider.name + " · " + active.model + (iteration ? " · step " + (iteration + 1) : ""));
      const full = await Providers.streamChat(active.provider, active.model, messages, (chunk) => bubble.push(chunk), state.abort.signal);
      bubble.finish();
      finalText = full;
      const actions = mode === "agent" ? PageAgent.parseAgentActions(full) : [];
      if (!actions.length) break;
      const results = [];
      for (const action of actions.slice(0, 6)) results.push(await runActionWithCard(action));
      await refreshPage();
      messages = [
        ...messages,
        { role: "assistant", content: full },
        { role: "user", content: "[Page action results]\n" + results.map((r) => "- " + r.action + ": " + (r.ok ? "OK" : "FAIL") + " — " + r.message).join("\n") + (state.snapshot ? "\n\nUpdated page text (truncated):\n" + state.snapshot.text.slice(0, 3000) : "") + "\nConfirm briefly what changed. Do not repeat actions unless needed." }
      ];
      if (results.every((r) => !r.ok)) break;
    }
    if (finalText) state.history.push({ role: "assistant", content: PageAgent.stripAgentBlocks(finalText) || finalText });
  } catch (e) {
    if (e.name !== "AbortError") addMessage("ai", "Error: " + e.message + "\n\nCheck endpoint, API key, and that the local server is running.", active.provider.name);
  } finally {
    state.busy = false;
    els.sendBtn.disabled = false;
    els.stopBtn.classList.add("hidden");
    state.abort = null;
    setStatus("");
    await saveState();
  }
}

// ---- Small UI helpers ----
function updateSafeLabel() {
  els.safeLabel.textContent = state.settings.safeMode ? "Safe: approve edits" : "Auto-apply edits";
}
function setMode(mode) {
  state.mode = mode;
  $("modeChat").classList.toggle("active", mode === "chat");
  $("modeAgent").classList.toggle("active", mode === "agent");
}
function autoGrow() {
  els.input.style.height = "auto";
  els.input.style.height = Math.min(els.input.scrollHeight, 140) + "px";
}

// ---- Events ----
function bindEvents() {
  els.composer.addEventListener("submit", (event) => { event.preventDefault(); sendUserText(els.input.value); });
  els.input.addEventListener("input", autoGrow);
  els.input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendUserText(els.input.value); }
  });
  els.stopBtn.addEventListener("click", () => { if (state.abort) state.abort.abort(); });
  $("modeChat").addEventListener("click", () => setMode("chat"));
  $("modeAgent").addEventListener("click", () => setMode("agent"));
  els.modelBtn.addEventListener("click", () => { renderModelMenu(); els.modelMenu.classList.toggle("hidden"); });
  document.addEventListener("click", (event) => {
    if (!els.modelMenu.contains(event.target) && event.target !== els.modelBtn && !els.modelBtn.contains(event.target)) els.modelMenu.classList.add("hidden");
    if (!$("historyMenu").contains(event.target) && event.target !== $("historyBtn")) $("historyMenu").classList.add("hidden");
    if (!$("promptsMenu").contains(event.target) && event.target !== $("promptsBtn")) $("promptsMenu").classList.add("hidden");
  });
  $("newChatBtn").addEventListener("click", async () => {
    startNewThread(); await saveState();
  });
  $("historyBtn").addEventListener("click", () => {
    renderHistoryMenu();
    $("historyMenu").classList.toggle("hidden");
    $("historySearch").value = "";
    $("historySearch").focus();
  });
  $("historySearch").addEventListener("input", renderHistoryMenu);
  $("exportMdBtn").addEventListener("click", () => exportThread("md"));
  $("exportCsvBtn").addEventListener("click", () => exportThread("csv"));
  $("promptsBtn").addEventListener("click", () => {
    renderPromptsMenu();
    $("promptsMenu").classList.toggle("hidden");
  });
  $("voiceBtn").addEventListener("click", toggleVoice);
  $("addPromptBtn").addEventListener("click", async () => {
    const text = $("customPromptInput").value.trim();
    if (!text) return;
    state.customPrompts.push(text);
    $("customPromptInput").value = "";
    renderCustomPromptList();
    await saveState();
  });
  $("themeBtn").addEventListener("click", async () => {
    state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
    document.body.dataset.theme = state.settings.theme;
    await saveState();
  });
  $("settingsBtn").addEventListener("click", () => els.settings.classList.remove("hidden"));
  $("settingsClose").addEventListener("click", () => els.settings.classList.add("hidden"));
  $("safeMode").addEventListener("change", async (event) => { state.settings.safeMode = event.target.checked; updateSafeLabel(); await saveState(); });
  $("includePage").addEventListener("change", async (event) => { state.settings.includePage = event.target.checked; await saveState(); refreshPage(); });
  $("smartModel").addEventListener("change", async (event) => { state.settings.smartModel = event.target.checked; updateModelLabel(); await saveState(); });
  $("autoTldr").addEventListener("change", async (event) => { state.settings.autoTldr = event.target.checked; await saveState(); });
  $("clearHistoryBtn").addEventListener("click", async () => {
    state.threads = [];
    startNewThread();
    renderHistoryMenu();
    await saveState();
  });
  $("attachBtn").addEventListener("click", async () => {
    state.attachPage = !state.attachPage;
    $("attachBtn").classList.toggle("on", state.attachPage);
    $("attachBtn").textContent = state.attachPage ? "Page ✓" : "Page ✕";
    if (state.attachPage) await refreshPage(); else { state.snapshot = null; updateSelBar(); }
  });
  $("undoBtn").addEventListener("click", async () => {
    if (!state.tabId) return;
    try {
      const result = await PageAgent.undo(state.tabId);
      setStatus(result.message);
      addMessage("ai", (result.ok ? "↩ " : "") + result.message, "Page agent");
    } catch (e) { setStatus(e.message); }
  });
  $("pickBtn").addEventListener("click", async () => {
    if (!state.tabId) { setStatus("No page attached."); return; }
    setStatus("Click an element on the page… (Esc cancels)");
    try {
      const picked = await PageAgent.pickElement(state.tabId);
      if (picked && picked.selector) {
        state.pickedSelector = picked.selector;
        els.pickedLabel.textContent = "Target: " + picked.selector + (picked.label ? " — " + picked.label : "");
        els.pickedBar.classList.remove("hidden");
        els.input.value = "Edit element " + picked.selector + ": ";
        els.input.focus();
      }
    } catch (e) { setStatus("Picker failed: " + e.message); }
  });
  $("pickedClear").addEventListener("click", () => { state.pickedSelector = ""; els.pickedBar.classList.add("hidden"); });
  document.querySelectorAll(".suggest").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.agentPrompt) { setMode("agent"); sendUserText(button.dataset.agentPrompt, "agent"); }
      else sendUserText(button.dataset.prompt, "chat");
    });
  });
  $("epType").addEventListener("change", applyEndpointType);
  $("epUrl").addEventListener("input", () => { $("epUrl").dataset.dirty = "1"; });
  $("epUrl").addEventListener("change", async () => {
    state.endpoint.baseUrl = Providers.normalizeBase($("epUrl").value);
    delete $("epUrl").dataset.dirty;
    updateModelLabel();
    await saveState();
    scheduleEndpointRefresh();
  });
  $("epKey").addEventListener("change", async () => {
    state.endpoint.apiKey = $("epKey").value.trim();
    updateModelLabel();
    await saveState();
    scheduleEndpointRefresh();
  });
  $("epModel").addEventListener("change", async () => {
    rememberModel($("epModel").value);
    updateModelLabel();
    await saveState();
  });
  $("epRefresh").addEventListener("click", refreshEndpointModels);
  chrome.tabs.onActivated.addListener(async () => { await refreshPage(); maybeTldr(); });
  chrome.tabs.onUpdated.addListener(async (tabId, info) => { if (info.status === "complete" && tabId === state.tabId) { await refreshPage(); maybeTldr(); } });
}

// ---- Startup ----
async function init() {
  await loadState();
  bindEvents();
  setMode("agent");
  $("attachBtn").classList.add("on");
  $("autoTldr").checked = !!state.settings.autoTldr;
  renderThread();
  renderCustomPromptList();
  await refreshPage();
  updateModelLabel();
  renderEndpoint();
  detectAndRender();
  maybeTldr();
  try {
    const pending = await chrome.runtime.sendMessage({ type: "TAKE_PENDING_PROMPT" });
    if (pending && pending.prompt) sendUserText(pending.prompt, "chat");
  } catch (e) { /* background not ready */ }
  els.input.focus();
}

init();



