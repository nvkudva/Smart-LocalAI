chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

const SELECTION_ACTIONS = {
  "freeai-explain": (sel) => `Explain this in simple terms:\n\n"${sel}"`,
  "freeai-rewrite": (sel) => `Rewrite this more clearly, keep the meaning:\n\n"${sel}"`,
  "freeai-grammar": (sel) => `Fix the grammar and improve clarity, keep the meaning:\n\n"${sel}"`,
  "freeai-translate": (sel) => `Translate this to English:\n\n"${sel}"`,
  "freeai-lookup": (sel) => `Define "${sel}" briefly: meaning, part of speech, and one example sentence.`,
  "freeai-ask": (sel) => `Explain or answer about this selected text:\n\n"${sel}"`
};

function setupMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "freeai-sel", title: "Smart LocalAI", contexts: ["selection"] });
    const items = [
      ["freeai-explain", "Explain selection"],
      ["freeai-rewrite", "Rewrite selection"],
      ["freeai-grammar", "Fix grammar"],
      ["freeai-translate", "Translate selection"],
      ["freeai-lookup", "Look up word"],
      ["freeai-ask", "Ask about selection"]
    ];
    for (const [id, title] of items) {
      chrome.contextMenus.create({ id, parentId: "freeai-sel", title, contexts: ["selection"] });
    }
    chrome.contextMenus.create({
      id: "freeai-summarize",
      title: "Summarize this page with Smart LocalAI",
      contexts: ["page"]
    });
  });
}

chrome.runtime.onInstalled.addListener(setupMenus);
chrome.runtime.onStartup.addListener(setupMenus);

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.windowId) return;
  const build = SELECTION_ACTIONS[info.menuItemId];
  let prompt = "";
  if (build) prompt = build(info.selectionText || "");
  else if (info.menuItemId === "freeai-summarize") prompt = "Summarize this page: key points, then one-line TL;DR.";
  else return;
  // open() needs the user gesture, so it is called in the same tick as the
  // storage write. An already-open panel picks the prompt up from onChanged.
  const stashing = chrome.storage.session.set({ pendingPrompt: prompt });
  const opening = chrome.sidePanel.open({ windowId: tab.windowId });
  await Promise.all([stashing, opening]);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "TAKE_PENDING_PROMPT") return false;
  (async () => {
    const stored = await chrome.storage.session.get("pendingPrompt");
    await chrome.storage.session.remove("pendingPrompt");
    sendResponse({ prompt: stored.pendingPrompt || null });
  })();
  return true;
});
