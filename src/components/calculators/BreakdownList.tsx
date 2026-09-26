import { dollars, rate1 } from "@/lib/format";

export type BreakdownPart = {
  key: string;
  label: string;
  detail?: string;
  amount: number;
  // Tailwind background classes for the bar segment and swatch.
  swatch: string;
};

// A stacked bar plus a list: what a total is made of, in dollars and percent.
export default function BreakdownList({
  parts,
  summary,
  cents = false,
}: {
  parts: BreakdownPart[];
  // Spoken description of the bar, e.g. "Where your monthly payment goes".
  summary: string;
  cents?: boolean;
}) {
  const shown = parts.filter((p) => p.amount > 0.005);
  const total = shown.reduce((sum, p) => sum + p.amount, 0);
  const money = (n: number) =>
    cents
      ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : dollars(n);

  return (
    <div>
      <div
        role="img"
        aria-label={`${summary}: ${shown
          .map((p) => `${p.label} ${rate1(total > 0 ? p.amount / total : 0)}`)
          .join(", ")}`}
        className="flex h-3 gap-0.5 overflow-hidden rounded-full"
      >
        {shown.map((p) => (
          <div
            key={p.key}
            title={`${p.label}: ${money(p.amount)}`}
            className={`${p.swatch} min-w-0.5`}
            style={{ flexGrow: p.amount, flexBasis: 0 }}
          />
        ))}
      </div>
      <ul className="mt-4 flex flex-col gap-2.5 text-sm">
        {shown.map((p) => (
          <li key={p.key} className="flex items-start gap-3">
            <span
              className={`mt-1 h-3 w-3 shrink-0 rounded-sm ${p.swatch}`}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              {p.label}
              {p.detail && (
                <span className="block text-xs text-foreground/50">
                  {p.detail}
                </span>
              )}
            </span>
            <span className="text-right">
              <span className="font-medium">{money(p.amount)}</span>
              <span className="block text-xs text-foreground/50">
                {rate1(total > 0 ? p.amount / total : 0)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
