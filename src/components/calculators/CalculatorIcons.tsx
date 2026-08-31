export function SavingsGoalIcon({ className }: { className?: string }) {
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
