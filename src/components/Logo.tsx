// The PennyWisecrack mark: a penny that's also a lightbulb (a bright idea).
// The coin is the bulb, with a small screw base underneath and a little
// highlight on its upper-left edge. The glow lives on the homepage hero (it
// radiates from this mark there), not in the mark itself. The ¢'s bar is two
// short stubs above and below the C (not through it), on the coin's center
// line. Yellow coin, gold base and navy ¢ read on both light and dark
// backgrounds, so there are no theme variants. Keep in sync with
// src/app/icon.svg (a test checks they match).
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 4 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="32" cy="30" r="19" fill="#f2c94c" />
      <circle
        cx="32"
        cy="30"
        r="14.5"
        stroke="#1e3a5f"
        strokeOpacity=".3"
        strokeWidth="2"
      />
      <path
        d="M18.1 20.3A17 17 0 0 1 27.6 13.6"
        stroke="#ffffff"
        strokeOpacity=".7"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M36.3 24.5a7 7 0 1 0 0 11"
        stroke="#1e3a5f"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path d="M32 19v4" stroke="#1e3a5f" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M32 37v4" stroke="#1e3a5f" strokeWidth="3.2" strokeLinecap="round" />
      <g stroke="#e0a100" strokeWidth="3.6" strokeLinecap="round">
        <path d="M25 53h14" />
        <path d="M28 58.5h8" />
      </g>
    </svg>
  );
}

const SIZES = {
  // Footer and other small spots.
  sm: { mark: "h-9 w-9", text: "text-lg", gap: "gap-2" },
  // The site header.
  md: { mark: "h-11 w-11", text: "text-xl", gap: "gap-2.5" },
} as const;

export default function Logo({
  size = "md",
  className = "",
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <span
      className={`inline-flex items-center font-semibold tracking-tight text-navy dark:text-baby-blue ${s.gap} ${s.text} ${className}`}
    >
      <LogoMark className={s.mark} />
      PennyWisecrack
    </span>
  );
}
