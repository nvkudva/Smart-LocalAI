// Reasoning travels through the stream as an inline <think>…</think> block, the
// format many local models already emit. Transports wrap separate reasoning
// fields into it; the UI and chat history split it back out.
const OPEN_TAG = "<think>";
const CLOSE_TAG = "</think>";

export function wrapReasoning() {
  let isReasoning = false;
  return ({ reasoning = "", content = "" }) => {
    let wrapped = "";
    if (reasoning) {
      if (!isReasoning) wrapped += OPEN_TAG;
      isReasoning = true;
      wrapped += reasoning;
    }
    if (content) {
      if (isReasoning) wrapped += CLOSE_TAG;
      isReasoning = false;
      wrapped += content;
    }
    return wrapped;
  };
}

export function splitThinking(text) {
  let rest = String(text ?? "");
  const thinkingParts = [];
  let answer = "";
  let isThinking = false;

  // Some chat templates open the block in the prompt, so only "</think>" streams.
  const firstClose = rest.indexOf(CLOSE_TAG);
  const firstOpen = rest.indexOf(OPEN_TAG);
  if (firstClose !== -1 && (firstOpen === -1 || firstClose < firstOpen)) {
    thinkingParts.push(rest.slice(0, firstClose));
    rest = rest.slice(firstClose + CLOSE_TAG.length);
  }

  let openAt = rest.indexOf(OPEN_TAG);
  while (openAt !== -1) {
    answer += rest.slice(0, openAt);
    const afterOpen = rest.slice(openAt + OPEN_TAG.length);
    const closeAt = afterOpen.indexOf(CLOSE_TAG);
    if (closeAt === -1) {
      thinkingParts.push(afterOpen);
      isThinking = true;
      rest = "";
      break;
    }
    thinkingParts.push(afterOpen.slice(0, closeAt));
    rest = afterOpen.slice(closeAt + CLOSE_TAG.length);
    openAt = rest.indexOf(OPEN_TAG);
  }
  answer += rest;

  const thinking = thinkingParts.map((part) => part.trim()).filter(Boolean).join("\n\n");
  return { thinking, answer: answer.replace(/^\s+/, ""), isThinking };
}

export function stripThinking(text) {
  return splitThinking(text).answer;
}
