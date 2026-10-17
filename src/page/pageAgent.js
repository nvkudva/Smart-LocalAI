// Page snapshot, element picker, action executor. Runs from the sidebar.
import {
  executeInPage,
  pickerInPage,
  scrollToChunkInPage,
  snapshotInPage,
  undoInPage,
} from "./injectedPage.js";

function isRestrictedPage(url) {
    return !url || /^(chrome|edge|about|chrome-extension|devtools|view-source):/.test(url) || url.includes("chromewebstore.google.com");
  }

  async function activeTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  }

  async function getSnapshot(tabId) {
    const results = await chrome.scripting.executeScript({ target: { tabId }, func: snapshotInPage });
    return results[0].result;
  }

  async function executeAction(tabId, action) {
    const results = await chrome.scripting.executeScript({ target: { tabId }, func: executeInPage, args: [action] });
    return results[0].result || { ok: false, message: "No result" };
  }

  async function undo(tabId) {
    const results = await chrome.scripting.executeScript({ target: { tabId }, func: undoInPage });
    return results[0].result;
  }

  async function pickElement(tabId) {
    const results = await chrome.scripting.executeScript({ target: { tabId }, func: pickerInPage });
    return results[0].result;
  }

  const READ_ONLY = new Set(["get_snapshot", "highlight", "scroll"]);

  function parseAgentActions(text) {
    const actions = [];
    const fence = /```(?:agent|json|tool)?[ \t]*\n?([\s\S]*?)```/g;
    for (let match = fence.exec(text); match !== null; match = fence.exec(text)) {
      try {
        const parsed = JSON.parse(match[1].trim());
        const list = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of list) if (item?.action) actions.push(item);
      } catch { /* not an action block */ }
    }
    return actions;
  }

  function stripAgentBlocks(text) {
    return String(text ?? "").replace(/```(?:agent|json|tool)?[ \t]*\n?[\s\S]*?```/g, (block) => {
      try {
        const inner = block.replace(/```[a-z]*\s*\n?/, "").replace(/```$/, "");
        const parsed = JSON.parse(inner.trim());
        const list = Array.isArray(parsed) ? parsed : [parsed];
        return list.every((i) => i?.action) ? "" : block;
      } catch { return block; }
    }).trim();
  }

  async function scrollToChunk(tabId, text) {
    const results = await chrome.scripting.executeScript({ target: { tabId }, func: scrollToChunkInPage, args: [text] });
    return results[0].result || { ok: false, message: "No result" };
  }

export {
  isRestrictedPage,
  activeTab,
  getSnapshot,
  executeAction,
  undo,
  pickElement,
  scrollToChunk,
  parseAgentActions,
  stripAgentBlocks,
  READ_ONLY,
};

