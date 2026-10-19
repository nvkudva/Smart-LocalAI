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

export function Logo({ size = 22 }) {
  return (
    <svg aria-hidden="true" height={size} viewBox="0 0 64 64" width={size}>
      <defs>
        <linearGradient id="logo-tile" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#F4F8FF" />
          <stop offset="1" stopColor="#D3E3FD" />
        </linearGradient>
      </defs>
      <rect fill="url(#logo-tile)" height="64" rx="15" width="64" />
      <rect fill="none" height="62" rx="14" stroke="#1B3260" strokeOpacity=".12" strokeWidth="2" width="62" x="1" y="1" />
      <path
        d="M28 10c.9 10.5 4.2 16.8 13.5 21C32.2 35.2 28.9 41.5 28 54 27.1 41.5 23.8 35.2 14.5 31 23.8 26.8 27.1 20.5 28 10z"
        fill="#1B3260"
      />
      <path
        d="M47 9c.8 5 3 7.6 8 8.5-5 .9-7.2 3.5-8 8.5-.8-5-3-7.6-8-8.5 5-.9 7.2-3.5 8-8.5z"
        fill="#2563EB"
      />
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
export function NewChat({ size }) {
  return (
    <Base size={size}>
      <path d="M12 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-5" />
      <path d="M18.4 3.6a1.9 1.9 0 0 1 2.7 2.7L12 15.4l-3.6.9.9-3.6 9.1-9.1z" />
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
export function Target({ size }) {
  return (
    <Base size={size}>
      <circle cx="12" cy="12" r="3.4" />
      <circle cx="12" cy="12" r="8" strokeDasharray="3 3" />
      <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" />
    </Base>
  );
}
export function Notes({ size }) {
  return (
    <Base filled size={size}>
      <rect height="2.3" rx="1.15" width="18" x="3" y="4.6" />
      <rect height="2.3" rx="1.15" width="18" x="3" y="9.7" />
      <rect height="2.3" rx="1.15" width="11" x="3" y="14.8" />
    </Base>
  );
}
export function TypeScale({ size }) {
  return (
    <Base size={size}>
      <path d="M3 19.5 7.2 7l4.2 12.5M4.6 15.3h5.2" />
      <path d="M17.6 19.5V9.6M15.3 12.1l2.3-2.5 2.3 2.5" />
    </Base>
  );
}
export function Table({ size }) {
  return (
    <Base size={size}>
      <rect height="15" rx="2.5" width="18" x="3" y="4.5" />
      <path d="M3 9.5h18M9.6 9.5v10M15 9.5v10" />
    </Base>
  );
}
export function EyeOff({ size }) {
  return (
    <Base size={size}>
      <path d="M3.5 3.5l17 17" />
      <path d="M10.4 6.2A9.6 9.6 0 0 1 12 6.1c5 0 8.4 5.9 8.4 5.9a15.6 15.6 0 0 1-3.2 3.6M6.5 7.9A15.4 15.4 0 0 0 3.6 12s3.4 5.9 8.4 5.9c1.2 0 2.3-.3 3.3-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </Base>
  );
}
export function Search({ size }) {
  return (
    <Base size={size}>
      <circle cx="10.8" cy="10.8" r="6.5" />
      <path d="m15.6 15.6 4.6 4.6" />
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
export function Copy({ size = 14 }) {
  return (
    <Base size={size}>
      <rect height="12" rx="2" width="12" x="9" y="9" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </Base>
  );
}
export function Branch({ size = 14 }) {
  return (
    <Base size={size}>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="12" r="2.5" />
      <path d="M6 8.5v7M8 6h3a4 4 0 0 1 4 4v.5" />
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
