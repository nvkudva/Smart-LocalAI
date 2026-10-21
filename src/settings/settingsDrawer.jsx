import { useEffect } from "react";
import { NANO_LABELS } from "../shared/constants.js";
import AdvancedSection from "./advancedSection.jsx";
import { PROVIDER_TYPES, modelCapabilities, modelLabel, pickSmartModel } from "../models/providers.js";
import * as Icons from "../shared/icons.jsx";

function Field({ label, htmlFor, children, hint }) {
  return (
    <label className="field" htmlFor={htmlFor}>
      <span className="field-head">
        <span>
          {label}
          {hint ? `: ${hint}` : null}
        </span>
      </span>
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
  onDownloadNano,
  onEndpointChange,
  onModelProviderChange,
  onEndpointBlur,
  onRefreshModels,
  onSelectAuto,
  onSelectModel,
  onSettingsChange,
  onAddPrompt,
  onDeletePrompt,
  onClearHistory,
}) {
  const nanoSelected = endpoint.useNano;
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
        <div className="provider-row model-provider">
          <Field htmlFor="epType" label="Model provider">
            <select
              id="epType"
              onChange={(event) => onModelProviderChange(event.target.value)}
              value={nanoSelected ? "nano" : endpoint.type}
            >
              <option value="nano">Gemini Nano (Browser Built-in)</option>
              {Object.entries(PROVIDER_TYPES).map(([value, provider]) => (
                <option key={value} value={value}>
                  {provider.name}
                </option>
              ))}
            </select>
          </Field>
          {nanoSelected ? (
            <div className="row">
              <span className={`dot ${nanoStatus === "available" ? "dot-ok" : "dot-off"}`} />
              <span className="model-results">{NANO_LABELS[nanoStatus] || nanoStatus}</span>
              {nanoStatus === "downloadable" && (
                <button className="btn" onClick={onDownloadNano} type="button">
                  Download model
                </button>
              )}
            </div>
          ) : (
            <>
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
              <Field
                hint={availableModels.length ? `${availableModels.length} model${availableModels.length === 1 ? "" : "s"}` : null}
                htmlFor="epModel"
                label="Model"
              >
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
              <button
                aria-label="Refresh models"
                className="icon-btn icon-btn-sm"
                disabled={endpointLoading}
                onClick={onRefreshModels}
                title="Refresh models"
                type="button"
              >
                <Icons.Refresh />
              </button>
            </div>
            {endpointStatus ? <div className="model-results">{endpointStatus}</div> : null}
            {currentModel && (
              <Checkbox
                checked={!hiddenThinkingModels.includes(thinkingKey)}
                label="Show thinking"
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
            </>
          )}
        </div>
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
