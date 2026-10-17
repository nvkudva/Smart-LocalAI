import { useState } from "react";
import * as Icons from "../shared/icons.jsx";

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="check">
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      {label}
    </label>
  );
}

/**
 * Advanced settings: system prompt, agent behavior, saved prompts, and history reset.
 */
export default function AdvancedSection({
  settings,
  customPrompts,
  onSettingsChange,
  onAddPrompt,
  onDeletePrompt,
  onClearHistory,
}) {
  const [newPrompt, setNewPrompt] = useState("");

  return (
    <details className="advanced">
      <summary>Advanced</summary>
      <section>
        <h3>System prompt</h3>
        <label className="field" htmlFor="systemPrompt">
          <span>Sent with every new chat. Leave empty for default.</span>
          <textarea
            id="systemPrompt"
            onChange={(event) => onSettingsChange("systemPrompt", event.target.value)}
            placeholder="e.g. Answer in short bullet points. Always cite the page."
            rows="4"
            value={settings.systemPrompt || ""}
          />
        </label>
      </section>

      <section>
        <h3>Agent</h3>
        <Checkbox
          checked={settings.safeMode}
          label="Require approval before page edits (Safe mode)"
          onChange={(checked) => onSettingsChange("safeMode", checked)}
        />
        <Checkbox
          checked={settings.includePage}
          label="Include page context with messages"
          onChange={(checked) => onSettingsChange("includePage", checked)}
        />
        <Checkbox
          checked={settings.smartModel}
          label="Smart model selection"
          onChange={(checked) => onSettingsChange("smartModel", checked)}
        />
        <Checkbox
          checked={settings.autoTldr}
          label="Auto TL;DR when a new page opens"
          onChange={(checked) => onSettingsChange("autoTldr", checked)}
        />
      </section>

      <section>
        <h3>My prompts</h3>
        <div className="row">
          <input
            className="prompt-input"
            onChange={(event) => setNewPrompt(event.target.value)}
            placeholder="New prompt, use {page} for page text"
            value={newPrompt}
          />
          <button
            className="btn"
            onClick={() => {
              if (!newPrompt.trim()) return;
              onAddPrompt(newPrompt.trim());
              setNewPrompt("");
            }}
            type="button"
          >
            Add
          </button>
        </div>
        <div>
          {customPrompts.length === 0 ? (
            <div className="menu-empty">None yet.</div>
          ) : (
            customPrompts.map((prompt, index) => (
              <div className="prompt-row" key={`${index}-${String(prompt).slice(0, 40)}`}>
                <span>{prompt}</span>
                <button aria-label="Delete prompt" className="hist-del" onClick={() => onDeletePrompt(index)} type="button">
                  <Icons.Trash />
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <button className="btn danger" onClick={onClearHistory} type="button">
          Clear chat history
        </button>
      </section>
    </details>
  );
}
