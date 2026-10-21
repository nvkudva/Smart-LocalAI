import { BUILTIN_PROMPTS } from "../shared/constants.js";
import * as Icons from "../shared/icons.jsx";

export default function PromptMenu({ customPrompts, canImage, canDoc, docHint, onSelect, onAttachImage, onAttachDoc, query = "" }) {
  const prompts = [
    ...BUILTIN_PROMPTS,
    ...customPrompts.map((text) => ({ name: text.slice(0, 40), text, custom: true })),
  ];
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const visiblePrompts = normalizedQuery
    ? prompts.filter(
        (prompt) =>
          prompt.name.toLowerCase().includes(normalizedQuery) || prompt.text.toLowerCase().includes(normalizedQuery),
      )
    : prompts;

  return (
    <div aria-label="Prompt library" className="menu menu-up prompts-menu" role="menu">
      {!normalizedQuery && (canImage || canDoc) && (
        <>
          <div className="menu-section">Attach</div>
          {canImage && (
            <button className="menu-item" onClick={onAttachImage} role="menuitem" type="button">
              <Icons.Image size={15} />
              <span>Attach image…</span>
            </button>
          )}
          {canDoc && (
            <button className="menu-item" onClick={onAttachDoc} role="menuitem" title={docHint} type="button">
              <Icons.Doc size={15} />
              <span>Attach document…</span>
            </button>
          )}
          <div className="menu-section">Prompts</div>
        </>
      )}
      {visiblePrompts.length === 0 ? (
        <div className="menu-empty">No prompts match.</div>
      ) : (
        visiblePrompts.map((prompt, index) => (
          <button
            className="menu-item"
            key={`${index}-${prompt.name}`}
            onClick={() => onSelect(prompt.text)}
            role="menuitem"
            type="button"
          >
            {prompt.custom && <Icons.Sparkle size={13} />}
            <span>{prompt.name}</span>
          </button>
        ))
      )}
    </div>
  );
}
