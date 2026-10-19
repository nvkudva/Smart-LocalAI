import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NANO_MODEL, PROVIDER_TYPES } from "./providers.js";
import {
  buildProvider,
  createDefaultEndpoint,
  listEndpointModels,
  isNanoEnabled,
  resolveActive,
} from "../shared/extensionState.js";
import { detectLocal, detectVision, listModels, nanoAvailability, nanoLanguageOptions, normalizeBase } from "./providers.js";

export function useEndpoint({ loaded, settings, onStatus, closeMenu }) {
  const [endpoint, setEndpoint] = useState(() => createDefaultEndpoint());
  const [nanoStatus, setNanoStatus] = useState("checking");
  const [detection, setDetection] = useState({});
  const [providerSummary, setProviderSummary] = useState("Detecting local models…");
  const [endpointError, setEndpointError] = useState("");
  const [endpointLoading, setEndpointLoading] = useState(false);
  const [detectedVision, setDetectedVision] = useState({});
  const endpointRef = useRef(endpoint);
  const endpointTimerRef = useRef(null);
  endpointRef.current = endpoint;

  const nanoEnabled = isNanoEnabled(endpoint, nanoStatus);
  const availableModels = useMemo(
    () => (nanoEnabled ? [NANO_MODEL] : listEndpointModels(endpoint, detection)),
    [detection, endpoint, nanoEnabled],
  );
  const activeProvider = useMemo(() => buildProvider(endpoint, nanoStatus), [endpoint, nanoStatus]);
  const resolvedActive = useMemo(
    () => resolveActive(endpoint, nanoStatus, settings, detection),
    [detection, endpoint, nanoStatus, settings],
  );
  const visionKey = resolvedActive ? `${resolvedActive.provider.id}:${resolvedActive.model}` : "";
  const isVisionDetected = detectedVision[visionKey] === true;
  const active = useMemo(() => {
    if (!resolvedActive) return null;
    const markedVision = endpoint.visionOverride || [];
    return {
      ...resolvedActive,
      explicit: Boolean(endpoint.model) && !nanoEnabled,
      visionOverride: isVisionDetected ? [...markedVision, resolvedActive.model] : markedVision,
    };
  }, [endpoint.model, endpoint.visionOverride, isVisionDetected, nanoEnabled, resolvedActive]);

  useEffect(() => {
    if (!resolvedActive || visionKey in detectedVision) return;
    let isCancelled = false;
    detectVision(resolvedActive.provider, resolvedActive.model).then((isVision) => {
      if (isCancelled || isVision === null) return;
      setDetectedVision((current) => ({ ...current, [visionKey]: isVision }));
    });
    return () => {
      isCancelled = true;
    };
  }, [detectedVision, resolvedActive, visionKey]);

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

  const refreshIdRef = useRef(0);
  const refreshModels = useCallback(
    async (nextEndpoint = endpointRef.current) => {
      const requestId = refreshIdRef.current + 1;
      refreshIdRef.current = requestId;
      const provider = buildProvider(nextEndpoint, nanoStatus);
      if (!provider.baseUrl) {
        setEndpointError("URL required for a custom endpoint.");
        return;
      }
      setEndpointLoading(true);
      setEndpointError("");
      try {
        const models = await listModels(provider);
        if (refreshIdRef.current !== requestId) return;
        setEndpoint((current) => ({ ...current, models }));
      } catch (error) {
        if (refreshIdRef.current !== requestId) return;
        setEndpointError(`✗ ${error.message}`);
      } finally {
        if (refreshIdRef.current === requestId) setEndpointLoading(false);
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
      const current = endpointRef.current;
      const next = {
        ...current,
        type,
        useNano: false,
        baseUrl: preset.baseUrl,
        models: [],
        model: current.remembered[type] || "",
      };
      endpointRef.current = next;
      setEndpoint(next);
      window.setTimeout(() => refreshModels(next), 0);
    },
    [refreshModels],
  );

  const changeModelProvider = useCallback(
    (value) => {
      if (value === "nano") {
        const next = { ...endpointRef.current, useNano: true };
        endpointRef.current = next;
        setEndpoint(next);
        return;
      }
      changeEndpointType(value);
    },
    [changeEndpointType],
  );

  const changeEndpointField = useCallback(
    (field, value) => {
      updateEndpoint(field, value);
      if (field === "baseUrl") scheduleModelRefresh();
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
      const session = await languageModel.create(nanoLanguageOptions());
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
        ? ""
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
    isVisionDetected,
    refreshModels,
    updateEndpoint,
    changeEndpointType,
    changeModelProvider,
    changeEndpointField,
    commitEndpointField,
    rememberModel,
    selectAutoModel,
    selectModel,
    downloadNano,
  };
}
