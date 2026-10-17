import { useCallback, useEffect, useState } from "react";
import * as PageAgent from "../services/pageAgent.js";

export function usePageContext({ settings, onStatus }) {
  const [tabId, setTabId] = useState(null);
  const [pageTitle, setPageTitle] = useState("No page attached");
  const [pageUrl, setPageUrl] = useState("");
  const [pageReady, setPageReady] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [attachPage, setAttachPage] = useState(true);
  const [picked, setPicked] = useState(null);

  const refreshPage = useCallback(async () => {
    try {
      const tab = await PageAgent.activeTab();
      setTabId(tab?.id ?? null);
      if (!tab || PageAgent.isRestricted(tab.url)) {
        setPageTitle(tab ? "Restricted page — answers only" : "No page attached");
        setPageUrl(tab?.url || "");
        setPageReady(false);
        setSnapshot(null);
        return null;
      }
      setPageTitle(tab.title || tab.url);
      setPageUrl(tab.url || "");
      setPageReady(true);
      if (settings.includePage && attachPage) {
        const nextSnapshot = await PageAgent.getSnapshot(tab.id);
        setSnapshot(nextSnapshot);
        return nextSnapshot;
      }
      setSnapshot(null);
      return null;
    } catch {
      setPageReady(false);
      setSnapshot(null);
      return null;
    }
  }, [attachPage, settings.includePage]);

  useEffect(() => {
    refreshPage();
  }, [refreshPage]);

  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.tabs) return undefined;
    const activated = () => refreshPage();
    const updated = (updatedTabId, info) => {
      if (updatedTabId && info.status === "complete") refreshPage();
    };
    chrome.tabs.onActivated.addListener(activated);
    chrome.tabs.onUpdated.addListener(updated);
    return () => {
      chrome.tabs.onActivated.removeListener(activated);
      chrome.tabs.onUpdated.removeListener(updated);
    };
  }, [refreshPage]);

  const toggleAttachPage = useCallback(() => {
    setAttachPage((current) => {
      const next = !current;
      if (!next) setSnapshot(null);
      return next;
    });
  }, []);

  const undo = useCallback(async () => {
    if (!tabId) return;
    try {
      const result = await PageAgent.undo(tabId);
      onStatus(result.message);
      return result;
    } catch (error) {
      onStatus(error.message);
      return null;
    }
  }, [onStatus, tabId]);

  const pickElement = useCallback(async () => {
    if (!tabId) {
      onStatus("No page attached.");
      return;
    }
    try {
      const result = await PageAgent.pickElement(tabId);
      if (result?.selector) setPicked(result);
    } catch (error) {
      onStatus(`Picker failed: ${error.message}`);
    }
  }, [onStatus, tabId]);

  return {
    tabId,
    pageTitle,
    pageUrl,
    pageReady,
    snapshot,
    attachPage,
    picked,
    setPicked,
    refreshPage,
    toggleAttachPage,
    undo,
    pickElement,
  };
}
