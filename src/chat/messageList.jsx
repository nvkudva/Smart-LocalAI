import { useLayoutEffect, useRef, useState } from "react";
import { SUGGESTIONS } from "../shared/constants.js";
import * as Icons from "../shared/icons.jsx";
import { ActionCard, Message } from "./message.jsx";

const SUGGEST_ICON = {
  hide: Icons.EyeOff,
  moon: Icons.Theme,
  notes: Icons.Notes,
  search: Icons.Search,
  table: Icons.Table,
  type: Icons.TypeScale,
};

export function EmptyState({ providerStatus, onSuggestion }) {
  return (
    <section className="empty">
      <div className="hero-card">
        <div className="hero-head">
          <span className="hero-mark">
            <Icons.Logo size={26} />
          </span>
          <span className="hero-tag">Local-first · runs on your machine</span>
        </div>
        <h1 className="greeting">Hello there</h1>
        <p className="sub">
          Chat, summarize, or tell me to restyle and edit this page. Local models first — LM Studio and Ollama are detected
          automatically.
        </p>
        <div className="provider-status">{providerStatus}</div>
      </div>

      <div className="chips">
        {SUGGESTIONS.map((suggestion) => {
          const Icon = SUGGEST_ICON[suggestion.icon] || Icons.Sparkle;
          return (
            <button
              className="suggest"
              key={suggestion.label}
              onClick={() => onSuggestion(suggestion)}
              type="button"
            >
              <span className="suggest-icon">
                <Icon size={15} />
              </span>
              <span className="suggest-label">{suggestion.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function MessageList({
  messages,
  streamingMessage,
  actionCards,
  chunks,
  providerStatus,
  hiddenThinkingModels,
  onCitation,
  onFork,
  onEdit,
  onRetry,
  onSuggestion,
  onApplyAction,
  onSkipAction,
}) {
  const showEmpty = messages.length === 0 && !streamingMessage && actionCards.length === 0;
  const mainRef = useRef(null);
  const followBottomRef = useRef(true);
  const tailRef = useRef({ headKey: "", lastMessageKey: "" });
  const [showJump, setShowJump] = useState(false);

  const firstMessage = messages[0];
  const lastMessage = messages[messages.length - 1];
  const headKey = firstMessage?.id || "";
  const lastMessageKey = lastMessage?.id || (lastMessage ? `${lastMessage.role}:${messages.length}` : "");

  useLayoutEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const previousTail = tailRef.current;
    const conversationChanged = previousTail.headKey !== headKey;
    const newUserMessage = lastMessage?.role === "user" && previousTail.lastMessageKey !== lastMessageKey;
    if (conversationChanged || newUserMessage) followBottomRef.current = true;
    tailRef.current = { headKey, lastMessageKey };
    if (followBottomRef.current) {
      main.scrollTop = main.scrollHeight;
      setShowJump(false);
    }
  });

  const handleScroll = () => {
    const main = mainRef.current;
    if (!main) return;
    const nearBottom = main.scrollHeight - main.scrollTop - main.clientHeight < 120;
    followBottomRef.current = nearBottom;
    setShowJump(!nearBottom);
  };

  const jumpToLatest = () => {
    const main = mainRef.current;
    if (!main) return;
    followBottomRef.current = true;
    setShowJump(false);
    main.scrollTo({ top: main.scrollHeight, behavior: "smooth" });
  };

  return (
    <div className="messages-wrap">
      <main
        aria-busy={Boolean(streamingMessage)}
        aria-live="off"
        className="messages"
        onScroll={handleScroll}
        ref={mainRef}
        role="log"
      >
        {showEmpty && <EmptyState onSuggestion={onSuggestion} providerStatus={providerStatus} />}
        <div>
          {messages.map((message, index) => (
            <Message
              canRetry={index === messages.length - 1 && message.role === "assistant" && !message.error}
              chunks={message.chunks ?? chunks}
              index={index}
              isThinkingHidden={hiddenThinkingModels.includes(message.modelName)}
              key={message.id || `${message.role}-${String(message.content ?? "").slice(0, 48)}`}
              message={message}
              onCitation={onCitation}
              onEdit={onEdit}
              onFork={onFork}
              onRetry={onRetry}
            />
          ))}
          {streamingMessage && <Message
              chunks={chunks}
              isThinkingHidden={hiddenThinkingModels.includes(streamingMessage.modelName)}
              message={streamingMessage}
              onCitation={onCitation}
          />}
          {actionCards.map((card) => (
            <ActionCard card={card} key={card.id} onApply={onApplyAction} onSkip={onSkipAction} />
          ))}
        </div>
      </main>
      {showJump && (
        <button className="jump-latest" onClick={jumpToLatest} type="button">
          <Icons.ChevronDown size={14} />
          Jump to latest
        </button>
      )}
      <div aria-live="polite" className="sr-only" role="status">
        {streamingMessage ? "Assistant is responding" : ""}
      </div>
    </div>
  );
}
