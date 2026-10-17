// Functions injected with chrome.scripting.executeScript. Each function must stay
// self-contained: the page has no sidebar imports or closure variables.
export function snapshotInPage() {
  function selectorFor(el) {
    if (!el || el === document.body) return "body";
    if (el.id) return "#" + CSS.escape(el.id);
    const testId = el.getAttribute?.("data-testid");
    if (testId) return '[data-testid="' + CSS.escape(testId) + '"]';
    const parts = [];
    let node = el;
    while (node && node !== document.body && parts.length < 5) {
      let part = node.tagName.toLowerCase();
      const classes = Array.from(node.classList || []).slice(0, 2);
      if (classes.length) part += "." + classes.map((c) => CSS.escape(c)).join(".");
      const parent = node.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((s) => s.tagName === node.tagName);
        if (siblings.length > 1) part += ":nth-of-type(" + (siblings.indexOf(node) + 1) + ")";
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(" > ");
  }
  const outline = [];
  const nodes = document.querySelectorAll("h1,h2,h3,a,button,input,textarea,select,[role=button],header,nav,main,article,section");
  for (const el of Array.from(nodes).slice(0, 120)) {
    const text = (el.innerText || el.value || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 80);
    outline.push(el.tagName.toLowerCase() + " " + selectorFor(el) + (text ? ' "' + text + '"' : ""));
  }
  const selection = String(window.getSelection ? window.getSelection() : "").slice(0, 2000);
  return {
    title: document.title,
    url: location.href,
    selection,
    text: (document.body ? document.body.innerText : "").replace(/\n{3,}/g, "\n\n").slice(0, 8000),
    outline: outline.join("\n"),
    htmlLang: document.documentElement.lang || ""
  };
}

export function executeInPage(action) {
  window.__freeAiUndo = window.__freeAiUndo || [];
  function find(selector) {
    if (!selector) return null;
    try { return document.querySelector(selector); } catch { return null; }
  }
  function describe(el) {
    return el ? (el.tagName.toLowerCase() + (el.id ? "#" + el.id : "")) : "nothing";
  }
  try {
    const kind = action.action;
    if (kind === "apply_css") {
      const id = "free-ai-style";
      let styleEl = document.getElementById(id);
      const before = styleEl ? styleEl.textContent : null;
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = id;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = (before || "") + "\n" + (action.css || "");
      window.__freeAiUndo.push({ kind: "css", before });
      return { ok: true, message: "CSS applied (" + (action.css || "").length + " chars)" };
    }
    if (kind === "apply_js") {
      const result = new Function(action.js || "")();
      return { ok: true, message: "JS ran" + (result !== undefined ? ": " + String(result).slice(0, 300) : "") };
    }
    if (kind === "edit_text" || kind === "set_html") {
      const el = find(action.selector);
      if (!el) return { ok: false, message: "Selector not found: " + action.selector };
      const before = el.innerHTML;
      window.__freeAiUndo.push({ kind: "html", selector: action.selector, before });
      if (kind === "edit_text") el.textContent = action.value || "";
      else el.innerHTML = action.value || "";
      return { ok: true, message: "Updated " + describe(el) };
    }
    if (kind === "highlight") {
      const el = find(action.selector);
      if (!el) return { ok: false, message: "Selector not found: " + action.selector };
      const before = el.getAttribute("style") || "";
      window.__freeAiUndo.push({ kind: "style-attr", selector: action.selector, before });
      el.style.outline = "3px solid #0b57d0";
      el.style.outlineOffset = "2px";
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      return { ok: true, message: "Highlighted " + describe(el) };
    }
    if (kind === "remove") {
      const el = find(action.selector);
      if (!el) return { ok: false, message: "Selector not found: " + action.selector };
      const parent = el.parentElement;
      const index = parent ? Array.from(parent.children).indexOf(el) : -1;
      window.__freeAiUndo.push({ kind: "remove", html: el.outerHTML, parentSelector: parent ? (parent.id ? "#" + parent.id : "body") : "body", index });
      el.remove();
      return { ok: true, message: "Removed " + describe(el) };
    }
    if (kind === "click") {
      const el = find(action.selector);
      if (!el) return { ok: false, message: "Selector not found: " + action.selector };
      el.click();
      return { ok: true, message: "Clicked " + describe(el) };
    }
    if (kind === "fill") {
      const el = find(action.selector);
      if (!el) return { ok: false, message: "Selector not found: " + action.selector };
      el.focus();
      el.value = action.value || "";
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return { ok: true, message: "Filled " + describe(el) };
    }
    if (kind === "scroll") {
      const el = action.selector ? find(action.selector) : null;
      if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
      else window.scrollBy({ top: Number(action.value) || 600, behavior: "smooth" });
      return { ok: true, message: "Scrolled" };
    }
    return { ok: false, message: "Unknown action: " + kind };
  } catch (e) {
    return { ok: false, message: String(e?.message || e) };
  }
}

export function undoInPage() {
  const stack = window.__freeAiUndo || [];
  const last = stack.pop();
  if (!last) return { ok: false, message: "Nothing to undo" };
  try {
    if (last.kind === "css") {
      const styleEl = document.getElementById("free-ai-style");
      if (styleEl) {
        if (last.before === null) styleEl.remove();
        else styleEl.textContent = last.before;
      }
    } else if (last.kind === "html") {
      const el = document.querySelector(last.selector);
      if (!el) return { ok: false, message: "Undid " + last.kind + " but the element is gone." };
      el.innerHTML = last.before;
    } else if (last.kind === "style-attr") {
      const el = document.querySelector(last.selector);
      if (!el) return { ok: false, message: "Undid " + last.kind + " but the element is gone." };
      el.setAttribute("style", last.before);
    } else if (last.kind === "remove") {
      const parent = document.querySelector(last.parentSelector) || document.body;
      const temp = document.createElement("div");
      temp.innerHTML = last.html;
      const node = temp.firstElementChild;
      if (node) parent.insertBefore(node, parent.children[last.index] || null);
    }
    return { ok: true, message: "Undid " + last.kind + ". " + stack.length + " left." };
  } catch (e) {
    return { ok: false, message: String(e?.message || e) };
  }
}

export function pickerInPage() {
  return new Promise((resolve) => {
    const old = document.getElementById("free-ai-picker-box");
    if (old) old.remove();
    const box = document.createElement("div");
    box.id = "free-ai-picker-box";
    box.style.cssText = "position:fixed;z-index:2147483647;pointer-events:none;border:2px solid #0b57d0;background:rgba(11,87,208,.12);border-radius:4px;display:none";
    document.body.appendChild(box);
    function selectorFor(el) {
      if (el.id) return "#" + CSS.escape(el.id);
      const testId = el.getAttribute?.("data-testid");
      if (testId) return '[data-testid="' + CSS.escape(testId) + '"]';
      const parts = [];
      let node = el;
      while (node && node !== document.body && parts.length < 5) {
        let part = node.tagName.toLowerCase();
        const classes = Array.from(node.classList || []).slice(0, 2);
        if (classes.length) part += "." + classes.map((c) => CSS.escape(c)).join(".");
        const parent = node.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter((s) => s.tagName === node.tagName);
          if (siblings.length > 1) part += ":nth-of-type(" + (siblings.indexOf(node) + 1) + ")";
        }
        parts.unshift(part);
        node = node.parentElement;
      }
      return parts.join(" > ");
    }
    function onMove(event) {
      const el = event.target;
      if (!el || el === box) return;
      const rect = el.getBoundingClientRect();
      box.style.display = "block";
      box.style.left = rect.left + "px";
      box.style.top = rect.top + "px";
      box.style.width = rect.width + "px";
      box.style.height = rect.height + "px";
      box.dataset.selector = selectorFor(el);
      box.dataset.label = el.tagName.toLowerCase() + " " + (el.innerText || "").trim().slice(0, 60);
    }
    function cleanup(value) {
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey, true);
      box.remove();
      resolve(value);
    }
    function onClick(event) {
      event.preventDefault();
      event.stopPropagation();
      cleanup({ selector: box.dataset.selector || "", label: box.dataset.label || "" });
    }
    function onKey(event) {
      if (event.key === "Escape") cleanup(null);
    }
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
  });
}

export function scrollToChunkInPage(text) {
  try {
    const needle = String(text || "").slice(0, 60);
    if (!needle) return { ok: false, message: "Empty citation" };
    if (typeof window.find === "function") {
      const found = window.find(needle, false, false, true);
      if (found) {
        const node = window.getSelection().anchorNode;
        const el = node?.parentElement ? node.parentElement : document.body;
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        return { ok: true, message: "Scrolled to citation" };
      }
    }
    const short = needle.slice(0, 30);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (node.textContent.includes(short)) {
        const el = node.parentElement || document.body;
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        return { ok: true, message: "Scrolled to citation" };
      }
      node = walker.nextNode();
    }
    return { ok: false, message: "Text not found on page" };
  } catch (e) {
    return { ok: false, message: String(e?.message || e) };
  }
}
