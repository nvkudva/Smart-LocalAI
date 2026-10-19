import { useEffect, useRef } from "react";
import * as Icons from "../shared/icons.jsx";

function shortModelLabel(active) {
  if (!active) return "No model";
  const name = String(active.model || "");
  return name.length > 11 ? `${name.slice(0, 10)}…` : name;
}

export default function Composer({
  input,
  settings,
  status,
  busy,
  active,
  openMenu,
  sharingBar,
  modelMenu,
  promptMenu,
  attachments,
  attachAccepts,
  attachRef,
  onInputChange,
  onFilesChosen,
  onRemoveAttachment,
  onSubmit,
  onStop,
  onToggleMenu,
  onToggleSafe,
}) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const fileKindRef = useRef("image");

  useEffect(() => {
    if (!attachRef) return;
    attachRef.current = (kind) => {
      fileKindRef.current = kind;
      const picker = fileInputRef.current;
      if (!picker) return;
      picker.accept = attachAccepts?.[kind] || "";
      picker.click();
    };
  }, [attachRef, attachAccepts]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
  }, [input, attachments?.length, status]);

  const safe = settings.safeMode;

  return (
    <footer className="composer-wrap">
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        {sharingBar}

        <textarea
          aria-label="Message input"
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Type / to use prompts, or ask anything…"
          ref={textareaRef}
          rows="2"
          value={input}
        />

        {(attachments?.length > 0) && (
          <div className="attach-chips">
            {attachments.map((file) => (
              <span className="attach-chip" key={file.id} title={file.name}>
                {file.kind === "image" ? <img alt="" src={file.dataUrl} /> : <Icons.Doc size={14} />}
                <span className="attach-name">{file.name}</span>
                <button
                  aria-label={`Remove ${file.name}`}
                  className="attach-remove"
                  onClick={() => onRemoveAttachment(file.id)}
                  type="button"
                >
                  <Icons.Close size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          hidden
          onChange={(event) => {
            onFilesChosen(event.target.files, fileKindRef.current);
            event.target.value = "";
          }}
          ref={fileInputRef}
          type="file"
        />

        {status && <div className="status-line">{status}</div>}

        <div className="composer-row">
          <div className="composer-actions">
            <button
              aria-label="Prompt library"
              className="icon-btn composer-icon"
              data-menu-toggle="prompts"
              onClick={() => onToggleMenu("prompts")}
              title="Prompt library (/)"
              type="button"
            >
              <Icons.Plus />
            </button>

            <button
              aria-label={safe ? "Permissions: approve page edits" : "Permissions: auto-apply page edits"}
              className={`icon-btn composer-icon ${safe ? "is-warn" : "is-on"}`}
              onClick={onToggleSafe}
              title={safe ? "Safe: approve edits — click for auto-apply" : "Auto-apply edits — click for safe approve"}
              type="button"
            >
              {safe ? <Icons.ShieldOff /> : <Icons.Shield />}
            </button>
          </div>

          <div className="composer-actions composer-actions-right">
            <button
              className="pill-btn model-opener"
              data-menu-toggle="model"
              onClick={() => onToggleMenu("model")}
              title={active ? `${active.provider.name} · ${active.model}` : "Choose model"}
              type="button"
            >
              <span className="model-opener-label">{shortModelLabel(active)}</span>
              <Icons.ChevronDown />
            </button>

            {busy ? (
              <button aria-label="Stop" className="send-btn stop" onClick={onStop} title="Stop" type="button">
                <Icons.Stop />
              </button>
            ) : (
              <button aria-label="Send" className="send-btn" disabled={!input.trim() && !(attachments?.length > 0)} title="Send" type="submit">
                <Icons.Send size={17} />
              </button>
            )}
          </div>
        </div>

        {openMenu === "model" && <div className="menu-anchor menu-anchor-model">{modelMenu}</div>}
        {openMenu === "prompts" && <div className="menu-anchor menu-anchor-left">{promptMenu}</div>}
      </form>
    </footer>
  );
}
