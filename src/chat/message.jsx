import { memo } from "react";
import { stripAgentBlocks } from "../page/pageAgent.js";
import { formatTime } from "../shared/extensionState.js";
import * as Icons from "../shared/icons.jsx";
import Markdown from "./markdown.jsx";

function actionSummary(action) {
  const safe = action && typeof action === "object" ? action : {};
  return {
    title: safe.action || "unknown",
    target: safe.selector || "page",
    payload: String(safe.css || safe.js || safe.value || "").slice(0, 900),
  };
}

export function ActionCard({ card, onApply, onSkip }) {
  const summary = actionSummary(card.action);
  const pending = card.state === "pending";
  return (
    <article className="action-card">
      <h4>Page action · {summary.title}</h4>
      <div className="target">{summary.target}</div>
      {summary.payload && <pre>{summary.payload}</pre>}
      <div className="row">
        <button className="btn primary" disabled={!pending} onClick={() => onApply(card.id)} type="button">
          Apply
        </button>
        <button className="btn" disabled={!pending} onClick={() => onSkip(card.id)} type="button">
          Skip
        </button>
      </div>
      {card.result && <div className={`result ${card.ok ? "ok" : "fail"}`}>{card.result}</div>}
    </article>
  );
}

function copyText(event, text) {
  const button = event.currentTarget;
  const original = button.innerHTML;
  const done = (label) => {
    button.textContent = label;
    window.setTimeout(() => {
      button.innerHTML = original;
    }, 1200);
  };
  navigator.clipboard
    ?.writeText(String(text ?? ""))
    .then(() => done("Copied"))
    .catch(() => done("Copy failed"));
  if (!navigator.clipboard) done("Copy failed");
}

function Meta({ message, index, onFork, children }) {
  const stamp = formatTime(message.createdAt);
  return (
    <div className="msg-actions">
      {stamp && (
        <span className="msg-time" title={new Date(message.createdAt).toLocaleString()}>
          {stamp}
        </span>
      )}
      {children}
      <button
        aria-label="Start new thread from here"
        className="mini-btn mini-icon"
        onClick={() => onFork?.(index)}
        title="Start new thread from here"
        type="button"
      >
        <Icons.Branch size={13} />
      </button>
    </div>
  );
}

export const Message = memo(function Message({ message, chunks, index, onCitation, onFork }) {
  if (message.role === "user") {
    return (
      <div className="msg user">
        <div className="bubble">{String(message.content ?? "")}</div>
        <Meta index={index} message={message} onFork={onFork} />
      </div>
    );
  }

  const sourceText = String(message.content ?? "");
  const visibleText = stripAgentBlocks(sourceText) || sourceText;
  return (
    <div className={`msg ai ${message.error ? "error" : ""}`}>
      <div className="ai-label">
        <span className="sparkle">
          <Icons.Sparkle size={14} />
        </span>
        <span>{message.modelName || "Smart LocalAI"}</span>
      </div>
      <div className="body">
        <Markdown chunks={chunks} onCitation={onCitation} text={visibleText} />
      </div>
      {!message.streaming && (
        <Meta index={index} message={message} onFork={onFork}>
          {message.tps ? <span className="msg-tps" title="Tokens per second">~{message.tps} tok/s</span> : null}
          <button
            aria-label="Copy message"
            className="mini-btn mini-icon"
            onClick={(event) => copyText(event, message.content)}
            title="Copy message"
            type="button"
          >
            <Icons.Copy size={13} />
          </button>
        </Meta>
      )}
    </div>
  );
});
