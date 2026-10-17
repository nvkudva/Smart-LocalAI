import { useCallback, useState } from "react";
import { modelCapabilities } from "../models/providers.js";
import { createThreadId } from "../shared/extensionState.js";

const TEXT_FILE = /\.(txt|md|markdown|csv|json|js|jsx|ts|tsx|py|html|css|xml|yaml|yml|log|toml|ini|cfg|java|c|cpp|h|go|rs|rb|php|sh|sql)$/i;
export const TEXT_ACCEPT = ".txt,.md,.markdown,.csv,.json,.js,.jsx,.ts,.tsx,.py,.html,.css,.xml,.yaml,.yml,.log";

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Couldn't read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/**
 * Keep composer attachments and their model capability checks in one place.
 */
export function useAttachments({ active, onStatus }) {
  const [attachments, setAttachments] = useState([]);

  const removeAttachment = useCallback((id) => {
    setAttachments((current) => current.filter((file) => file.id !== id));
  }, []);

  const addFiles = useCallback(
    async (fileList, kind) => {
      const files = [...(fileList || [])];
      if (!files.length || !active?.model) return;
      const now = modelCapabilities(active.model, active.provider.protocol);
      let count = attachments.length;
      for (const file of files) {
        if (count >= 5) {
          onStatus("Up to 5 attachments per message.");
          break;
        }
        if (kind === "image") {
          if (!now.vision) {
            onStatus("This model can't read images — switch to a vision model.");
            continue;
          }
          if (!file.type.startsWith("image/")) {
            onStatus(`Not an image: ${file.name}`);
            continue;
          }
          if (file.size > 6 * 1024 * 1024) {
            onStatus(`Too large (6MB max): ${file.name}`);
            continue;
          }
          const dataUrl = await readAsDataUrl(file);
          count += 1;
          setAttachments((current) => [...current, { id: createThreadId(), kind: "image", name: file.name, dataUrl }]);
        } else {
          const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
          if (isPdf) {
            if (!now.pdf) {
              onStatus("PDFs need a Claude or Gemini model.");
              continue;
            }
            if (file.size > 12 * 1024 * 1024) {
              onStatus(`Too large (12MB max): ${file.name}`);
              continue;
            }
            const dataUrl = await readAsDataUrl(file);
            count += 1;
            setAttachments((current) => [...current, { id: createThreadId(), kind: "pdf", name: file.name, dataUrl }]);
          } else {
            if (!TEXT_FILE.test(file.name) && !file.type.startsWith("text/")) {
              onStatus(`Unsupported file type: ${file.name}`);
              continue;
            }
            if (file.size > 200 * 1024) {
              onStatus(`Too large (200KB max for text): ${file.name}`);
              continue;
            }
            const text = await file.text();
            count += 1;
            setAttachments((current) => [
              ...current,
              { id: createThreadId(), kind: "text", name: file.name, text },
            ]);
          }
        }
      }
    },
    [active, attachments.length, onStatus],
  );

  return { attachments, setAttachments, addFiles, removeAttachment };
}
