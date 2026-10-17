import { describe, expect, test } from "bun:test";
import { buildProvider, normalizeStoredState, threadTitle } from "./extensionState.js";
import { chunkPageText } from "../page/pageContext.js";

describe("threadTitle", () => {
  test("falls back for missing or empty content", () => {
    expect(threadTitle([])).toBe("New chat");
    expect(threadTitle([{ role: "user" }])).toBe("New chat");
    expect(threadTitle([{ role: "user", content: "hi" }])).toBe("hi");
  });
});

describe("normalizeStoredState", () => {
  test("regenerates a dangling active thread id", () => {
    const state = normalizeStoredState({
      "freeai.activeThread": "dangling",
      "freeai.history": [{ role: "user", content: "hi" }],
    });
    expect(state.activeThreadId).not.toBe("dangling");
    expect(state.activeThreadId).not.toBe("");
  });
});

describe("buildProvider", () => {
  test("exposes the gemini protocol", () => {
    const provider = buildProvider({ type: "gemini", baseUrl: "", apiKey: "k", remembered: {} }, "unsupported");
    expect(provider.protocol).toBe("gemini");
  });
});

describe("chunkPageText", () => {
  test("covers the full snapshot window", () => {
    expect(chunkPageText("a".repeat(8000)).join("")).toHaveLength(8000);
  });
});
