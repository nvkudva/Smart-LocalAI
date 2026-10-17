import { normalizeStoredState, stateForStorage } from "./extensionState.js";

const STORAGE_KEYS = [
  "freeai.endpoint",
  "freeai.providers",
  "freeai.settings",
  "freeai.history",
  "freeai.threads",
  "freeai.activeThread",
  "freeai.customPrompts",
  "freeai.promptHistory",
];

function hasChromeStorage() {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}

export async function loadPersistedState() {
  if (hasChromeStorage()) {
    const data = await chrome.storage.local.get(STORAGE_KEYS);
    return normalizeStoredState(data);
  }

  try {
    const raw = localStorage.getItem("freeai.react-state");
    return normalizeStoredState(raw ? JSON.parse(raw) : {});
  } catch {
    return normalizeStoredState({});
  }
}

export async function savePersistedState(state) {
  const data = stateForStorage(state);
  if (hasChromeStorage()) {
    await chrome.storage.local.set(data);
    return;
  }
  localStorage.setItem("freeai.react-state", JSON.stringify(data));
}

export async function takePendingPrompt() {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) return null;
  const pending = await chrome.runtime.sendMessage({ type: "TAKE_PENDING_PROMPT" });
  return pending?.prompt || null;
}
