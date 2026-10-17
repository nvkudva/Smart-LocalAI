import { useState } from "react";
import { NANO_LABELS } from "../lib/constants.js";
import { PROVIDER_TYPES } from "../services/providers.js";
import * as Icons from "./Icons.jsx";

function Field({ label, htmlFor, children }) {
  return (
    <label className="field" htmlFor={htmlFor}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="check">
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      {label}
    </label>
  );
}

export default function SettingsDrawer({
  endpoint,
  settings,
  nanoStatus,
  endpointModels,
  endpointStatus,
  endpointLoading,
  customPrompts,
  onClose,
  onNanoChange,
  onDownloadNano,
  onEndpointChange,
  onEndpointTypeChange,
  onEndpointBlur,
  onModelChange,
  onRefreshModels,
  onSettingsChange,
  onAddPrompt,
  onDeletePrompt,
  onClearHistory,
}) {
  const [newPrompt, setNewPrompt] = useState("");
  const nanoEnabled = endpoint.useNano && nanoStatus === "available";
  const smartModel = endpointModels.length ? endpointModels[0] : "";
  const selectedModel = endpoint.model || endpoint.remembered[endpoint.type] || "";

  return (
    <aside className="settings">
      <div className="settings-head">
        <h2>Settings</h2>
        <button aria-label="Close settings" className="icon-btn" onClick={onClose} type="button">
          <Icons.Close />
        </button>
      </div>

      <section>
        <h3>Built-in model</h3>
        <div className="provider-row nano-row">
          <Checkbox
            checked={endpoint.useNano}
            label="Use Gemini Nano (Browser Built-in)"
            onChange={(checked) => onNanoChange(checked)}
          />
          <div className="row">
            <span className={`dot ${nanoStatus === "available" ? "dot-ok" : "dot-off"}`} />
            <span className="model-results">{NANO_LABELS[nanoStatus] || nanoStatus}</span>
            {nanoStatus === "downloadable" && (
              <button className="btn" onClick={onDownloadNano} type="button">
                Download model
              </button>
            )}
          </div>
        </div>
      </section>

      <section>
        <h3>Endpoint</h3>
        <div className={nanoEnabled ? "api-card disabled" : "api-card"} inert={nanoEnabled}>
          <div className="provider-row">
            <Field htmlFor="epType" label="API provider">
              <select id="epType" onChange={(event) => onEndpointTypeChange(event.target.value)} value={endpoint.type}>
                {Object.entries(PROVIDER_TYPES).map(([value, provider]) => (
                  <option key={value} value={value}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field htmlFor="epUrl" label="URL">
              <input
                id="epUrl"
                onBlur={(event) => onEndpointBlur("baseUrl", event.target.value)}
                onChange={(event) => onEndpointChange("baseUrl", event.target.value, false)}
                placeholder="https://example.com/v1"
                value={endpoint.baseUrl}
              />
            </Field>
            <Field htmlFor="epKey" label="API key">
              <input
                id="epKey"
                onBlur={(event) => onEndpointBlur("apiKey", event.target.value)}
                onChange={(event) => onEndpointChange("apiKey", event.target.value, false)}
                placeholder="sk-… (empty for local)"
                type="password"
                value={endpoint.apiKey}
              />
            </Field>
            <Field htmlFor="epModel" label="Model">
              <select id="epModel" onChange={(event) => onModelChange(event.target.value)} value={selectedModel}>
                <option value="">Smart pick{smartModel ? `: ${smartModel}` : ""}</option>
                {endpointModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </Field>
            <div className="row">
              <button className="btn primary" disabled={endpointLoading} onClick={onRefreshModels} type="button">
                Refresh models
              </button>
            </div>
            <div className="model-results">{endpointStatus}</div>
          </div>
        </div>
      </section>

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
              <div className="prompt-row" key={prompt}>
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
    </aside>
  );
}
