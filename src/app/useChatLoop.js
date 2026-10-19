import { useCallback, useEffect, useRef, useState } from "react";
import {
  SYSTEM_AGENT,
  SYSTEM_CHAT,
  SYSTEM_NANO,
  THINKING_EFFORT,
  THINKING_HINTS,
} from "../shared/constants.js";
import { isPageActionIntent } from "../page/intent.js";
import { createThreadId, tokensPerSecond } from "../shared/extensionState.js";
import { buildPageContext } from "../page/pageContext.js";
import * as storage from "../shared/storage.js";
import * as PageAgent from "../page/pageAgent.js";
import { modelCapabilities, modelLabel, userMessageWithAttachments } from "../models/providers.js";
import * as thinking from "../models/thinking.js";
import { streamChat } from "../models/streamTransports.js";

/**
 * Own the sidebar send/stream/agent-action loop and its transient UI state.
 */
export function useChatLoop({
  active,
  activeThreadId,
  attachments,
  loaded,
  messages,
  onClearInput,
  onRequireSettings,
  onStatus,
  page,
  setAttachments,
  settings,
  threadsApi,
}) {
  const [busy, setBusy] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState(null);
  const [notice, setNotice] = useState(null);
  const [actionCards, setActionCards] = useState([]);
  const [chunks, setChunks] = useState([]);

  const abortRef = useRef(null);
  const isDiscardingRef = useRef(false);
  const actionResolversRef = useRef(new Map());
  const lastTldrRef = useRef("");
  const sendTextRef = useRef(null);
  const streamFlushRef = useRef(0);
  const streamBufferRef = useRef("");

  const cancelPendingActions = useCallback(() => {
    for (const resolve of actionResolversRef.current.values()) resolve(false);
    actionResolversRef.current.clear();
  }, []);

  const resetChat = useCallback(() => {
    isDiscardingRef.current = true;
    abortRef.current?.abort();
    cancelPendingActions();
    setActionCards([]);
    setStreamingMessage(null);
    setNotice(null);
    setChunks([]);
  }, [cancelPendingActions]);

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
      onStatus(`Scrolling to citation [${index}]…`);
      try {
        const result = await PageAgent.scrollToChunk(page.tabId, text);
        onStatus(result.ok ? `Citation [${index}] shown on page.` : result.message);
      } catch (error) {
        onStatus(`Citation scroll failed: ${error.message}`);
      }
    },
    [chunks, onStatus, page.tabId],
  );

  const sendText = useCallback(
    async (rawText, mode) => {
      const text = String(rawText || "").trim();
      if ((!text && !attachments.length) || busy) return;
      if (!active?.model) {
        setNotice({
          id: "notice-no-model",
          role: "assistant",
          content: "No model available. Open Settings, pick a provider, enter the API key if needed, and press Refresh.",
          modelName: "Smart LocalAI",
          error: true,
        });
        onRequireSettings();
        return;
      }

      if (
        attachments.some((file) => file.kind === "image") &&
        !modelCapabilities(active.model, active.provider.protocol, active.visionOverride).vision
      ) {
        onStatus("This model can't read images — remove them or switch to a vision model.");
        return;
      }
      let outgoing = null;
      let suffix = "";
      if (attachments.length) {
        const built = userMessageWithAttachments(text, attachments, active.provider.protocol);
        if (built.error) {
          onStatus(built.error);
          return;
        }
        outgoing = built.message;
        suffix = built.suffix;
      }
      const snapshot = settings.includePage && page.attachPage ? await page.refreshPage() : page.snapshot;
      const context = buildPageContext(snapshot, active.provider, page.picked?.selector || "");
      setChunks(context.chunks);
      if (!activeThreadId) threadsApi.setActiveThreadId(createThreadId());
      const userMessage = { id: createThreadId(), role: "user", content: text + suffix, createdAt: Date.now() };
      const requestHistory = [...messages, userMessage];
      threadsApi.setMessages(requestHistory);
      setNotice(null);
      setActionCards([]);
      isDiscardingRef.current = false;
      onClearInput();
      setAttachments([]);
      setBusy(true);
      const abort = new AbortController();
      abortRef.current = abort;

      const agentIntent = mode === "agent" ? true : mode === "chat" ? false : isPageActionIntent(text);
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
      const recentHistory = requestHistory.slice(-12);
      const firstUserIndex = recentHistory.findIndex((message) => message.role === "user");
      const alignedHistory = recentHistory
        .slice(Math.max(firstUserIndex, 0))
        .map((message) =>
          message.role === "assistant" ? { ...message, content: thinking.stripThinking(message.content) } : message,
        );
      let requestMessages = [{ role: "system", content: system }, ...alignedHistory];
      if (outgoing) requestMessages[requestMessages.length - 1] = outgoing;
      let finalText = "";
      let previousSignature = "";
      const startedAt = performance.now();

      try {
        for (let iteration = 0; iteration < 5; iteration += 1) {
          const modelName = modelLabel(active.provider, active.model);
          streamBufferRef.current = "";
          streamFlushRef.current = 0;
          setStreamingMessage({ role: "assistant", content: "", modelName, streaming: true });
          onStatus(modelName + (iteration ? ` · step ${iteration + 1}` : ""));
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
          const answer = thinking.stripThinking(full);
          const actions = agentIntent ? PageAgent.parseAgentActions(answer) : [];
          if (!actions.length) break;
          const signature = JSON.stringify(actions);
          if (signature === previousSignature) break;
          previousSignature = signature;

          const results = [];
          for (const action of actions.slice(0, 6)) {
            if (abort.signal.aborted) break;
            results.push(await runAction(action));
          }
          if (abort.signal.aborted) break;
          const refreshedSnapshot = await page.refreshPage();
          requestMessages = [
            ...requestMessages,
            { role: "assistant", content: answer },
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
      } catch (error) {
        if (error.name === "AbortError") {
          finalText = streamBufferRef.current || finalText;
        } else {
          setNotice({
            id: "notice-error",
            role: "assistant",
            content: `Error: ${error.message}\n\nCheck endpoint, API key, and that the local server is running.`,
            modelName: active.provider.name,
            error: true,
          });
        }
      } finally {
        if (finalText && !isDiscardingRef.current) {
          const visibleText = PageAgent.stripAgentBlocks(finalText) || finalText;
          threadsApi.setMessages((current) => [
            ...current,
            {
              id: createThreadId(),
              role: "assistant",
              content: visibleText,
              modelName: modelLabel(active.provider, active.model),
              chunks: context.chunks,
              createdAt: Date.now(),
              tps: tokensPerSecond(visibleText.length, performance.now() - startedAt),
            },
          ]);
        }
        setStreamingMessage(null);
        setBusy(false);
        abortRef.current = null;
        onStatus("");
      }
    },
    [
      active,
      activeThreadId,
      attachments,
      busy,
      messages,
      onClearInput,
      onRequireSettings,
      onStatus,
      page,
      runAction,
      setAttachments,
      settings.includePage,
      settings.systemPrompt,
      settings.thinkingLevel,
      threadsApi,
    ],
  );
  sendTextRef.current = sendText;

  useEffect(() => {
    if (!loaded) return undefined;
    const runPendingPrompt = () =>
      storage.takePendingPrompt()
        .then((prompt) => {
          if (prompt) sendTextRef.current?.(prompt, "chat");
        })
        .catch(() => {});
    runPendingPrompt();
    return storage.onPendingPrompt(runPendingPrompt);
  }, [loaded]);

  useEffect(() => {
    if (!loaded || !settings.autoTldr || !active || messages.length || busy || !page.snapshot) return;
    if (lastTldrRef.current === page.snapshot.url) return;
    lastTldrRef.current = page.snapshot.url;
    sendTextRef.current?.("Give a 3-line TL;DR of this page.", "chat");
  }, [active, busy, loaded, messages.length, page.snapshot, settings.autoTldr]);

  return {
    actionCards,
    busy,
    chunks,
    handleCitation,
    notice,
    resetChat,
    resolveAction,
    sendText,
    stopStream: () => {
      abortRef.current?.abort();
      cancelPendingActions();
    },
    streamingMessage,
  };
}
