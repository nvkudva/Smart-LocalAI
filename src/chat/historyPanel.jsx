import { useEffect } from "react";
import * as Icons from "../shared/icons.jsx";

export default function HistoryPanel({
  threads,
  activeThreadId,
  query,
  onQueryChange,
  onOpen,
  onDelete,
  onExport,
  onClose,
}) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const visibleThreads = (threads || []).filter((thread) => {
    if (!normalizedQuery) return true;
    return (
      String(thread.title ?? "").toLowerCase().includes(normalizedQuery) ||
      (thread.messages || []).some((message) => String(message.content ?? "").toLowerCase().includes(normalizedQuery))
    );
  });

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <aside aria-label="Chat history" className="history-panel">
      <div className="history-head">
        <h2>Chats</h2>
        <button aria-label="Close history" className="icon-btn icon-btn-sm" onClick={onClose} type="button">
          <Icons.Close size={16} />
        </button>
      </div>
      <input
        aria-label="Search chats"
        className="history-search"
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search chats…"
        value={query}
      />
      <div className="history-list">
        {visibleThreads.length === 0 ? (
          <div className="menu-empty">{normalizedQuery ? "No matching chats." : "No chats yet."}</div>
        ) : (
          visibleThreads.slice(0, 30).map((thread) => (
            <div className={`hist-item ${thread.id === activeThreadId ? "active" : ""}`} key={thread.id}>
              <button className="hist-open" onClick={() => onOpen(thread.id)} type="button">
                <span>{thread.title}</span>
                <small>{new Date(thread.updated).toLocaleDateString()}</small>
              </button>
              <button
                aria-label={`Delete ${thread.title}`}
                className="hist-del"
                onClick={() => onDelete(thread.id)}
                title="Delete chat"
                type="button"
              >
                <Icons.Trash />
              </button>
            </div>
          ))
        )}
      </div>
      <div className="row history-foot">
        <button className="btn" onClick={() => onExport("md")} type="button">
          Export .md
        </button>
        <button className="btn" onClick={() => onExport("csv")} type="button">
          Export .csv
        </button>
      </div>
    </aside>
  );
}
