import { renderInline } from "./renderInline.jsx";

export default function Markdown({ text, chunks, onCitation }) {
  const lines = String(text || "").split("\n");
  const blocks = [];
  let paragraph = [];
  let list = [];
  let inCode = false;
  let codeLines = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const value = paragraph.join(" ");
    blocks.push(
      <p key={`p-${blocks.length}`}>{renderInline(value, chunks, onCitation, `p-${blocks.length}`)}</p>,
    );
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`}>
        {list.map((item, index) => (
          <li key={item}>{renderInline(item, chunks, onCitation, `li-${blocks.length}-${index}`)}</li>
        ))}
      </ul>,
    );
    list = [];
  };
  const flushBlocks = () => {
    flushParagraph();
    flushList();
  };

  lines.forEach((line) => {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        blocks.push(
          <pre key={`pre-${blocks.length}`}>
            <code>{codeLines.join("\n")}</code>
          </pre>,
        );
        codeLines = [];
        inCode = false;
      } else {
        flushBlocks();
        inCode = true;
      }
      return;
    }
    if (inCode) {
      codeLines.push(line);
      return;
    }
    if (!line.trim()) {
      flushBlocks();
      return;
    }
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flushBlocks();
      blocks.push(
        <strong className="md-heading" key={`h-${blocks.length}`}>
          {renderInline(heading[1], chunks, onCitation, `h-${blocks.length}`)}
        </strong>,
      );
      return;
    }
    const bullet = line.match(/^\s*[-*•]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      list.push(bullet[1]);
      return;
    }
    flushList();
    paragraph.push(line.trim());
  });

  if (inCode) {
    blocks.push(
      <pre key={`pre-${blocks.length}`}>
        <code>{codeLines.join("\n")}</code>
      </pre>,
    );
  }
  flushBlocks();
  return <>{blocks.length ? blocks : <span className="typing">Working…</span>}</>;
}
