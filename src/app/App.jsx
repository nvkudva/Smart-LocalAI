import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Composer from "../chat/composer.jsx";
import { Header, SharingBar } from "../shared/header.jsx";
import MessageList from "../chat/messageList.jsx";
import ModelMenu from "../models/modelMenu.jsx";
import HistoryPanel from "../chat/historyPanel.jsx";
import PromptMenu from "../chat/promptMenu.jsx";
import { useEndpoint } from "../models/useEndpoint.jsx";
import { usePageContext } from "../page/usePageContext.js";
import { useThreads } from "../threads/useThreads.js";
import { TEXT_ACCEPT, useAttachments } from "../chat/useAttachments.js";

const DOCKED_HISTORY_QUERY = "(min-width: 560px)";
const IDLE_NEW_CHAT_MS = 10 * 60 * 1000;
const SettingsDrawer = lazy(() => import("../settings/settingsDrawer.jsx"));
import { DEFAULT_SETTINGS } from "../shared/constants.js";
import { loadPersistedState, savePersistedState } from "../shared/storage.js";
import { modelCapabilities } from "../models/providers.js";
import { threadTitle } from "../shared/extensionState.js";
import { useChatLoop } from "./useChatLoop.js";

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [customPrompts, setCustomPrompts] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const [isSlashMenu, setIsSlashMenu] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");
  const [modelExpanded, setModelExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("");
  const [composerFocus, setComposerFocus] = useState(0);
  const attachRef = useRef(null);
  const chatLoopRef = useRef(null);

  const closeMenu = useCallback(() => {
    setOpenMenu(null);
    setIsSlashMenu(false);
  }, []);
  const resetChatArtifacts = useCallback(() => {
    chatLoopRef.current?.resetChat();
    setOpenMenu(null);
    setIsSlashMenu(false);
  }, []);

  const ep = useEndpoint({ loaded, settings, onStatus: setStatus, closeMenu });
  const th = useThreads({ onResetChat: resetChatArtifacts, onStatus: setStatus });
  const { endpoint, active } = ep;
  const { threads, activeThreadId, messages } = th;

  const page = usePageContext({ settings, onStatus: setStatus });
  const { attachments, setAttachments, addFiles, removeAttachment } = useAttachments({
    active,
    onStatus: setStatus,
  });

  const caps = useMemo(
    () =>
      active
        ? modelCapabilities(active.model, active.provider.protocol, active.visionOverride)
        : { vision: false, pdf: false },
    [active],
  );
  const chat = useChatLoop({
    active,
    activeThreadId,
    attachments,
    loaded,
    messages,
    onClearInput: () => setInput(""),
    onRequireSettings: () => setSettingsOpen(true),
    onStatus: setStatus,
    page,
    setAttachments,
    settings,
    threadsApi: th,
  });

  useEffect(() => {
    chatLoopRef.current = chat;
  }, [chat]);

  const promptHistory = useMemo(
    () =>
      messages
        .filter((message) => message.role === "user")
        .map((message) => String(message.content ?? ""))
        .filter(Boolean),
    [messages],
  );
  const activeTitle = messages.length ? threadTitle(messages) : "New chat";

  useEffect(() => {
    if (settingsOpen || isHistoryOpen) {
      setOpenMenu(null);
      setIsSlashMenu(false);
    }
  }, [isHistoryOpen, settingsOpen]);

  // A panel left open for 10 idle minutes starts a fresh chat; the old one is
  // kept in history. Activity (a new message, typing) resets the clock.
  useEffect(() => {
    if (!loaded || chat.busy || !messages.length) return undefined;
    const timer = window.setTimeout(() => {
      th.startNewThread();
      setStatus("Idle for 10 minutes — started a new chat. The old one is in history.");
    }, IDLE_NEW_CHAT_MS);
    return () => window.clearTimeout(timer);
  }, [chat.busy, input, loaded, messages, th.startNewThread]);

  useEffect(() => {
    if (!openMenu) return undefined;
    const handleMenuKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setOpenMenu(null);
        setIsSlashMenu(false);
        if (isSlashMenu && input.startsWith("/")) setInput("");
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const menu = document.querySelector(".menu-anchor");
      if (!menu) return;
      const items = Array.from(menu.querySelectorAll("button:not(:disabled)"));
      if (!items.length) return;
      event.preventDefault();
      const currentIndex = items.indexOf(document.activeElement);
      if (currentIndex < 0) {
        items[event.key === "ArrowDown" ? 0 : items.length - 1].focus();
        return;
      }
      const offset = event.key === "ArrowDown" ? 1 : -1;
      items[(currentIndex + offset + items.length) % items.length].focus();
    };
    document.addEventListener("keydown", handleMenuKey, true);
    return () => document.removeEventListener("keydown", handleMenuKey, true);
  }, [input, isSlashMenu, openMenu]);

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


  const fillPromptInput = useCallback(
    (promptText) => {
      const selection = page.snapshot?.selection || "";
      const pageText = page.snapshot?.text || selection;
      setInput(String(promptText).split("{selection}").join(selection).split("{page}").join(pageText));
      setOpenMenu(null);
      setIsSlashMenu(false);
    },
    [page.snapshot],
  );

  const closeHistory = useCallback(() => setIsHistoryOpen(false), []);
  const closeHistoryWhenOverlay = () => {
    if (!window.matchMedia(DOCKED_HISTORY_QUERY).matches) setIsHistoryOpen(false);
  };

  const displayedMessages = chat.notice ? [...messages, chat.notice] : messages;

  return (
    <div className="shell">
      {isHistoryOpen && (
        <>
          <HistoryPanel
            activeThreadId={activeThreadId}
            onClose={closeHistory}
            onDelete={th.deleteThread}
            onExport={th.exportThread}
            onOpen={(threadId) => {
              th.openThread(threadId);
              closeHistoryWhenOverlay();
            }}
            onQueryChange={setHistoryQuery}
            query={historyQuery}
            threads={threads}
          />
          <button aria-label="Close history" className="history-scrim" onClick={closeHistory} type="button" />
        </>
      )}
      <div className="chat-col">
      <Header
        isHistoryOpen={isHistoryOpen}
        onNewChat={() => {
          setOpenMenu(null);
          th.startNewThread();
          closeHistoryWhenOverlay();
        }}
        onOpenSettings={() => {
          setOpenMenu(null);
          setSettingsOpen(true);
        }}
        onToggleHistory={() => {
          setOpenMenu(null);
          setIsHistoryOpen((current) => !current);
        }}
        onToggleTheme={() => {
          setOpenMenu(null);
          setSettings((current) => ({ ...current, theme: current.theme === "dark" ? "light" : "dark" }));
        }}
        title={activeTitle}
      />

      <MessageList
        actionCards={chat.actionCards}
        chunks={chat.chunks}
        messages={displayedMessages}
        onApplyAction={(id) => chat.resolveAction(id, true)}
        onCitation={chat.handleCitation}
        onEdit={(index) => {
          const target = messages[index];
          if (!target) return;
          th.editFromMessage(index);
          setInput(String(target.content ?? ""));
          setComposerFocus((current) => current + 1);
        }}
        onFork={(index) => th.forkThreadAt(index)}
        onRetry={() => {
          chat.retryLast();
          setComposerFocus((current) => current + 1);
        }}
        onSkipAction={(id) => chat.resolveAction(id, false)}
        onSuggestion={(suggestion) => {
          if (input.trim() || attachments.length) {
            const hint = "You have a draft — send it or clear it before using a suggestion.";
            setStatus(hint);
            window.setTimeout(() => setStatus((current) => (current === hint ? "" : current)), 4000);
            return;
          }
          chat.sendText(suggestion.prompt, suggestion.mode);
          setComposerFocus((current) => current + 1);
        }}
        hiddenThinkingModels={settings.hideThinkingModels}
        providerStatus={ep.providerSummary}
        streamingMessage={chat.streamingMessage}
      />

      <Composer
        active={active}
        busy={chat.busy}
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
            setOpenMenu("prompts");
            setIsSlashMenu(true);
          }
          if (openMenu === "model") setOpenMenu(null);
          if (openMenu === "prompts" && !value.startsWith("/")) {
            setOpenMenu(null);
            setIsSlashMenu(false);
          }
          setInput(value);
        }}
        onComposerFocus={() => {
          if (openMenu === "model") setOpenMenu(null);
        }}
        onStop={() => chat.stopStream()}
        onSubmit={() => chat.sendText(input)}
        onToggleMenu={(menu) => {
          if (menu === "prompts") setIsSlashMenu(false);
          setOpenMenu((current) => (current === menu ? null : menu));
        }}
        onToggleSafe={() => setSettings((current) => ({ ...current, safeMode: !current.safeMode }))}
        focusToken={composerFocus}
        openMenu={openMenu}
        promptHistory={promptHistory}
        promptMenu={
          <PromptMenu
            customPrompts={customPrompts}
            onSelect={fillPromptInput}
            canImage={caps.vision}
            canDoc={Boolean(active?.model)}
            docHint={caps.pdf ? "Text files and PDFs" : "Text files (PDFs need Claude / Gemini)"}
            query={isSlashMenu && input.startsWith("/") ? input.slice(1) : ""}
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

      </div>

      {settingsOpen && (
        <Suspense fallback={null}>
        <SettingsDrawer
          availableModels={ep.availableModels}
          customPrompts={customPrompts}
          endpoint={endpoint}
          endpointLoading={ep.endpointLoading}
          isVisionDetected={ep.isVisionDetected}
          endpointStatus={ep.endpointStatus}
          nanoStatus={ep.nanoStatus}
          onSelectAuto={ep.selectAutoModel}
          onSelectModel={ep.selectModel}
          onAddPrompt={(prompt) =>
            setCustomPrompts((current) => (current.includes(prompt) ? current : [...current, prompt]))
          }
          onClearHistory={th.clearAllThreads}
          onClose={() => setSettingsOpen(false)}
          onDeletePrompt={(index) => setCustomPrompts((current) => current.filter((_, itemIndex) => itemIndex !== index))}
          onDownloadNano={ep.downloadNano}
          onEndpointBlur={ep.commitEndpointField}
          onEndpointChange={ep.changeEndpointField}
          onModelProviderChange={ep.changeModelProvider}
          onRefreshModels={() => ep.refreshModels()}
          onSettingsChange={(field, value) => setSettings((current) => ({ ...current, [field]: value }))}
          settings={settings}
        />
        </Suspense>
      )}
    </div>
  );
}
