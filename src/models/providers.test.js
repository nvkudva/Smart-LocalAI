import { describe, expect, test } from "bun:test";
import { modelCapabilities } from "./providers.js";

describe("modelCapabilities vision", () => {
  test("custom LM Studio names are not vision by default", () => {
    expect(modelCapabilities("ornith", "openai").vision).toBe(false);
  });

  test("user override enables vision, case-insensitively", () => {
    expect(modelCapabilities("ornith", "openai", ["Ornith"]).vision).toBe(true);
    expect(modelCapabilities("ornith", "ollama", ["ornith"]).vision).toBe(true);
  });

  test("override does not affect other models", () => {
    expect(modelCapabilities("other-model", "openai", ["ornith"]).vision).toBe(false);
  });

  test("known vision families still detected without override", () => {
    expect(modelCapabilities("qwen3-vl-8b", "openai").vision).toBe(true);
    expect(modelCapabilities("llava:13b", "ollama").vision).toBe(true);
    expect(modelCapabilities("gpt-4o", "openai").vision).toBe(true);
    expect(modelCapabilities("claude-sonnet-4-5", "anthropic").vision).toBe(true);
  });
});
