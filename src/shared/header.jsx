import * as Icons from "./icons.jsx";

export function Header({ title, isHistoryOpen, onToggleHistory, onNewChat, onToggleTheme, onOpenSettings }) {
  return (
    <header className="topbar">
      <div className="top-actions">
        <button
          aria-expanded={isHistoryOpen}
          aria-label="Chat history"
          className={`icon-btn ${isHistoryOpen ? "is-on" : ""}`}
          onClick={onToggleHistory}
          title="Chat history"
          type="button"
        >
          <Icons.History />
        </button>
        <button aria-label="New chat" className="icon-btn" onClick={onNewChat} title="New chat" type="button">
          <Icons.NewChat />
        </button>
      </div>
      <span className="topbar-title" title={title}>
        {title}
      </span>
      <div className="top-actions">
        <button aria-label="Toggle theme" className="icon-btn" onClick={onToggleTheme} title="Toggle theme" type="button">
          <Icons.Theme />
        </button>
        <button aria-label="Settings" className="icon-btn" onClick={onOpenSettings} title="Settings" type="button">
          <Icons.Settings />
        </button>
      </div>
    </header>
  );
}

export function SharingBar({ page, onToggleAttach, onPick, onUndo, onClearPicked }) {
  const selection = (page.snapshot?.selection || "").trim();
  const sharing = page.attachPage && page.pageReady;
  const hasPage = Boolean(page.tabId);
  const canActOnPage = hasPage && page.pageReady;
  const noPageHint = hasPage ? "Unavailable on this page" : "No page attached";

  return (
    <>
      <div className="sharing-bar">
        <span className="sharing-icon">
          <Icons.Globe size={13} />
        </span>
        <span className="page-title" title={page.snapshot?.url || page.pageUrl}>
          {sharing ? `Sharing “${page.pageTitle}”` : page.pageTitle}
        </span>
        <button
          aria-label="Pick element"
          className="icon-btn icon-btn-sm"
          disabled={!canActOnPage}
          onClick={onPick}
          title={canActOnPage ? "Pick element on page" : noPageHint}
          type="button"
        >
          <Icons.Target size={16} />
        </button>
        <button
          aria-label="Undo page edit"
          className="icon-btn icon-btn-sm"
          disabled={!canActOnPage}
          onClick={onUndo}
          title={canActOnPage ? "Undo page edit" : noPageHint}
          type="button"
        >
          <Icons.Undo size={16} />
        </button>
        <button
          aria-label={sharing ? "Stop sharing page" : "Share page"}
          className="icon-btn icon-btn-sm"
          disabled={!hasPage}
          onClick={onToggleAttach}
          title={hasPage ? (sharing ? "Stop sharing page" : "Share page") : "No page attached"}
          type="button"
        >
          {sharing ? <Icons.Close size={16} /> : <Icons.Check size={16} />}
        </button>
      </div>

      {selection && page.attachPage && (
        <div className="sel-bar">
          <span>Selection attached: {selection.length > 90 ? `${selection.slice(0, 90)}…` : selection}</span>
        </div>
      )}

      {page.picked && (
        <div className="picked-bar">
          <span>
            Target: {page.picked.selector}
            {page.picked.label ? ` — ${page.picked.label}` : ""}
          </span>
          <button aria-label="Clear picked element" className="icon-btn icon-btn-sm" onClick={onClearPicked} type="button">
            <Icons.Close size={15} />
          </button>
        </div>
      )}
    </>
  );
}
