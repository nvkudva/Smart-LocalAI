import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "./markdown.jsx";

const render = (text, chunks = ["c1"]) =>
  renderToStaticMarkup(<Markdown text={text} chunks={chunks} onCitation={() => {}} />);

describe("Markdown renderer", () => {
  test("renders blocks: headings, lists, quote, table, hr, code", () => {
    const html = render(
      "# T\n\n- a\n\n1. b\n\n> q\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n---\n\n```js\nconst a = 1;\n```",
    );
    for (const tag of ["<h1", "<ul", "<ol", "<blockquote", "<table", "<hr", "code-block", "code-lang"]) {
      expect(html.includes(tag)).toBe(true);
    }
  });

  test("keeps raw HTML and unsafe URLs inert", () => {
    const html = render('<img onerror="x"> and [x](javascript:alert(1)) and [ok](https://example.com)');
    expect(html.includes("<img")).toBe(false);
    expect(html.includes('href="javascript')).toBe(false);
    expect(html.includes('href="https://example.com"')).toBe(true);
  });

  test("cites only in-range indexes", () => {
    const html = render("See [1] and [99].");
    expect(html.includes("cite-btn")).toBe(true);
    expect(html.includes("[99]")).toBe(true);
  });
});
