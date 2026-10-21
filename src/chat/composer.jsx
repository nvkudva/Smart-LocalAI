import { useEffect, useRef } from "react";
import * as Icons from "../shared/icons.jsx";

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
  onComposerFocus,
  promptHistory = [],
  focusToken,
}) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const fileKindRef = useRef("image");
  const historyIndexRef = useRef(null);
  const draftRef = useRef("");

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (focusToken) textareaRef.current?.focus();
  }, [focusToken]);

  useEffect(() => {
    if (input === "") {
      historyIndexRef.current = null;
      draftRef.current = "";
    }
  }, [input]);

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

  const moveThroughHistory = (direction, textarea) => {
    if (openMenu || promptHistory.length === 0) return false;
    const currentIndex = historyIndexRef.current;

    if (direction === "up") {
      const caretAtStart = textarea.selectionStart === 0 && textarea.selectionEnd === 0;
      if (currentIndex === null) {
        if (textarea.value && !caretAtStart) return false;
        draftRef.current = textarea.value;
        historyIndexRef.current = promptHistory.length - 1;
      } else if (currentIndex > 0) {
        historyIndexRef.current -= 1;
      } else {
        return false;
      }
      onInputChange(promptHistory[historyIndexRef.current]);
      return true;
    }

    if (currentIndex === null) return false;
    if (currentIndex < promptHistory.length - 1) {
      historyIndexRef.current += 1;
      onInputChange(promptHistory[historyIndexRef.current]);
    } else {
      historyIndexRef.current = null;
      onInputChange(draftRef.current);
    }
    return true;
  };

  const submit = () => {
    onSubmit();
    historyIndexRef.current = null;
    draftRef.current = "";
    textareaRef.current?.focus();
  };

  return (
    <footer className="composer-wrap">
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {sharingBar}

        <textarea
          aria-label="Message input"
          onChange={(event) => {
            historyIndexRef.current = null;
            draftRef.current = "";
            onInputChange(event.target.value);
          }}
          onFocus={onComposerFocus}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
            if ((event.key === "ArrowUp" || event.key === "ArrowDown") && moveThroughHistory(event.key === "ArrowUp" ? "up" : "down", event.currentTarget)) {
              event.preventDefault();
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
              aria-expanded={openMenu === "prompts"}
              aria-haspopup="menu"
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
              aria-checked={!safe}
              aria-label="Auto-apply page edits"
              className="auto-switch"
              onClick={onToggleSafe}
              role="switch"
              title={safe ? "Page edits wait for your approval — turn on to auto-apply" : "Page edits apply automatically — turn off to approve each"}
              type="button"
            >
              <span className="auto-switch-track">
                <span className="auto-switch-knob" />
              </span>
              <span className="auto-switch-label">Auto-apply</span>
              <span className="auto-switch-label-short">Auto</span>
            </button>
          </div>

          <div className="composer-actions composer-actions-right">
            <button
              aria-expanded={openMenu === "model"}
              aria-haspopup="menu"
              className="pill-btn model-opener"
              data-menu-toggle="model"
              onClick={() => onToggleMenu("model")}
              title={active ? `${active.provider.name} · ${active.model}` : "Choose model"}
              type="button"
            >
              <span className="model-opener-label">{active ? active.model : "No model"}</span>
              <Icons.ChevronDown />
            </button>

            {busy ? (
              <button
                aria-label="Stop"
                className="send-btn stop"
                onClick={() => {
                  onStop();
                  textareaRef.current?.focus();
                }}
                title="Stop"
                type="button"
              >
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
