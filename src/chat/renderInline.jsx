/**
 * Render inline Markdown tokens (code, bold, and citation buttons).
 * @param {string} text Inline Markdown source.
 * @param {string[]} chunks Page-text chunks backing numeric citations.
 * @param {(index: number) => void} onCitation Citation click handler.
 * @param {string} keyPrefix React key prefix.
 * @returns {import("react").ReactNode[]} Inline nodes.
 */
export function renderInline(text, chunks, onCitation, keyPrefix) {
  const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\[(\d{1,2})\])/g;
  const nodes = [];
  let lastIndex = 0;

  for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${match.index}`;
    if (token.startsWith("`")) nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    else if (token.startsWith("**")) nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else {
      const index = Number.parseInt(match[2], 10);
      if (index >= 1 && index <= chunks.length) {
        nodes.push(
          <button className="cite-btn" key={key} onClick={() => onCitation(index)} type="button">
            [{index}]
          </button>,
        );
      } else nodes.push(token);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}
