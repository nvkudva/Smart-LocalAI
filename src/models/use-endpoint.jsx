import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NANO_MODEL, PROVIDER_TYPES } from "./providers.js";
import {
  buildProvider,
  createDefaultEndpoint,
  listEndpointModels,
  isNanoEnabled,
  resolveActive,
} from "../shared/extension-state.js";
import { detectLocal, listModels, nanoAvailability, normalizeBase, pickSmartModel } from "./providers.js";

export function useEndpoint({ loaded, settings, onStatus, closeMenu }) {
  const [endpoint, setEndpoint] = useState(() => createDefaultEndpoint());
  const [nanoStatus, setNanoStatus] = useState("checking");
  const [detection, setDetection] = useState({});
  const [providerSummary, setProviderSummary] = useState("Detecting local models…");
  const [endpointError, setEndpointError] = useState("");
  const [endpointLoading, setEndpointLoading] = useState(false);
  const endpointRef = useRef(endpoint);
  const endpointTimerRef = useRef(null);
  endpointRef.current = endpoint;

  const nanoEnabled = isNanoEnabled(endpoint, nanoStatus);
  const availableModels = useMemo(
    () => (nanoEnabled ? [NANO_MODEL] : listEndpointModels(endpoint, detection)),
    [detection, endpoint, nanoEnabled],
  );
  const activeProvider = useMemo(() => buildProvider(endpoint, nanoStatus), [endpoint, nanoStatus]);
  const active = useMemo(() => {
    const resolved = resolveActive(endpoint, nanoStatus, settings, detection);
    return resolved ? { ...resolved, explicit: Boolean(endpoint.model) && !nanoEnabled } : null;
  }, [detection, endpoint, nanoEnabled, nanoStatus, settings]);

  const detectProviders = useCallback(async () => {
    setProviderSummary("Detecting local models…");
    const [nano, results] = await Promise.all([nanoAvailability(), detectLocal()]);
    setNanoStatus(nano);
    const nextDetection = {};
    for (const result of results) nextDetection[result.preset.id] = result;
    setDetection(nextDetection);
    const healthy = results.filter((result) => result.ok);
    setProviderSummary(
      healthy.length
        ? healthy.map((result, index) => (
            <span key={result.preset.id}>
              {index > 0 ? "  " : ""}
              <b>● {result.preset.name}</b> {result.models.length} models · {result.latencyMs}ms
            </span>
          ))
        : "No local model found. Start LM Studio / Ollama, or pick a cloud endpoint in Settings.",
    );
  }, []);

  useEffect(() => {
    if (loaded) detectProviders();
  }, [detectProviders, loaded]);

  const refreshModels = useCallback(
    async (nextEndpoint = endpointRef.current) => {
      const provider = buildProvider(nextEndpoint, nanoStatus);
      if (!provider.baseUrl) {
        setEndpointError("URL required for a custom endpoint.");
        return;
      }
      setEndpointLoading(true);
      setEndpointError("");
      try {
        const models = await listModels(provider);
        setEndpoint((current) => ({ ...current, models }));
      } catch (error) {
        setEndpointError(`✗ ${error.message}`);
      } finally {
        setEndpointLoading(false);
      }
    },
    [nanoStatus],
  );

  const scheduleModelRefresh = useCallback(() => {
    window.clearTimeout(endpointTimerRef.current);
    endpointTimerRef.current = window.setTimeout(() => refreshModels(endpointRef.current), 800);
  }, [refreshModels]);

  const updateEndpoint = useCallback((field, value) => {
    setEndpoint((current) => ({ ...current, [field]: value }));
  }, []);

  const changeEndpointType = useCallback(
    (type) => {
      const preset = PROVIDER_TYPES[type] || PROVIDER_TYPES.custom;
      setEndpoint((current) => {
        const next = {
          ...current,
          type,
          baseUrl: preset.baseUrl,
          models: [],
          model: current.remembered[type] || "",
        };
        endpointRef.current = next;
        return next;
      });
      window.setTimeout(() => refreshModels(endpointRef.current), 0);
    },
    [refreshModels],
  );

  const changeEndpointField = useCallback(
    (field, value) => {
      updateEndpoint(field, value);
      scheduleModelRefresh();
    },
    [scheduleModelRefresh, updateEndpoint],
  );

  const commitEndpointField = useCallback(
    (field, value) => {
      updateEndpoint(field, field === "baseUrl" ? normalizeBase(value) : value.trim());
      scheduleModelRefresh();
    },
    [scheduleModelRefresh, updateEndpoint],
  );

  const rememberModel = useCallback((model) => {
    setEndpoint((current) => ({
      ...current,
      model,
      remembered: model ? { ...current.remembered, [current.type]: model } : current.remembered,
    }));
  }, []);

  const selectAutoModel = useCallback(() => {
    setEndpoint((current) => {
      const remembered = { ...current.remembered };
      delete remembered[current.type];
      return { ...current, model: "", remembered };
    });
    closeMenu();
  }, [closeMenu]);

  const selectModel = useCallback(
    (model) => {
      if (!nanoEnabled) rememberModel(model);
      closeMenu();
    },
    [closeMenu, nanoEnabled, rememberModel],
  );

  const downloadNano = useCallback(async () => {
    setNanoStatus("downloading");
    try {
      const languageModel = window.LanguageModel || window.ai?.languageModel;
      const session = await languageModel.create({ expectedOutputLanguages: ["en"] });
      if (typeof session?.destroy === "function") session.destroy();
    } catch (error) {
      onStatus(`Model download failed: ${error.message}`);
    }
    setNanoStatus(await nanoAvailability());
  }, [onStatus]);

  const endpointStatus = endpointLoading
    ? "Fetching models…"
    : endpointError ||
      (availableModels.length
        ? `${availableModels.length} models · Smart: ${pickSmartModel(availableModels)}`
        : PROVIDER_TYPES[endpoint.type]?.local && !detection[endpoint.type]?.ok
          ? `Offline — start ${PROVIDER_TYPES[endpoint.type].name}, then press Refresh.`
          : "No models listed — press Refresh.");

  return {
    endpoint,
    setEndpoint,
    nanoStatus,
    detection,
    providerSummary,
    endpointStatus,
    endpointLoading,
    nanoEnabled,
    availableModels,
    activeProvider,
    active,
    refreshModels,
    updateEndpoint,
    changeEndpointType,
    changeEndpointField,
    commitEndpointField,
    rememberModel,
    selectAutoModel,
    selectModel,
    downloadNano,
  };
}
