import { DEFAULT_SETTINGS } from "./constants.js";
import { NANO_MODEL, PROVIDER_TYPES, pickSmartModel } from "../models/providers.js";

export function createDefaultEndpoint(type = "lmstudio") {
  const preset = PROVIDER_TYPES[type] || PROVIDER_TYPES.custom;
  return {
    type,
    baseUrl: preset.baseUrl,
    apiKey: "",
    models: [],
    model: "",
    remembered: {},
    useNano: false,
  };
}

export function listEndpointModels(endpoint, detection) {
  if (endpoint.models.length) return endpoint.models;
  return detection[endpoint.type]?.models || [];
}

export function isNanoEnabled(endpoint, nanoStatus) {
  return endpoint.useNano && nanoStatus === "available";
}

export function buildProvider(endpoint, nanoStatus) {
  if (isNanoEnabled(endpoint, nanoStatus)) {
    return {
      id: "nano",
      name: "Gemini Nano",
      protocol: "nano",
      baseUrl: "built-in",
      auth: "none",
      apiKey: "",
      model: NANO_MODEL,
    };
  }

  const preset = PROVIDER_TYPES[endpoint.type] || PROVIDER_TYPES.custom;
  return {
    id: endpoint.type,
    name: preset.name,
    protocol: preset.protocol,
    local: Boolean(preset.local),
    baseUrl: (endpoint.baseUrl || preset.baseUrl).trim(),
    auth: endpoint.auth || preset.auth,
    authHeader: endpoint.authHeader || "",
    apiKey: (endpoint.apiKey || "").trim(),
    model: endpoint.model || "",
  };
}

export function effectiveModel(provider, endpoint, settings, detection) {
  if (!provider) return "";
  if (provider.model) return provider.model;
  const remembered = endpoint.remembered[provider.id];
  if (remembered) return remembered;
  const models = listEndpointModels(endpoint, detection);
  return settings.smartModel ? pickSmartModel(models) : models[0] || "";
}

export function resolveActive(endpoint, nanoStatus, settings, detection) {
  const provider = buildProvider(endpoint, nanoStatus);
  const model = provider.model || effectiveModel(provider, endpoint, settings, detection);
  return model ? { provider, model } : null;
}

export function normalizeEndpoint(endpoint) {
  if (!endpoint || !PROVIDER_TYPES[endpoint.type]) return createDefaultEndpoint();
  return { ...createDefaultEndpoint(endpoint.type), ...endpoint, remembered: endpoint.remembered || {} };
}

export function endpointFromLegacyProviders(providers) {
  const remote = Array.isArray(providers) ? providers.find((provider) => !provider.local && provider.apiKey) : null;
  if (!remote || !PROVIDER_TYPES[remote.endpointType]) return createDefaultEndpoint();
  return {
    ...createDefaultEndpoint(remote.endpointType),
    baseUrl: remote.baseUrl || "",
    apiKey: remote.apiKey || "",
    models: remote.models || [],
    model: remote.model || "",
    remembered: remote.model ? { [remote.endpointType]: remote.model } : {},
  };
}

export function normalizeSettings(settings) {
  return { ...DEFAULT_SETTINGS, ...(settings || {}) };
}

export function threadTitle(messages) {
  const first = (messages || []).find((message) => message.role === "user");
  if (!first) return "New chat";
  const text = String(first.content ?? "");
  return text.slice(0, 40) + (text.length > 40 ? "…" : "");
}

export function createThreadId() {
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function upsertThread(threads, threadId, messages) {
  if (!threadId || !messages.length) return threads;
  const record = {
    id: threadId,
    title: threadTitle(messages),
    updated: Date.now(),
    messages: messages.slice(-40),
  };
  const existingIndex = threads.findIndex((thread) => thread.id === threadId);
  if (existingIndex < 0) return [record, ...threads].slice(0, 30);
  const next = [...threads];
  next[existingIndex] = record;
  return next;
}

export function normalizeStoredState(data) {
  const endpoint = data["freeai.endpoint"]
    ? normalizeEndpoint(data["freeai.endpoint"])
    : endpointFromLegacyProviders(data["freeai.providers"]);
  const threads = Array.isArray(data["freeai.threads"]) ? data["freeai.threads"] : [];
  let activeThreadId = data["freeai.activeThread"] || "";
  const savedThread = threads.find((thread) => thread.id === activeThreadId);
  const rawMessages = savedThread?.messages || data["freeai.history"] || [];
  const messages = rawMessages.map((message, index) => ({
    ...message,
    id: message.id || `m-${activeThreadId || "legacy"}-${index}`,
  }));
  if (!savedThread) activeThreadId = messages.length ? createThreadId() : "";

  return {
    endpoint,
    settings: normalizeSettings(data["freeai.settings"]),
    threads,
    activeThreadId,
    messages,
    customPrompts: Array.isArray(data["freeai.customPrompts"]) ? data["freeai.customPrompts"] : [],
  };
}

export function stateForStorage({ endpoint, settings, threads, activeThreadId, messages, customPrompts }) {
  return {
    "freeai.endpoint": endpoint,
    "freeai.settings": settings,
    "freeai.history": messages.slice(-40),
    "freeai.threads": upsertThread(threads, activeThreadId, messages).slice(0, 30),
    "freeai.activeThread": activeThreadId,
    "freeai.customPrompts": customPrompts.slice(0, 50),
  };
}
