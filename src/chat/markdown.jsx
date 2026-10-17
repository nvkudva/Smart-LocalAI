import { renderInline } from "./renderInline.jsx";

function copyCode(event, text) {
  const button = event.currentTarget;
  const done = (label) => {
    button.textContent = label;
    window.setTimeout(() => {
      button.textContent = "Copy";
    }, 1200);
  };
  try {
    const result = navigator.clipboard?.writeText(String(text ?? ""));
    if (result && typeof result.then === "function") {
      result.then(() => done("Copied")).catch(() => done("Copy failed"));
    } else if (!navigator.clipboard) {
      done("Copy failed");
    } else {
      done("Copied");
    }
  } catch {
    done("Copy failed");
  }
}

function splitRow(line) {
  let cells = String(line ?? "").trim();
  if (cells.startsWith("|")) cells = cells.slice(1);
  if (cells.endsWith("|")) cells = cells.slice(0, -1);
  return cells.split("|").map((cell) => cell.trim());
}

const TABLE_SEPARATOR = /^\s*\|?(\s*:?-{1,}:?\s*\|)+\s*:?-{1,}:?\s*\|?\s*$/;

export default function Markdown({ text, chunks, onCitation }) {
  const lines = String(text || "").split("\n");
  const blocks = [];
  let paragraph = [];
  let bullets = [];
  let ordered = [];
  let quote = [];
  let inCode = false;
  let codeLang = "";
  let codeLines = [];

  const inline = (value, prefix) => renderInline(value, chunks, onCitation, prefix);

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const value = paragraph.join(" ");
    blocks.push(<p key={`p-${blocks.length}`}>{inline(value, `p-${blocks.length}`)}</p>);
    paragraph = [];
  };
  const flushBullets = () => {
    if (!bullets.length) return;
    const at = blocks.length;
    blocks.push(
      <ul key={`ul-${at}`}>
        {bullets.map((item, index) => (
          <li key={`ul-${at}-${index}`}>{inline(item, `ul-${at}-${index}`)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };
  const flushOrdered = () => {
    if (!ordered.length) return;
    const at = blocks.length;
    blocks.push(
      <ol key={`ol-${at}`}>
        {ordered.map((item, index) => (
          <li key={`ol-${at}-${index}`}>{inline(item, `ol-${at}-${index}`)}</li>
        ))}
      </ol>,
    );
    ordered = [];
  };
  const flushQuote = () => {
    if (!quote.length) return;
    const value = quote.join(" ");
    blocks.push(<blockquote key={`q-${blocks.length}`}>{inline(value, `q-${blocks.length}`)}</blockquote>);
    quote = [];
  };
  const flushLists = () => {
    flushBullets();
    flushOrdered();
  };
  const flushBlocks = () => {
    flushParagraph();
    flushLists();
    flushQuote();
  };

  const pushCodeBlock = () => {
    const at = blocks.length;
    const code = codeLines.join("\n");
    const lang = codeLang || "code";
    blocks.push(
      <div className="code-block" key={`pre-${at}`}>
        <div className="code-head">
          <span className="code-lang">{lang}</span>
          <button className="code-copy-btn" onClick={(event) => copyCode(event, code)} type="button">
            Copy
          </button>
        </div>
        <pre>
          <code>{code}</code>
        </pre>
      </div>,
    );
    codeLines = [];
    codeLang = "";
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCode) {
        pushCodeBlock();
        inCode = false;
      } else {
        flushBlocks();
        inCode = true;
        codeLang = trimmed.slice(3).trim().split(/\s+/)[0] || "";
      }
      continue;
    }
    if (inCode) {
      codeLines.push(line);
      continue;
    }
    if (!trimmed) {
      flushBlocks();
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushBlocks();
      blocks.push(<hr key={`hr-${blocks.length}`} />);
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushBlocks();
      const level = heading[1].length;
      const Tag = `h${level}`;
      blocks.push(
        <Tag key={`h-${blocks.length}`} className={`md-h${level}`}>
          {inline(heading[2], `h-${blocks.length}`)}
        </Tag>,
      );
      continue;
    }
    const quoteLine = line.match(/^\s*>\s?(.*)$/);
    if (quoteLine) {
      flushParagraph();
      flushLists();
      quote.push(quoteLine[1].trim());
      continue;
    }
    if (trimmed.includes("|") && i + 1 < lines.length && TABLE_SEPARATOR.test(lines[i + 1])) {
      flushBlocks();
      const at = blocks.length;
      const head = splitRow(trimmed);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].trim().includes("|")) {
        rows.push(splitRow(lines[i].trim()));
        i += 1;
      }
      i -= 1;
      blocks.push(
        <div className="md-table-wrap" key={`tbl-${at}`}>
          <table>
            <thead>
              <tr>
                {head.map((cell, index) => (
                  <th key={`tbl-${at}-h-${index}`}>{inline(cell, `tbl-${at}-h-${index}`)}</th>
                ))}
              </tr>
            </thead>
            {rows.length > 0 && (
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={`tbl-${at}-r-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <td key={`tbl-${at}-r-${rowIndex}-c-${cellIndex}`}>
                        {inline(cell, `tbl-${at}-r-${rowIndex}-c-${cellIndex}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>,
      );
      continue;
    }
    const bullet = line.match(/^\s*[-*•]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      flushOrdered();
      flushQuote();
      bullets.push(bullet[1]);
      continue;
    }
    const orderedItem = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (orderedItem) {
      flushParagraph();
      flushBullets();
      flushQuote();
      ordered.push(orderedItem[1]);
      continue;
    }
    flushLists();
    flushQuote();
    paragraph.push(trimmed);
  }

  if (inCode) pushCodeBlock();
  flushBlocks();
  return <>{blocks.length ? blocks : <span className="typing">Working…</span>}</>;
}
