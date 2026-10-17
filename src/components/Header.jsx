import HistoryMenu from "./HistoryMenu.jsx";
import * as Icons from "./Icons.jsx";

export function Header({ openMenu, onToggleMenu, onNewChat, onToggleTheme, onOpenSettings, historyMenuProps }) {
  return (
    <header className="topbar">
      <span className="topbar-spacer" />
      <div className="top-actions">
        <button
          aria-label="Chat history"
          className="icon-btn"
          data-menu-toggle="history"
          onClick={() => onToggleMenu("history")}
          title="Chat history"
          type="button"
        >
          <Icons.History />
        </button>
        <button aria-label="New chat" className="icon-btn" onClick={onNewChat} title="New chat" type="button">
          <Icons.Plus />
        </button>
        <button aria-label="Toggle theme" className="icon-btn" onClick={onToggleTheme} title="Toggle theme" type="button">
          <Icons.Theme />
        </button>
        <button aria-label="Settings" className="icon-btn" onClick={onOpenSettings} title="Settings" type="button">
          <Icons.Settings />
        </button>
      </div>

      {openMenu === "history" && <HistoryMenu {...historyMenuProps} />}
    </header>
  );
}

export function SharingBar({ page, onToggleAttach, onPick, onUndo, onClearPicked }) {
  const selection = (page.snapshot?.selection || "").trim();
  const sharing = page.attachPage && page.pageReady;

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
          onClick={onPick}
          title="Pick element on page"
          type="button"
        >
          <Icons.Inspect size={16} />
        </button>
        <button aria-label="Undo page edit" className="icon-btn icon-btn-sm" onClick={onUndo} title="Undo page edit" type="button">
          <Icons.Undo size={16} />
        </button>
        <button
          aria-label={sharing ? "Stop sharing page" : "Share page"}
          className="icon-btn icon-btn-sm"
          onClick={onToggleAttach}
          title={sharing ? "Stop sharing page" : "Share page"}
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
