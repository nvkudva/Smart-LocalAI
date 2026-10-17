import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Composer from "./components/Composer.jsx";
import { Header, SharingBar } from "./components/Header.jsx";
import MessageList from "./components/MessageList.jsx";
import ModelMenu from "./components/ModelMenu.jsx";
import PromptMenu from "./components/PromptMenu.jsx";
import { useEndpoint } from "./hooks/useEndpoint.jsx";
import { usePageContext } from "./hooks/usePageContext.js";
import { useThreads } from "./hooks/useThreads.js";

const SettingsDrawer = lazy(() => import("./components/SettingsDrawer.jsx"));
import {
  DEFAULT_SETTINGS,
  SYSTEM_AGENT,
  SYSTEM_CHAT,
  SYSTEM_NANO,
  THINKING_EFFORT,
  THINKING_HINTS,
} from "./lib/constants.js";
import { isPageActionIntent } from "./lib/intent.js";
import { createThreadId } from "./lib/extensionState.js";
import { buildPageContext } from "./lib/pageContext.js";
import { loadPersistedState, savePersistedState, takePendingPrompt } from "./lib/storage.js";
import * as PageAgent from "./services/pageAgent.js";
import { modelCapabilities, streamChat, userMessageWithAttachments } from "./services/providers.js";

