import { describe, expect, test } from "bun:test";
import { splitThinking, stripThinking, wrapReasoning } from "./thinking.js";

describe("wrapReasoning", () => {
  test("wraps reasoning deltas and closes before content", () => {
    const wrap = wrapReasoning();
    const stream = [wrap({ reasoning: "a" }), wrap({ reasoning: "b" }), wrap({ content: "Hi" }), wrap({ content: "!" })];
    expect(stream.join("")).toBe("<think>ab</think>Hi!");
  });
});

describe("splitThinking", () => {
  test("separates a closed block from the answer", () => {
    expect(splitThinking("<think>plan</think>\n\nAnswer")).toEqual({ thinking: "plan", answer: "Answer", isThinking: false });
  });
  test("flags an unclosed block as still thinking", () => {
    expect(splitThinking("<think>pla")).toEqual({ thinking: "pla", answer: "", isThinking: true });
  });
  test("handles a closing tag without an opener", () => {
    expect(splitThinking("plan</think>Answer")).toEqual({ thinking: "plan", answer: "Answer", isThinking: false });
  });
  test("passes plain text through", () => {
    expect(stripThinking("Just text")).toBe("Just text");
  });
});
