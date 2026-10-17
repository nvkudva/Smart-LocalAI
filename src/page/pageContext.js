export function chunkPageText(text, maxChunks = 14, chunkSize = 600) {
  const chunks = [];
  const clean = String(text || "").replace(/\n{3,}/g, "\n\n");
  for (let index = 0; index < clean.length && chunks.length < maxChunks; index += chunkSize) {
    chunks.push(clean.slice(index, index + chunkSize));
  }
  return chunks;
}

export function buildPageContext(snapshot, provider, pickedSelector) {
  if (!snapshot) return { text: "", chunks: [] };
  const nano = provider?.protocol === "nano";
  let text = `\n\n[Current page]\nTitle: ${snapshot.title}\nURL: ${snapshot.url}`;

  if (snapshot.selection) {
    const selection = nano ? snapshot.selection.slice(0, 1500) : snapshot.selection;
    text += `\n\n[User-selected text on the page — prioritize this]\n${selection}`;
  }
  if (pickedSelector) text += `\nPicked element selector: ${pickedSelector}`;

  const chunks = nano ? chunkPageText(snapshot.text, 4, 400) : chunkPageText(snapshot.text);
  if (chunks.length) {
    text += `\n\nPage passages (cite facts as [n]):\n${chunks.map((chunk, index) => `[${index + 1}] ${chunk}`).join("\n")}`;
    text += "\n\nWhen you state a fact from the page, cite it like [2].";
  }

  const outline = nano ? String(snapshot.outline || "").slice(0, 1500) : snapshot.outline;
  text += `\n\nDOM outline:\n${outline}`;
  return { text, chunks };
}

export function downloadTextFile(name, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
