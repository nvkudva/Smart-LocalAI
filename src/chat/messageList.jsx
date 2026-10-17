import { useEffect, useRef } from "react";
import { SUGGESTIONS } from "../shared/constants.js";
import * as Icons from "../shared/icons.jsx";
import { ActionCard, Message } from "./message.jsx";

export function EmptyState({ providerStatus, onSuggestion }) {
  return (
    <section className="empty">
      <div className="sparkle-big">
        <Icons.Sparkle size={28} />
      </div>
      <h1 className="greeting">Hello, there</h1>
      <p className="sub">
        Chat, summarize, or tell me to restyle and edit this page. Local models first — LM Studio and Ollama are detected
        automatically.
      </p>
      <div className="provider-status">{providerStatus}</div>
      <div className="chips">
        {SUGGESTIONS.map((suggestion) => (
          <button
            className="suggest"
            key={suggestion.label}
            onClick={() => onSuggestion(suggestion)}
            type="button"
          >
            {suggestion.label}
          </button>
        ))}
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
  onCitation,
  onSuggestion,
  onApplyAction,
  onSkipAction,
}) {
  const showEmpty = messages.length === 0 && !streamingMessage && actionCards.length === 0;
  const mainRef = useRef(null);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const nearBottom = main.scrollHeight - main.scrollTop - main.clientHeight < 120;
    if (nearBottom) main.scrollTop = main.scrollHeight;
  });

  return (
    <main className="messages" ref={mainRef}>
      {showEmpty && <EmptyState onSuggestion={onSuggestion} providerStatus={providerStatus} />}
      <div>
        {messages.map((message) => (
          <Message chunks={message.chunks ?? chunks} key={message.id || `${message.role}-${String(message.content ?? "").slice(0, 48)}`} message={message} onCitation={onCitation} />
        ))}
        {streamingMessage && <Message chunks={chunks} message={streamingMessage} onCitation={onCitation} />}
        {actionCards.map((card) => (
          <ActionCard card={card} key={card.id} onApply={onApplyAction} onSkip={onSkipAction} />
        ))}
      </div>
    </main>
  );
}
