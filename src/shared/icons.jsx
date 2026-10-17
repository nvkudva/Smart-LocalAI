function Base({ size = 18, filled = false, children }) {
  return (
    <svg
      aria-hidden="true"
      fill={filled ? "currentColor" : "none"}
      height={size}
      stroke={filled ? "none" : "currentColor"}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={size}
    >
      {children}
    </svg>
  );
}

export function Sparkle({ size }) {
  return (
    <Base filled size={size}>
      <path d="M12 3l1.9 5.4L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.6L12 3z" />
      <path d="M19 15.5l.8 2.2 2.2.8-2.2.8L19 21.5l-.8-2.2-2.2-.8 2.2-.8L19 15.5z" />
    </Base>
  );
}
export function History({ size }) {
  return (
    <Base size={size}>
      <path d="M3.5 12a8.5 8.5 0 1 1 2.5 6" />
      <path d="M3.5 12H7M3.5 12l2-2.5M12 8v4l3 2" />
    </Base>
  );
}
export function Plus({ size }) {
  return (
    <Base size={size}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  );
}
export function Theme({ size }) {
  return (
    <Base size={size}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </Base>
  );
}
export function Settings({ size }) {
  return (
    <Base size={size}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
      <path d="M4 12h16" opacity="0" />
    </Base>
  );
}
export function Close({ size }) {
  return (
    <Base size={size}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Base>
  );
}
export function Pick({ size }) {
  return (
    <Base size={size}>
      <circle cx="12" cy="12" r="6.5" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
    </Base>
  );
}
export function Undo({ size }) {
  return (
    <Base size={size}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h9.5a5.5 5.5 0 0 1 0 11H10" />
    </Base>
  );
}
export function Check({ size }) {
  return (
    <Base size={size}>
      <path d="M20 6 9 17l-5-5" />
    </Base>
  );
}
export function ChevronDown({ size = 14 }) {
  return (
    <Base size={size}>
      <path d="m6 9 6 6 6-6" />
    </Base>
  );
}
export function Send({ size }) {
  return (
    <Base size={size}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </Base>
  );
}
export function Stop({ size = 14 }) {
  return (
    <Base filled size={size}>
      <rect height="10" rx="2" width="10" x="7" y="7" />
    </Base>
  );
}
export function Mic({ size }) {
  return (
    <Base size={size}>
      <rect height="11" rx="2.5" width="6" x="9" y="2.5" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
    </Base>
  );
}
export function Shield({ size }) {
  return (
    <Base size={size}>
      <path d="M12 21.5s7.5-3.4 7.5-9.5V5.2L12 2.5 4.5 5.2V12c0 6.1 7.5 9.5 7.5 9.5z" />
      <path d="m9 11.5 2.2 2.2L15.5 9.5" />
    </Base>
  );
}
export function ShieldOff({ size }) {
  return (
    <Base size={size}>
      <path d="M12 21.5s7.5-3.4 7.5-9.5V5.2L12 2.5 4.5 5.2V12c0 6.1 7.5 9.5 7.5 9.5z" />
      <path d="M9.5 9.5l5 5M14.5 9.5l-5 5" />
    </Base>
  );
}
export function Image({ size }) {
  return (
    <Base size={size}>
      <rect height="16" rx="2.5" width="20" x="2" y="4" />
      <circle cx="8.5" cy="10" r="1.8" />
      <path d="m4.5 18 5-5 3.5 3.5 3-3 3.5 3.5" />
    </Base>
  );
}
export function Doc({ size }) {
  return (
    <Base size={size}>
      <path d="M6 2.5h8L19 7.5V21.5H6z" />
      <path d="M13.5 2.5v5.5H19" />
      <path d="M9 12.5h6M9 16h6" />
    </Base>
  );
}
export function Inspect({ size }) {
  return (
    <Base size={size}>
      <rect height="11" rx="1.5" strokeDasharray="3 2" width="12" x="9" y="7" />
      <path d="M2.5 2.5 10 15l-2.4-.7-1.4 2.7-1.7-1L5.7 13 2.5 12z" />
    </Base>
  );
}
export function Thinking({ size }) {
  return (
    <Base size={size}>
      <path d="M9.5 18h5M10.5 21h3" />
      <path d="M12 3a6 6 0 0 0-3.3 10.9c.7.6 1.1 1.3 1.3 2.1h4c.2-.8.6-1.5 1.3-2.1A6 6 0 0 0 12 3z" />
    </Base>
  );
}
export function Globe({ size }) {
  return (
    <Base size={size}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z" />
    </Base>
  );
}
export function Trash({ size = 15 }) {
  return (
    <Base size={size}>
      <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5" />
    </Base>
  );
}
