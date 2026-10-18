import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Composer from "../chat/composer.jsx";
import { Header, SharingBar } from "../shared/header.jsx";
import MessageList from "../chat/messageList.jsx";
import ModelMenu from "../models/modelMenu.jsx";
import PromptMenu from "../chat/promptMenu.jsx";
import { useEndpoint } from "../models/useEndpoint.jsx";
import { usePageContext } from "../page/usePageContext.js";
import { useThreads } from "../threads/useThreads.js";
import { TEXT_ACCEPT, useAttachments } from "../chat/useAttachments.js";

const SettingsDrawer = lazy(() => import("../settings/settingsDrawer.jsx"));
import { DEFAULT_SETTINGS } from "../shared/constants.js";
import { loadPersistedState, savePersistedState } from "../shared/storage.js";
import { modelCapabilities } from "../models/providers.js";
import { useChatLoop } from "./useChatLoop.js";

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [customPrompts, setCustomPrompts] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");
  const [modelExpanded, setModelExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("");
  const attachRef = useRef(null);
  const chatLoopRef = useRef(null);

  const closeMenu = useCallback(() => setOpenMenu(null), []);
  const resetChatArtifacts = useCallback(() => {
    chatLoopRef.current?.resetChat();
    setOpenMenu(null);
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
    () => (active ? modelCapabilities(active.model, active.provider.protocol) : { vision: false, pdf: false }),
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
    },
    [page.snapshot],
  );

  const displayedMessages = chat.notice ? [...messages, chat.notice] : messages;

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
        actionCards={chat.actionCards}
        chunks={chat.chunks}
        messages={displayedMessages}
        onApplyAction={(id) => chat.resolveAction(id, true)}
        onCitation={chat.handleCitation}
        onFork={(index) => th.forkThreadAt(index)}
        onSkipAction={(id) => chat.resolveAction(id, false)}
        onSuggestion={(suggestion) => chat.sendText(suggestion.prompt, suggestion.mode)}
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
          }
          setInput(value);
        }}
        onStop={() => chat.stopStream()}
        onSubmit={() => chat.sendText(input)}
        onToggleMenu={(menu) => setOpenMenu((current) => (current === menu ? null : menu))}
        onToggleSafe={() => setSettings((current) => ({ ...current, safeMode: !current.safeMode }))}
        openMenu={openMenu}
        promptMenu={
          <PromptMenu
            customPrompts={customPrompts}
            onSelect={fillPromptInput}
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
