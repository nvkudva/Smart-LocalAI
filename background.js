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
    chrome.contextMenus.create({ id: "freeai-sel", title: "Free AI", contexts: ["selection"] });
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
      title: "Summarize this page with Free AI",
      contexts: ["page"]
    });
  });
}

chrome.runtime.onInstalled.addListener(setupMenus);
chrome.runtime.onStartup.addListener(setupMenus);

let pendingPrompt = null;

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.windowId) return;
  const build = SELECTION_ACTIONS[info.menuItemId];
  if (build) {
    pendingPrompt = build(info.selectionText || "");
  }
  if (info.menuItemId === "freeai-summarize") {
    pendingPrompt = "Summarize this page: key points, then one-line TL;DR.";
  }
  await chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TAKE_PENDING_PROMPT") {
    sendResponse({ prompt: pendingPrompt });
    pendingPrompt = null;
    return true;
  }
  if (message.type === "OPEN_PANEL" && sender.tab) {
    chrome.sidePanel.open({ windowId: sender.tab.windowId });
  }
  return false;
});
