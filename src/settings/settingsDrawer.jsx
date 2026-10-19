import { useEffect } from "react";
import { NANO_LABELS } from "../shared/constants.js";
import AdvancedSection from "./advancedSection.jsx";
import { PROVIDER_TYPES, modelCapabilities, modelLabel, pickSmartModel } from "../models/providers.js";
import * as Icons from "../shared/icons.jsx";

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
  endpointStatus,
  endpointLoading,
  isVisionDetected,
  availableModels,
  customPrompts,
  onClose,
  onNanoChange,
  onDownloadNano,
  onEndpointChange,
  onEndpointTypeChange,
  onEndpointBlur,
  onRefreshModels,
  onSelectAuto,
  onSelectModel,
  onSettingsChange,
  onAddPrompt,
  onDeletePrompt,
  onClearHistory,
}) {
  const nanoEnabled = endpoint.useNano && nanoStatus === "available";
  const currentModel = endpoint.model || pickSmartModel(availableModels) || "";
  const protocol = PROVIDER_TYPES[endpoint.type]?.protocol || "openai";
  const autoVision = isVisionDetected || (currentModel ? modelCapabilities(currentModel, protocol).vision : false);
  const overrideVision = currentModel
    ? (endpoint.visionOverride || []).some((marked) => String(marked).toLowerCase() === currentModel.toLowerCase())
    : false;

  const toggleVisionOverride = (checked) => {
    if (!currentModel) return;
    const rest = (endpoint.visionOverride || []).filter(
      (marked) => String(marked).toLowerCase() !== currentModel.toLowerCase(),
    );
    onEndpointChange("visionOverride", checked ? [...rest, currentModel] : rest);
  };

  const thinkingKey = currentModel ? modelLabel(PROVIDER_TYPES[endpoint.type], currentModel) : "";
  const hiddenThinkingModels = settings.hideThinkingModels || [];
  const toggleShowThinking = (checked) => {
    const rest = hiddenThinkingModels.filter((key) => key !== thinkingKey);
    onSettingsChange("hideThinkingModels", checked ? rest : [...rest, thinkingKey]);
  };

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside className="settings">
      <div className="settings-head">
        <h2>Settings</h2>
        <button aria-label="Close settings" className="icon-btn" onClick={onClose} type="button">
          <Icons.Close />
        </button>
      </div>

      <section>
        <h3>Model</h3>
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
        {nanoEnabled ? (
          <p className="model-results">Endpoint paused while the built-in model is on. Untick it to edit the endpoint.</p>
        ) : (
        <div className="api-card">
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
            <div className="row model-row">
              <Field htmlFor="epModel" label="Model">
                <select
                  id="epModel"
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value) onSelectModel(value);
                    else onSelectAuto();
                  }}
                  value={endpoint.model || ""}
                >
                  <option value="">
                    Auto{availableModels.length ? `: ${pickSmartModel(availableModels)}` : ""}
                  </option>
                  {availableModels.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </Field>
              <button className="btn primary" disabled={endpointLoading} onClick={onRefreshModels} type="button">
                Refresh models
              </button>
            </div>
            <div className="model-results">{endpointStatus}</div>
            {currentModel && (
              <Checkbox
                checked={!hiddenThinkingModels.includes(thinkingKey)}
                label={`Show thinking for "${currentModel}"`}
                onChange={toggleShowThinking}
              />
            )}
            {currentModel && !autoVision && (
              <Checkbox
                checked={overrideVision}
                label={`"${currentModel}" reads images (enable Attach image)`}
                onChange={toggleVisionOverride}
              />
            )}
          </div>
        </div>
        )}
      </section>

      <AdvancedSection
        customPrompts={customPrompts}
        onAddPrompt={onAddPrompt}
        onClearHistory={onClearHistory}
        onDeletePrompt={onDeletePrompt}
        onSettingsChange={onSettingsChange}
        settings={settings}
      />
    </aside>
  );
}
