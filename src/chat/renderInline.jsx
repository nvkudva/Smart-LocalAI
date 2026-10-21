/**
 * Render inline Markdown tokens (code, bold, italic, strikethrough, links, citations).
 * Raw HTML is never interpreted: everything flows through React text nodes.
 * @param {string} text Inline Markdown source.
 * @param {string[]} chunks Page-text chunks backing numeric citations.
 * @param {(index: number) => void} onCitation Citation click handler.
 * @param {string} keyPrefix React key prefix.
 * @returns {import("react").ReactNode[]} Inline nodes.
 */
export function renderInline(text, chunks, onCitation, keyPrefix) {
  const source = String(text ?? "");
  const total = Array.isArray(chunks) ? chunks.length : 0;
  const pattern = /(`[^`\n]+`|\*\*[^*\n]+?\*\*|~~[^~\n]+?~~|\*[^*\n]+?\*|\[([^\]\n]*)\]\(([^)\n]*)\)|\[(\d{1,2})\])/g;
  const nodes = [];
  let lastIndex = 0;

  const isSafeUrl = (url) => /^(https?:\/\/|mailto:)/i.test(String(url ?? "").trim());

  for (let match = pattern.exec(source); match !== null; match = pattern.exec(source)) {
    if (match.index > lastIndex) nodes.push(source.slice(lastIndex, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${match.index}`;
    if (token.startsWith("`")) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**")) {
      const inner = token.slice(2, -2);
      nodes.push(<strong key={key}>{renderInline(inner, chunks, onCitation, `${key}-b`)}</strong>);
    } else if (token.startsWith("~~")) {
      const inner = token.slice(2, -2);
      nodes.push(<del key={key}>{renderInline(inner, chunks, onCitation, `${key}-s`)}</del>);
    } else if (token.startsWith("*")) {
      const inner = token.slice(1, -1);
      nodes.push(<em key={key}>{renderInline(inner, chunks, onCitation, `${key}-i`)}</em>);
    } else if (match[2] !== undefined && match[3] !== undefined && token.includes("](")) {
      const label = match[2];
      const url = match[3].trim();
      if (isSafeUrl(url)) {
        nodes.push(
          <a href={url} key={key} rel="noreferrer" target="_blank">
            {renderInline(label, chunks, onCitation, `${key}-l`)}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    } else {
      const index = Number.parseInt(match[4], 10);
      if (Number.isFinite(index) && index >= 1 && index <= total) {
        nodes.push(
          <button className="cite-btn" key={key} onClick={() => onCitation(index)} type="button">
            [{index}]
          </button>,
        );
      } else nodes.push(token);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < source.length) nodes.push(source.slice(lastIndex));
  return nodes;
}
