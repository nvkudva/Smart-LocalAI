// Provider registry, auto-detection, smart model scoring, streaming chat.
// Plain script (no modules) so sidepanel.html can load it before sidepanel.js.
(function () {
  "use strict";

  const PRESETS = [
    { id: "lmstudio", name: "LM Studio", protocol: "openai", baseUrl: "http://localhost:1234/v1", local: true, auth: "none" },
    { id: "ollama", name: "Ollama", protocol: "ollama", baseUrl: "http://localhost:11434", local: true, auth: "none" }
  ];

  // Single endpoint card: preset (prefilled URL, still editable) or custom.
  const PROVIDER_TYPES = {
    lmstudio: { name: "LM Studio", protocol: "openai", baseUrl: "http://localhost:1234/v1", auth: "none", local: true },
    ollama: { name: "Ollama", protocol: "ollama", baseUrl: "http://localhost:11434", auth: "none", local: true },
    anthropic: { name: "Anthropic", protocol: "anthropic", baseUrl: "https://api.anthropic.com", auth: "x-api-key" },
    openai: { name: "OpenAI", protocol: "openai", baseUrl: "https://api.openai.com/v1", auth: "bearer" },
    deepseek: { name: "DeepSeek", protocol: "openai", baseUrl: "https://api.deepseek.com/v1", auth: "bearer" },
    custom: { name: "Custom", protocol: "openai", baseUrl: "", auth: "bearer" }
  };

  function uid() {
    return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function normalizeBase(url) {
    return String(url || "").trim().replace(/\/+$/, "");
  }

  async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs || 1500);
    try {
      return await fetch(url, { ...(options || {}), signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  function authHeaders(provider) {
    const headers = { "Content-Type": "application/json" };
    const key = (provider.apiKey || "").trim();
    if (!key) return headers;
    if (provider.auth === "x-api-key") {
      headers["x-api-key"] = key;
      headers["anthropic-version"] = "2023-06-01";
    } else if (provider.auth === "custom" && provider.authHeader) {
      headers[provider.authHeader] = key;
    } else if (provider.auth !== "none" && provider.auth !== "query") {
      headers["Authorization"] = "Bearer " + key;
    }
    return headers;
  }

  // Higher is better. Excludes non-chat models via -Infinity.
  function scoreModel(name) {
    const model = String(name || "").toLowerCase();
    if (!model) return -Infinity;
    if (/(embed|rerank|whisper|tts|stt|moderation|clip|vision-encoder|guard)/.test(model)) return -Infinity;
    let score = 10;
    if (/(instruct|chat|assistant|-it\b|assistant)/.test(model)) score += 20;
    if (/(gpt-5|gpt-4\.5|gpt-4o|claude|gemini-2|qwen3|qwen2\.5|llama-3\.3|llama-4|deepseek|mistral-large|command-r|phi-4|gemma-3)/.test(model)) score += 25;
    else if (/(gpt-4|llama|qwen|mistral|gemma|phi|deepseek)/.test(model)) score += 12;
    const sizeMatch = model.match(/(\d+(?:\.\d+)?)\s*b\b/);
    if (sizeMatch) score += Math.min(parseFloat(sizeMatch[1]), 70) * 0.4;
    if (/(latest|turbo|pro|max)/.test(model)) score += 6;
    if (/(mini|nano|small|tiny|lite|flash|haiku|8b|7b|3b|1\.5b|0\.5b)/.test(model)) score -= 4; // still usable, fast
    if (/preview|exp/.test(model)) score -= 3;
    return score;
  }

  function pickSmartModel(models) {
    const ranked = (models || [])
      .map((name) => ({ name, score: scoreModel(name) }))
      .filter((entry) => entry.score > -Infinity)
      .sort((a, b) => b.score - a.score);
    return ranked.length ? ranked[0].name : (models && models[0]) || "";
  }

  function rankModels(models) {
    return (models || [])
      .map((name) => ({ name, score: scoreModel(name) }))
      .sort((a, b) => b.score - a.score);
  }

  async function listModels(provider) {
    const base = normalizeBase(provider.baseUrl);
    if (provider.protocol === "ollama") {
      const res = await fetchWithTimeout(base + "/api/tags", {}, 4000);
      if (!res.ok) throw new Error("Ollama " + res.status);
      const data = await res.json();
      return (data.models || []).map((m) => m.name).filter(Boolean);
    }
    if (provider.protocol === "anthropic") {
      // Anthropic has no public list for all keys; return known-good defaults merged with API if available.
      try {
        const res = await fetchWithTimeout(base + "/v1/models", { headers: authHeaders(provider) }, 4000);
        if (res.ok) {
          const data = await res.json();
          const names = (data.data || []).map((m) => m.id).filter(Boolean);
          if (names.length) return names;
        }
      } catch (e) { /* fall through */ }
      return ["claude-sonnet-4-5", "claude-haiku-4-5", "claude-opus-4-5"];
    }
    if (provider.protocol === "gemini") {
      const key = encodeURIComponent((provider.apiKey || "").trim());
      const res = await fetchWithTimeout(base + "/models?key=" + key, {}, 4000);
      if (!res.ok) throw new Error("Gemini " + res.status);
      const data = await res.json();
      return (data.models || []).map((m) => String(m.name || "").replace("models/", "")).filter((n) => n.includes("gemini"));
    }
    const res = await fetchWithTimeout(base + "/models", { headers: authHeaders(provider) }, 5000);
    if (!res.ok) throw new Error("Models " + res.status);
    const data = await res.json();
    return (data.data || []).map((m) => m.id).filter(Boolean);
  }

  async function probeLocal(preset) {
    const started = performance.now();
    try {
      const fake = { ...preset, apiKey: "" };
      const models = await listModels(fake);
      return { ok: models.length > 0, latencyMs: Math.round(performance.now() - started), models };
    } catch (e) {
      return { ok: false, latencyMs: null, models: [], error: String(e.message || e) };
    }
  }

  async function detectLocal() {
    const locals = PRESETS.filter((p) => p.local);
    const results = await Promise.all(locals.map(async (preset) => ({ preset, ...(await probeLocal(preset)) })));
    return results;
  }

  // Streaming chat. onToken(textChunk). Returns full text.
  // messages: [{role: "system"|"user"|"assistant", content: string}]
  async function streamChat(provider, model, messages, onToken, signal) {
    const protocol = provider.protocol || "openai";
    if (protocol === "ollama") return streamOllama(provider, model, messages, onToken, signal);
    if (protocol === "anthropic") return streamAnthropic(provider, model, messages, onToken, signal);
    if (protocol === "gemini") return streamGemini(provider, model, messages, onToken, signal);
    return streamOpenAI(provider, model, messages, onToken, signal);
  }

  async function readSse(res, parseEvent, onToken) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const text = parseEvent(line.trim());
        if (text) { full += text; if (onToken) onToken(text); }
      }
    }
    return full;
  }

  async function streamOpenAI(provider, model, messages, onToken, signal) {
    const base = normalizeBase(provider.baseUrl);
    const res = await fetch(base + "/chat/completions", {
      method: "POST",
      headers: authHeaders(provider),
      body: JSON.stringify({ model, messages, stream: true, temperature: 0.4 }),
      signal
    });
    if (!res.ok) throw new Error(await errorText(res));
    if (!res.body) throw new Error("No response stream");
    return readSse(res, (line) => {
      if (!line.startsWith("data:")) return "";
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return "";
      try { return JSON.parse(payload).choices?.[0]?.delta?.content || ""; } catch (e) { return ""; }
    }, onToken);
  }

  async function streamOllama(provider, model, messages, onToken, signal) {
    const base = normalizeBase(provider.baseUrl);
    const res = await fetch(base + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: true }),
      signal
    });
    if (!res.ok) throw new Error(await errorText(res));
    return readSse(res, (line) => {
      if (!line) return "";
      try { return JSON.parse(line).message?.content || ""; } catch (e) { return ""; }
    }, onToken);
  }

  async function streamAnthropic(provider, model, messages, onToken, signal) {
    const base = normalizeBase(provider.baseUrl);
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const rest = messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
    const res = await fetch(base + "/v1/messages", {
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
      } catch (e) { return ""; }
    }, onToken);
  }

  async function streamGemini(provider, model, messages, onToken, signal) {
    const base = normalizeBase(provider.baseUrl);
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const contents = messages.filter((m) => m.role !== "system").map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));
    const key = encodeURIComponent((provider.apiKey || "").trim());
    const url = base + "/models/" + encodeURIComponent(model) + ":streamGenerateContent?alt=sse&key=" + key;
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
      catch (e) { return ""; }
    }, onToken);
  }

  async function errorText(res) {
    let body = "";
    try { body = (await res.text()).slice(0, 400); } catch (e) { /* ignore */ }
    return "HTTP " + res.status + (body ? " — " + body : "");
  }

  async function testProvider(provider) {
    const started = performance.now();
    const models = await listModels(provider);
    return { models, latencyMs: Math.round(performance.now() - started), smartModel: pickSmartModel(models) };
  }

  window.Providers = {
    PRESETS, PROVIDER_TYPES, uid, normalizeBase, scoreModel, pickSmartModel, rankModels,
    listModels, detectLocal, probeLocal, streamChat, testProvider, authHeaders
  };
})();

