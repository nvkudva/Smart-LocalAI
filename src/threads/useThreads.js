import { useCallback, useState } from "react";
import { createThreadId, forkMessages, threadTitle, upsertThread } from "../shared/extensionState.js";
import { downloadTextFile } from "../page/pageContext.js";

export function useThreads({ onResetChat, onStatus }) {
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [messages, setMessages] = useState([]);

  const startNewThread = useCallback(() => {
    setThreads((current) => upsertThread(current, activeThreadId, messages));
    setActiveThreadId("");
    setMessages([]);
    onResetChat();
  }, [activeThreadId, messages, onResetChat]);

  const openThread = useCallback(
    (threadId) => {
      const nextThreads = upsertThread(threads, activeThreadId, messages);
      const thread = nextThreads.find((item) => item.id === threadId);
      if (!thread) return;
      setThreads(nextThreads);
      setActiveThreadId(thread.id);
      setMessages(thread.messages || []);
      onResetChat();
    },
    [activeThreadId, messages, onResetChat, threads],
  );

  const deleteThread = useCallback(
    (threadId) => {
      if (!window.confirm("Delete this chat? This can't be undone.")) return;
      setThreads((current) => current.filter((thread) => thread.id !== threadId));
      if (threadId === activeThreadId) {
        setActiveThreadId("");
        setMessages([]);
        onResetChat();
      }
    },
    [activeThreadId, onResetChat],
  );

  const forkThreadAt = useCallback(
    (index) => {
      const branched = forkMessages(messages, index);
      if (!branched.length) return;
      setThreads((current) => upsertThread(current, activeThreadId, messages));
      setActiveThreadId(createThreadId());
      setMessages(branched);
      onResetChat();
      onStatus("Branched into a new thread from here.");
    },
    [activeThreadId, messages, onResetChat, onStatus],
  );

  const clearAllThreads = useCallback(() => {
    if (!window.confirm("Clear all chat history? This can't be undone.")) return;
    setThreads([]);
    setActiveThreadId("");
    setMessages([]);
    onResetChat();
  }, [onResetChat]);

  const exportThread = useCallback(
    (format) => {
      if (!messages.length) {
        onStatus("Nothing to export.");
        return;
      }
      const title = threadTitle(messages);
      const stamp = new Date().toISOString().slice(0, 10);
      if (format === "csv") {
        const rows = [["role", "content"], ...messages.map((message) => [message.role, message.content])];
        const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
        downloadTextFile(`smartlocalai-${stamp}.csv`, csv, "text/csv");
      } else {
        const markdown = `# ${title}\n\n${messages
          .map((message) => `${message.role === "user" ? "## You" : "## Smart LocalAI"}\n\n${String(message.content ?? "")}`)
          .join("\n\n")}\n`;
        downloadTextFile(`smartlocalai-${stamp}.md`, markdown, "text/markdown");
      }
      onStatus(`Exported ${messages.length} messages.`);
    },
    [messages, onStatus],
  );

  return {
    threads,
    setThreads,
    activeThreadId,
    setActiveThreadId,
    messages,
    setMessages,
    startNewThread,
    openThread,
    deleteThread,
    clearAllThreads,
    exportThread,
    forkThreadAt,
  };
}
