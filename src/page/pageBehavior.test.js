import { describe, expect, test } from "bun:test";
import { isPageActionIntent } from "./intent.js";
import { parseAgentActions, stripAgentBlocks } from "./pageAgent.js";

describe("isPageActionIntent", () => {
  test("routes edit commands to the agent", () => {
    expect(isPageActionIntent("make the headings blue")).toBe(true);
    expect(isPageActionIntent("close the cookie banner")).toBe(true);
    expect(isPageActionIntent("type hello into the search input")).toBe(true);
    expect(isPageActionIntent("fill the email into the signup input")).toBe(true);
  });

  test("keeps plain chat as chat", () => {
    expect(isPageActionIntent("what is the capital of France")).toBe(false);
    expect(isPageActionIntent("summarize this page")).toBe(false);
    expect(isPageActionIntent("what type of input is this")).toBe(false);
  });
});

describe("parseAgentActions", () => {
  test("accepts single-line and multiline fences, ignores prose fences", () => {
    expect(parseAgentActions('x ```agent {"action":"scroll","value":"600"}``` y')).toHaveLength(1);
    expect(parseAgentActions('```agent\n{"action":"click","selector":"#a"}\n```')).toHaveLength(1);
    expect(parseAgentActions('```js\nfoo()\n```')).toHaveLength(0);
  });
});

describe("stripAgentBlocks", () => {
  test("removes action blocks, keeps code blocks", () => {
    expect(stripAgentBlocks('hi ```agent\n{"action":"scroll"}\n``` bye').trim()).toBe("hi  bye");
    expect(stripAgentBlocks('```js\nfoo()\n```')).toContain("foo()");
  });
});
