import { authHeaders, nanoAPI, nanoLanguageOptions, normalizeBase } from "./providers.js";

function drainLines(buffer, parseEvent, onToken) {
  let full = "";
  const lines = buffer.split("\n");
  const rest = lines.pop() || "";
  for (const line of lines) {
    const text = parseEvent(line.trim());
    if (text) { full += text; if (onToken) onToken(text); }
  }
  return { full, rest };
}

async function readSse(res, parseEvent, onToken) {
  if (!res.body) throw new Error("No response stream");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const drained = drainLines(buffer, parseEvent, onToken);
    full += drained.full;
    buffer = drained.rest;
  }
  buffer += decoder.decode();
  if (buffer.trim()) {
    const text = parseEvent(buffer.trim());
    if (text) { full += text; if (onToken) onToken(text); }
  }
  return full;
}

async function streamNano(messages, onToken, signal) {
  const LM = nanoAPI();
  if (!LM) throw new Error("Built-in model not supported in this browser");
  const history = (messages || []).filter((m) => m.role === "system" || m.role === "user" || m.role === "assistant");
  const last = history.length ? history[history.length - 1] : { role: "user", content: "" };
  const context = history.slice(0, -1)
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : m.role, content: String(m.content || "") }))
    .filter((m) => m.content);
  const session = await LM.create({ initialPrompts: context, signal, ...nanoLanguageOptions() });
  try {
    const stream = session.promptStreaming(String(last.content || ""), { signal });
    let full = "";
    for await (const piece of stream) {
      const text = String(piece || "");
      let delta = text;
      if (text.length >= full.length && text.startsWith(full)) delta = text.slice(full.length);
      else full = "";
      full += delta;
      if (delta && onToken) onToken(delta);
      if (signal?.aborted) break;
    }
    return full;
  } finally {
    if (typeof session?.destroy === "function") session.destroy();
  }
}

async function streamOpenAI(provider, model, messages, onToken, signal, options = {}) {
  const base = normalizeBase(provider.baseUrl);
  const reasoningModel = /^(o1|o3|o4|gpt-5)/.test(String(model || ""));
  const body = { model, messages, stream: true };
  if (reasoningModel) body.max_completion_tokens = 4096;
  else {
    body.temperature = 0.4;
    body.max_tokens = 4096;
  }
  if (options.reasoningEffort && reasoningModel) body.reasoning_effort = options.reasoningEffort;
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: authHeaders(provider),
    body: JSON.stringify(body),
    signal
  });
  if (!res.ok) throw new Error(await errorText(res));
  if (!res.body) throw new Error("No response stream");
  return readSse(res, (line) => {
    if (!line.startsWith("data:")) return "";
    const payload = line.slice(5).trim();
    if (payload === "[DONE]") return "";
    try { return JSON.parse(payload).choices?.[0]?.delta?.content || ""; } catch { return ""; }
  }, onToken);
}

async function streamOllama(provider, model, messages, onToken, signal) {
  const base = normalizeBase(provider.baseUrl);
  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true }),
    signal
  });
  if (!res.ok) throw new Error(await errorText(res));
  return readSse(res, (line) => {
    if (!line) return "";
    try { return JSON.parse(line).message?.content || ""; } catch { return ""; }
  }, onToken);
}

async function streamAnthropic(provider, model, messages, onToken, signal) {
  const base = normalizeBase(provider.baseUrl);
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const rest = messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
  const res = await fetch(`${base}/v1/messages`, {
    method: "POST",
    headers: authHeaders(provider),
    body: JSON.stringify({ model, max_tokens: 4096, system: system || undefined, messages: rest, stream: true }),
    signal
  });
  if (!res.ok) throw new Error(await errorText(res));
  return readSse(res, (line) => {
    if (!line.startsWith("data:")) return "";
    try {
      const data = JSON.parse(line.slice(5).trim());
      return data.type === "content_block_delta" ? (data.delta?.text || "") : "";
    } catch { return ""; }
  }, onToken);
}

async function streamGemini(provider, model, messages, onToken, signal) {
  const base = normalizeBase(provider.baseUrl);
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const contents = messages.filter((m) => m.role !== "system").map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: m.parts || [{ text: m.content }]
  }));
  const key = encodeURIComponent((provider.apiKey || "").trim());
  const url = `${base}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemInstruction: system ? { parts: [{ text: system }] } : undefined, contents }),
    signal
  });
  if (!res.ok) throw new Error(await errorText(res));
  return readSse(res, (line) => {
    if (!line.startsWith("data:")) return "";
    try { return JSON.parse(line.slice(5).trim()).candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || ""; }
    catch { return ""; }
  }, onToken);
}

async function errorText(res) {
  let body = "";
  try { body = (await res.text()).slice(0, 400); } catch { /* ignore */ }
  return `HTTP ${res.status}${body ? ` — ${body}` : ""}`;
}

/**
 * Stream a chat completion through the provider protocol. Resolves with full text.
 */
export async function streamChat(provider, model, messages, onToken, signal, options = {}) {
  const protocol = provider.protocol || "openai";
  if (protocol === "nano") return streamNano(messages, onToken, signal);
  if (protocol === "ollama") return streamOllama(provider, model, messages, onToken, signal);
  if (protocol === "anthropic") return streamAnthropic(provider, model, messages, onToken, signal);
  if (protocol === "gemini") return streamGemini(provider, model, messages, onToken, signal);
  return streamOpenAI(provider, model, messages, onToken, signal, options);
}
