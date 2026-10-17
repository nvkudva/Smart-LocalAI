import * as Icons from "./Icons.jsx";

export default function HistoryMenu({ threads, activeThreadId, query, onQueryChange, onOpen, onDelete, onExport }) {
  const normalizedQuery = query.trim().toLowerCase();
  const visibleThreads = threads.filter((thread) => {
    if (!normalizedQuery) return true;
    return (
      thread.title.toLowerCase().includes(normalizedQuery) ||
      (thread.messages || []).some((message) => message.content.toLowerCase().includes(normalizedQuery))
    );
  });

  return (
    <div className="menu history-menu">
      <input
        className="menu-search"
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search chats…"
        value={query}
      />
      <div>
        {visibleThreads.length === 0 ? (
          <div className="menu-empty">No chats yet.</div>
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
      <div className="row menu-foot">
        <button className="btn" onClick={() => onExport("md")} type="button">
          Export .md
        </button>
        <button className="btn" onClick={() => onExport("csv")} type="button">
          Export .csv
        </button>
      </div>
    </div>
  );
}