const TEXT_FILE = /\.(txt|md|markdown|csv|json|js|jsx|ts|tsx|py|html|css|xml|yaml|yml|log|toml|ini|cfg|java|c|cpp|h|go|rs|rb|php|sh|sql)$/i;
const TEXT_ACCEPT = ".txt,.md,.markdown,.csv,.json,.js,.jsx,.ts,.tsx,.py,.html,.css,.xml,.yaml,.yml,.log";

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Couldn't read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [customPrompts, setCustomPrompts] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");
  const [modelExpanded, setModelExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [streamingMessage, setStreamingMessage] = useState(null);
  const [notice, setNotice] = useState(null);
  const [actionCards, setActionCards] = useState([]);
  const [chunks, setChunks] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const attachRef = useRef(null);

  const abortRef = useRef(null);
  const actionResolversRef = useRef(new Map());
  const lastTldrRef = useRef("");
  const pendingHandledRef = useRef(false);
  const sendTextRef = useRef(null);
  const streamFlushRef = useRef(0);
  const streamBufferRef = useRef("");

  const closeMenu = useCallback(() => setOpenMenu(null), []);
  const resetChatArtifacts = useCallback(() => {
    setActionCards([]);
    setStreamingMessage(null);
    setNotice(null);
    setChunks([]);
    setOpenMenu(null);
  }, []);

  const ep = useEndpoint({ loaded, settings, onStatus: setStatus, closeMenu });
  const th = useThreads({ onResetChat: resetChatArtifacts, onStatus: setStatus });
  const { endpoint, active } = ep;
  const { threads, activeThreadId, messages } = th;

  const page = usePageContext({ settings, onStatus: setStatus });

  const caps = useMemo(
    () => (active ? modelCapabilities(active.model, active.provider.protocol) : { vision: false, pdf: false }),
    [active],
  );


  const removeAttachment = useCallback((id) => {
    setAttachments((current) => current.filter((file) => file.id !== id));
  }, []);

  const addFiles = useCallback(
    async (fileList, kind) => {
      const files = [...(fileList || [])];
      if (!files.length || !active?.model) return;
      const now = modelCapabilities(active.model, active.provider.protocol);
      let count = attachments.length;
      for (const file of files) {
        if (count >= 5) {
          setStatus("Up to 5 attachments per message.");
          break;
        }
        if (kind === "image") {
          if (!now.vision) {
            setStatus("This model can't read images — switch to a vision model.");
            continue;
          }
          if (!file.type.startsWith("image/")) {
            setStatus(`Not an image: ${file.name}`);
            continue;
          }
          if (file.size > 6 * 1024 * 1024) {
            setStatus(`Too large (6MB max): ${file.name}`);
            continue;
          }
          const dataUrl = await readAsDataUrl(file);
          count += 1;
          setAttachments((current) => [...current, { id: createThreadId(), kind: "image", name: file.name, dataUrl }]);
        } else {
          const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
          if (isPdf) {
            if (!now.pdf) {
              setStatus("PDFs need a Claude or Gemini model.");
              continue;
            }
            if (file.size > 12 * 1024 * 1024) {
              setStatus(`Too large (12MB max): ${file.name}`);
              continue;
            }
            const dataUrl = await readAsDataUrl(file);
            count += 1;
            setAttachments((current) => [...current, { id: createThreadId(), kind: "pdf", name: file.name, dataUrl }]);
          } else {
            if (!TEXT_FILE.test(file.name) && !file.type.startsWith("text/")) {
              setStatus(`Unsupported file type: ${file.name}`);
              continue;
            }
            if (file.size > 200 * 1024) {
              setStatus(`Too large (200KB max for text): ${file.name}`);
              continue;
            }
            const text = await file.text();
            count += 1;
            setAttachments((current) => [
              ...current,
              { id: createThreadId(), kind: "text", name: file.name, text },
            ]);
          }
        }
      }
    },
    [active, attachments.length],
  );

  useEffect(() => {
    document.body.dataset.theme = settings.theme || "light";
  }, [settings.theme]);

  useEffect(() => {
    let cancelled = false;
    loadPersistedState()
      .then((state) => {
        if (cancelled) return;
        ep.setEndpoint(state.endpoint);
        setSettings(state.settings);
        th.setThreads(state.threads);
        th.setActiveThreadId(state.activeThreadId);
        th.setMessages(state.messages);
        setCustomPrompts(state.customPrompts);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => {
      savePersistedState({ endpoint, settings, threads, activeThreadId, messages, customPrompts }).catch(() => {});
    }, 300);
    return () => window.clearTimeout(timer);
  }, [activeThreadId, customPrompts, endpoint, loaded, messages, settings, threads]);

  useEffect(() => {
    const closeMenus = (event) => {
      if (
        !event.target.closest(".topbar") &&
        !event.target.closest(".composer-wrap") &&
        !event.target.closest("[data-menu-toggle]")
      )
        setOpenMenu(null);
    };
    document.addEventListener("click", closeMenus);
    return () => document.removeEventListener("click", closeMenus);
  }, []);

  const updateActionCard = useCallback((id, patch) => {
    setActionCards((current) => current.map((card) => (card.id === id ? { ...card, ...patch } : card)));
  }, []);

  const resolveAction = useCallback(
    (id, apply) => {
      const resolve = actionResolversRef.current.get(id);
      if (!resolve) return;
      actionResolversRef.current.delete(id);
      if (!apply) updateActionCard(id, { state: "skipped", result: "Skipped by user.", ok: false });
      resolve(apply);
    },
    [updateActionCard],
  );

  const runAction = useCallback(
    async (action) => {
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      const readOnly = PageAgent.READ_ONLY.has(action.action);
      const autoApply = !settings.safeMode || readOnly;
      setActionCards((current) => [
        ...current,
        { id, action, state: autoApply ? "applying" : "pending", result: autoApply ? "Auto-applying…" : "", ok: null },
      ]);

      if (!autoApply) {
        const applied = await new Promise((resolve) => actionResolversRef.current.set(id, resolve));
        if (!applied) return { action: action.action, ok: false, message: "Skipped by user" };
      }
      if (!page.tabId) {
        updateActionCard(id, { state: "done", result: "No page attached.", ok: false });
        return { action: action.action, ok: false, message: "No page attached" };
      }
      if (action.action === "get_snapshot") {
        await page.refreshPage();
        updateActionCard(id, { state: "done", result: "Snapshot refreshed.", ok: true });
        return { action: action.action, ok: true, message: "Snapshot refreshed" };
      }
      try {
        const result = await PageAgent.executeAction(page.tabId, action);
        updateActionCard(id, {
          state: "done",
          result: `${result.ok ? "✓" : "✗"} ${result.message}`,
          ok: result.ok,
        });
        return { action: action.action, ...result };
      } catch (error) {
        updateActionCard(id, { state: "done", result: `✗ ${error.message}`, ok: false });
        return { action: action.action, ok: false, message: String(error.message || error) };
      }
    },
    [page, settings.safeMode, updateActionCard],
  );

  const handleCitation = useCallback(
    async (index) => {
      const text = chunks[index - 1];
      if (!text || !page.tabId) return;
      setStatus(`Scrolling to citation [${index}]…`);
      try {
        const result = await PageAgent.scrollToChunk(page.tabId, text);
        setStatus(result.ok ? `Citation [${index}] shown on page.` : result.message);
      } catch (error) {
        setStatus(`Citation scroll failed: ${error.message}`);
      }
    },
    [chunks, page.tabId],
  );

  const sendText = useCallback(
    async (rawText) => {
      const text = String(rawText || "").trim();
      if ((!text && !attachments.length) || busy) return;
      if (!active?.model) {
        setNotice({
          id: "notice-no-model",
          role: "assistant",
          content: "No model available. Open Settings, pick a provider, enter the API key if needed, and press Refresh.",
          modelName: "Free AI",
          error: true,
        });
        setSettingsOpen(true);
        return;
      }

      if (attachments.some((file) => file.kind === "image") && !modelCapabilities(active.model, active.provider.protocol).vision) {
        setStatus("This model can't read images — remove them or switch to a vision model.");
        return;
      }
      let outgoing = null;
      let suffix = "";
      if (attachments.length) {
        const built = userMessageWithAttachments(text, attachments, active.provider.protocol);
        if (built.error) {
          setStatus(built.error);
          return;
        }
        outgoing = built.message;
        suffix = built.suffix;
      }
      const snapshot = settings.includePage && page.attachPage ? await page.refreshPage() : page.snapshot;
      const context = buildPageContext(snapshot, active.provider, page.picked?.selector || "");
      setChunks(context.chunks);
      if (!activeThreadId) th.setActiveThreadId(createThreadId());
      const userMessage = { id: createThreadId(), role: "user", content: text + suffix };
      const requestHistory = [...messages, userMessage];
      th.setMessages(requestHistory);
      setNotice(null);
      setInput("");
      setAttachments([]);
      setBusy(true);
      const abort = new AbortController();
      abortRef.current = abort;

      const agentIntent = isPageActionIntent(text);
      const baseSystem =
        active.provider.protocol === "nano"
          ? agentIntent
            ? SYSTEM_NANO
            : SYSTEM_CHAT
          : agentIntent
            ? SYSTEM_AGENT
            : SYSTEM_CHAT;
      const customSystem = String(settings.systemPrompt || "").trim();
      const thinkingHint = THINKING_HINTS[settings.thinkingLevel] || THINKING_HINTS.medium;
      const system = [customSystem, baseSystem, thinkingHint].filter(Boolean).join("\n\n") + context.text;
      let requestMessages = [{ role: "system", content: system }, ...requestHistory.slice(-12)];
      if (outgoing) requestMessages[requestMessages.length - 1] = outgoing;
      let finalText = "";
      let previousSignature = "";

      try {
        for (let iteration = 0; iteration < 5; iteration += 1) {
          const modelName = `${active.provider.name} · ${active.model}`;
          streamBufferRef.current = "";
          streamFlushRef.current = 0;
          setStreamingMessage({ role: "assistant", content: "", modelName, streaming: true });
          setStatus(modelName + (iteration ? ` · step ${iteration + 1}` : ""));
          const full = await streamChat(
            active.provider,
            active.model,
            requestMessages,
            (chunk) => {
              streamBufferRef.current += chunk;
              const now = performance.now();
              if (now - streamFlushRef.current < 100) return;
              streamFlushRef.current = now;
              const buffered = streamBufferRef.current;
              setStreamingMessage((current) => (current ? { ...current, content: buffered } : current));
            },
            abort.signal,
            { reasoningEffort: THINKING_EFFORT[settings.thinkingLevel] || "" },
          );
          finalText = full;
          setStreamingMessage({ role: "assistant", content: full, modelName, streaming: true });
          const actions = agentIntent ? PageAgent.parseAgentActions(full) : [];
          if (!actions.length) break;
          const signature = JSON.stringify(actions);
          if (signature === previousSignature) break;
          previousSignature = signature;

          const results = [];
          for (const action of actions.slice(0, 6)) results.push(await runAction(action));
          const refreshedSnapshot = await page.refreshPage();
          requestMessages = [
            ...requestMessages,
            { role: "assistant", content: full },
            {
              role: "user",
              content:
                `[Page action results]\n${results
                  .map((result) => `- ${result.action}: ${result.ok ? "OK" : "FAIL"} — ${result.message}`)
                  .join("\n")}` +
                (refreshedSnapshot
                  ? `\n\nUpdated page text (truncated):\n${refreshedSnapshot.text.slice(0, 3000)}`
                  : "") +
                "\nIf the task is complete, reply with a brief confirmation and NO action blocks. Do not repeat actions.",
            },
          ];
          if (results.every((result) => !result.ok)) break;
        }
        if (finalText) {
          const visibleText = PageAgent.stripAgentBlocks(finalText) || finalText;
          th.setMessages((current) => [
            ...current,
            {
              id: createThreadId(),
              role: "assistant",
              content: visibleText,
              modelName: `${active.provider.name} · ${active.model}`,
            },
          ]);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          setNotice({
            id: "notice-error",
            role: "assistant",
            content: `Error: ${error.message}\n\nCheck endpoint, API key, and that the local server is running.`,
            modelName: active.provider.name,
            error: true,
          });
        }
      } finally {
        setStreamingMessage(null);
        setBusy(false);
        abortRef.current = null;
        setStatus("");
      }
    },
    [
      active,
      activeThreadId,
      attachments,
      busy,
      messages,
      page,
      runAction,
      settings.includePage,
      settings.systemPrompt,
      settings.thinkingLevel,
    ],
  );
  sendTextRef.current = sendText;

  useEffect(() => {
    if (!loaded || pendingHandledRef.current) return;
    pendingHandledRef.current = true;
    takePendingPrompt()
      .then((prompt) => {
        if (prompt) sendTextRef.current?.(prompt, "chat");
      })
      .catch(() => {});
  }, [loaded]);

  useEffect(() => {
    if (!loaded || !settings.autoTldr || !active || messages.length || busy || !page.snapshot) return;
    if (lastTldrRef.current === page.snapshot.url) return;
    lastTldrRef.current = page.snapshot.url;
    sendTextRef.current?.("Give a 3-line TL;DR of this page.", "chat");
  }, [active, busy, loaded, messages.length, page.snapshot, settings.autoTldr]);

  const fillPrompt = useCallback(
    (promptText) => {
      const selection = page.snapshot?.selection || "";
      setInput(String(promptText).split("{selection}").join(selection).split("{page}").join(selection));
      setOpenMenu(null);
    },
    [page.snapshot],
  );

  const displayedMessages = notice ? [...messages, notice] : messages;

  return (
    <>
      <Header
        historyMenuProps={{
          threads,
          activeThreadId,
          query: historyQuery,
          onQueryChange: setHistoryQuery,
          onOpen: th.openThread,
          onDelete: th.deleteThread,
          onExport: th.exportThread,
        }}
        onNewChat={th.startNewThread}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleMenu={(menu) => setOpenMenu((current) => (current === menu ? null : menu))}
        onToggleTheme={() =>
          setSettings((current) => ({ ...current, theme: current.theme === "dark" ? "light" : "dark" }))
        }
        openMenu={openMenu}
      />

      <MessageList
        actionCards={actionCards}
        chunks={chunks}
        messages={displayedMessages}
        onApplyAction={(id) => resolveAction(id, true)}
        onCitation={handleCitation}
        onSkipAction={(id) => resolveAction(id, false)}
        onSuggestion={(suggestion) => sendText(suggestion.prompt)}
        providerStatus={ep.providerSummary}
        streamingMessage={streamingMessage}
      />

      <Composer
        active={active}
        busy={busy}
        input={input}
        modelMenu={
          <ModelMenu
            active={active}
            expanded={modelExpanded}
            isNano={ep.nanoEnabled}
            models={ep.availableModels}
            onSelectAuto={ep.selectAutoModel}
            onSelectModel={ep.selectModel}
            onSelectThinking={(level) => setSettings((current) => ({ ...current, thinkingLevel: level }))}
            onToggleExpanded={() => setModelExpanded((current) => !current)}
            provider={ep.activeProvider}
            thinkingValue={settings.thinkingLevel || "medium"}
          />
        }
        onInputChange={(value) => {
          if (value === "/") {
            setInput("");
            setOpenMenu("prompts");
            return;
          }
          setInput(value);
        }}
        onStop={() => abortRef.current?.abort()}
        onSubmit={() => sendText(input)}
        onToggleMenu={(menu) => setOpenMenu((current) => (current === menu ? null : menu))}
        onToggleSafe={() => setSettings((current) => ({ ...current, safeMode: !current.safeMode }))}
        openMenu={openMenu}
        promptMenu={
          <PromptMenu
            customPrompts={customPrompts}
            onSelect={fillPrompt}
            canImage={caps.vision}
            canDoc={Boolean(active?.model)}
            docHint={caps.pdf ? "Text files and PDFs" : "Text files (PDFs need Claude / Gemini)"}
            onAttachImage={() => {
              setOpenMenu(null);
              attachRef.current?.("image");
            }}
            onAttachDoc={() => {
              setOpenMenu(null);
              attachRef.current?.("doc");
            }}
          />
        }
        attachments={attachments}
        attachAccepts={{
          image: "image/png,image/jpeg,image/webp,image/gif",
          doc: caps.pdf ? `${TEXT_ACCEPT},.pdf,application/pdf` : TEXT_ACCEPT,
        }}
        attachRef={attachRef}
        onFilesChosen={addFiles}
        onRemoveAttachment={removeAttachment}
        settings={settings}
        sharingBar={
          <SharingBar
            onClearPicked={() => page.setPicked(null)}
            onPick={page.pickElement}
            onToggleAttach={page.toggleAttachPage}
            onUndo={page.undo}
            page={page}
          />
        }
        status={status}
      />

      {settingsOpen && (
        <Suspense fallback={null}>
        <SettingsDrawer
          customPrompts={customPrompts}
          endpoint={endpoint}
          endpointLoading={ep.endpointLoading}
          endpointModels={ep.availableModels}
          endpointStatus={ep.endpointStatus}
          nanoStatus={ep.nanoStatus}
          onAddPrompt={(prompt) =>
            setCustomPrompts((current) => (current.includes(prompt) ? current : [...current, prompt]))
          }
          onClearHistory={th.clearAllThreads}
          onClose={() => setSettingsOpen(false)}
          onDeletePrompt={(index) => setCustomPrompts((current) => current.filter((_, itemIndex) => itemIndex !== index))}
          onDownloadNano={ep.downloadNano}
          onEndpointBlur={ep.commitEndpointField}
          onEndpointChange={ep.changeEndpointField}
          onEndpointTypeChange={ep.changeEndpointType}
          onNanoChange={(checked) => ep.updateEndpoint("useNano", checked)}
          onRefreshModels={() => ep.refreshModels()}
          onSettingsChange={(field, value) => setSettings((current) => ({ ...current, [field]: value }))}
          settings={settings}
        />
        </Suspense>
      )}
    </>
  );
}
