import { BUILTIN_PROMPTS } from "../lib/constants.js";
import * as Icons from "./Icons.jsx";

export default function PromptMenu({ customPrompts, canImage, canDoc, docHint, onSelect, onAttachImage, onAttachDoc }) {
  const prompts = [
    ...BUILTIN_PROMPTS,
    ...customPrompts.map((text) => ({ name: text.slice(0, 40), text, custom: true })),
  ];

  return (
    <div className="menu menu-up prompts-menu">
      {(canImage || canDoc) && (
        <>
          <div className="menu-section">Attach</div>
          {canImage && (
            <button className="menu-item" onClick={onAttachImage} type="button">
              <Icons.Image size={15} />
              <span>Attach image…</span>
            </button>
          )}
          {canDoc && (
            <button className="menu-item" onClick={onAttachDoc} title={docHint} type="button">
              <Icons.Doc size={15} />
              <span>Attach document…</span>
            </button>
          )}
          <div className="menu-section">Prompts</div>
        </>
      )}
      {prompts.map((prompt) => (
        <button className="menu-item" key={`${prompt.name}-${prompt.text}`} onClick={() => onSelect(prompt.text)} type="button">
          {prompt.custom && <Icons.Sparkle size={13} />}
          <span>{prompt.name}</span>
        </button>
      ))}
    </div>
  );
}
