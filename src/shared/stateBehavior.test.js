import { describe, expect, test } from "bun:test";
import { buildProvider, forkMessages, formatTime, normalizeStoredState, threadTitle, tokensPerSecond } from "./extensionState.js";
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

describe("forkMessages", () => {
  test("keeps history through the fork point", () => {
    const messages = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(forkMessages(messages, 1)).toEqual([{ id: "a" }, { id: "b" }]);
    expect(forkMessages(messages, 9)).toHaveLength(3);
    expect(forkMessages([], 0)).toEqual([]);
  });
});

describe("tokensPerSecond", () => {
  test("estimates from chars over elapsed time", () => {
    expect(tokensPerSecond(400, 1000)).toBe(100);
    expect(tokensPerSecond(0, 1000)).toBe(0);
    expect(tokensPerSecond(400, 0)).toBe(0);
  });
});

describe("formatTime", () => {
  test("formats today briefly and guards bad input", () => {
    expect(formatTime(Date.now())).toMatch(/\d/);
    expect(formatTime(undefined)).toBe("");
    expect(formatTime("not-a-date")).toBe("");
  });
});
