// Global (cross-thread) store of user-submitted prompts, oldest first.
// Navigation index: -1 means the live draft, 0 is the most recent prompt.

export function pushPrompt(history, text, max = 100) {
  const value = String(text || "").trim();
  if (!value) return history || [];
  const next = [...(history || [])];
  if (next[next.length - 1] === value) return next;
  next.push(value);
  while (next.length > max) next.shift();
  return next;
}

// direction: 1 = older (Up), -1 = newer (Down). Clamps at both ends.
export function stepHistoryIndex(history, index, direction) {
  const len = (history || []).length;
  if (!len) return -1;
  if (direction > 0) return index < len - 1 ? index + 1 : len - 1;
  return index <= 0 ? -1 : index - 1;
}

export function historyValue(history, index, draft) {
  if (index < 0) return draft;
  const list = history || [];
  return list[list.length - 1 - index] ?? draft;
}
