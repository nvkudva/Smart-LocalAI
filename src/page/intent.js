// Deterministic intent split: page-edit requests go to the agent flow,
// everything else stays a plain chat (no action parsing, single generation).
const EDIT_VERB =
  "(make|change|modify|update|set|hide|show|remove|delete|click|press|tap|fill|scroll|move|resize|enlarge|shrink|highlight|restyle|redesign|replace|rename|bold|italicize|underline|darken|lighten|add|insert|translate|fix|improve|open|select|type|close|dismiss|submit)";
const TARGET =
  "(page|heading|headings|title|text|button|buttons|link|links|color|colour|background|font|banner|popup|popups|sidebar|menu|image|images|header|footer|element|cta|form|input|inputs|section|sections|paragraph|logo|icon|icons|widget|widgets|cookie|cookies|ad|ads|theme|layout|style|styles|styling|css|distractions|readability)";

const ACTION_PATTERNS = [
  /\b(dark mode|light mode)\b/i,
  /\bapply (with |using )?css\b/i,
  /\b(remove|hide|delete)\b[^.?!]{0,40}\bthis page\b/i,
  /\b(check|review|inspect|audit)\b[^.?!]{0,30}\b(style|styles|styling|css|design|layout|theme)\b/i,
  new RegExp(`\\b(type|fill)\\b[^.?!]{0,30}\\binto\\b[^.?!]{0,30}\\b${TARGET}\\b`, "i"),
  new RegExp(`\\b${EDIT_VERB}\\s+(the|this|that|all|every)\\s+${TARGET}\\b`, "i"),
  new RegExp(`^\\s*(please\\s+)?(can you\\s+|could you\\s+)?${EDIT_VERB}\\b(\\s+\\S+){0,2}\\s+${TARGET}\\b`, "i"),
  new RegExp(`\\b(click|scroll|fill|tap|press)\\b[^.?!]{0,30}\\b${TARGET}\\b`, "i"),
];

export function isPageActionIntent(text) {
  const value = String(text || "");
  return ACTION_PATTERNS.some((pattern) => pattern.test(value));
}
