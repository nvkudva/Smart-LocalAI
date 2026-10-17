import { memo } from "react";
import { stripAgentBlocks } from "../page/page-agent.js";
import * as Icons from "../shared/icons.jsx";
import Markdown from "./markdown.jsx";

function actionSummary(action) {
  return {
    title: action.action,
    target: action.selector || "page",
    payload: String(action.css || action.js || action.value || "").slice(0, 900),
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

export const Message = memo(function Message({ message, chunks, onCitation }) {
  if (message.role === "user") {
    return (
      <div className="msg user">
        <div className="bubble">{message.content}</div>
      </div>
    );
  }

  const visibleText = stripAgentBlocks(message.content) || message.content;
  return (
    <div className={`msg ai ${message.error ? "error" : ""}`}>
      <div className="ai-label">
        <span className="sparkle">
          <Icons.Sparkle size={14} />
        </span>
        <span>{message.modelName || "Free AI"}</span>
      </div>
      <div className="body">
        <Markdown chunks={chunks} onCitation={onCitation} text={visibleText} />
      </div>
      {!message.streaming && (
        <div className="msg-actions">
          <button className="mini-btn" onClick={() => navigator.clipboard.writeText(message.content)} type="button">
            Copy
          </button>
        </div>
      )}
    </div>
  );
});
