export function SinkingFundIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <ellipse cx="12" cy="14" rx="8" ry="5.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="19" cy="14" r="1.2" fill="currentColor" />
      <path d="M8 9.5l1.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 19v2M16 19v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 8.5v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="11" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function CompoundInterestIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="14" width="3" height="6" rx="0.5" fill="currentColor" opacity="0.5" />
      <rect x="9" y="10" width="3" height="10" rx="0.5" fill="currentColor" opacity="0.75" />
      <rect x="14" y="5" width="3" height="15" rx="0.5" fill="currentColor" />
      <path
        d="M4 8l6-4 4 2 6-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 2h4v4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RetirementIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="13" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M12 5v2M5.5 8l1.4 1.4M18.5 8l-1.4 1.4M3.5 13H5M19 13h1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BonusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="11" width="16" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="7.5" width="18" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <line x1="12" y1="7.5" x2="12" y2="20" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 7.5C10.5 4 7 4.2 7 6.2c0 1.6 2.6 1.7 5 1.3zM12 7.5c1.5-3.5 5-3.3 5-1.3 0 1.6-2.6 1.7-5 1.3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PaycheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="6" width="20" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="1.3" />
      <text
        x="12"
        y="14.3"
        textAnchor="middle"
        fontSize="4.2"
        fontWeight="700"
        fill="currentColor"
        fontFamily="Arial, sans-serif"
      >
        $
      </text>
      <line x1="5" y1="9" x2="7" y2="9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="17" y1="16" x2="19" y2="16" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function TaxIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 3h9l4 4v14H6V3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M15 3v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 17l6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="9.5" cy="11.5" r="1" fill="currentColor" />
      <circle cx="14.5" cy="16.5" r="1" fill="currentColor" />
    </svg>
  );
}
