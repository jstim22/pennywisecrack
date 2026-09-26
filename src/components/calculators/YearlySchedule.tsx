import CurrencyInput from "./CurrencyInput";
import PlainNumberInput from "./PlainNumberInput";
import type { YearOverride } from "@/lib/growth";

// The "Customize by year" table: a contribution and a return for each year.
export default function YearlySchedule({
  rows,
  amountHeader,
  emptyMessage,
  getContribution,
  getRate,
  onChange,
}: {
  rows: { year: number; label: string }[];
  amountHeader: string;
  emptyMessage: string;
  getContribution: (year: number) => number;
  getRate: (year: number) => number;
  onChange: (year: number, field: keyof YearOverride, value: number) => void;
}) {
  return (
    <div className="rounded-md border border-border">
      {rows.length === 0 ? (
        <p className="p-3 text-xs text-foreground/50">{emptyMessage}</p>
      ) : (
        <>
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-border px-3 py-2 text-xs font-medium text-foreground/50">
            <span>Year</span>
            <span className="w-24 text-right">{amountHeader}</span>
            <span className="w-16 text-right">Return</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {rows.map(({ year, label }) => (
              <div
                key={year}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-border px-3 py-1.5 text-sm last:border-b-0"
              >
                <span className="text-foreground/60">{label}</span>
                <CurrencyInput
                  value={getContribution(year)}
                  onChange={(v) => onChange(year, "contribution", v)}
                  className="w-24 rounded border border-border bg-transparent px-1.5 py-1 text-right text-sm outline-none focus:border-navy dark:focus:border-baby-blue"
                />
                <PlainNumberInput
                  step={0.1}
                  value={getRate(year)}
                  onChange={(v) => onChange(year, "rate", v)}
                  className="w-16 rounded border border-border bg-transparent px-1.5 py-1 text-right text-sm outline-none focus:border-navy dark:focus:border-baby-blue [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
