"use client";

import { useRef } from "react";
import CurrencyInput from "./CurrencyInput";
import type { LumpSum } from "@/lib/growth";

// One-time deposits: each row is a moment on the timeline (an age or a year,
// depending on the calculator) plus an amount.
export default function LumpSumsField({
  lumpSums,
  onChange,
  choices,
  what,
}: {
  lumpSums: LumpSum[];
  onChange: (next: LumpSum[]) => void;
  // The moments a lump sum can land on, e.g. "Age 17" or "Year 3".
  choices: { value: number; label: string }[];
  // How the timeline is described in the "outside" note, e.g. "Age 30".
  what: (at: number) => string;
}) {
  const nextId = useRef(1);

  function update(id: number, changes: Partial<LumpSum>) {
    onChange(lumpSums.map((l) => (l.id === id ? { ...l, ...changes } : l)));
  }

  return (
    <div>
      <span className="text-sm font-medium text-foreground/80">
        One-time lump sums
      </span>
      <p className="mt-0.5 text-xs text-foreground/50">
        A bonus, gift, or inheritance you plan to invest all at once — pick
        when you&apos;ll add it.
      </p>

      {lumpSums.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          {lumpSums.map((lump) => {
            const outside = !choices.some((c) => c.value === lump.at);
            return (
              <div key={lump.id}>
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                  <select
                    aria-label="When to add this lump sum"
                    value={lump.at}
                    onChange={(e) =>
                      update(lump.id, { at: Number(e.target.value) })
                    }
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-navy dark:focus:border-baby-blue"
                  >
                    {outside && (
                      <option value={lump.at}>{what(lump.at)}</option>
                    )}
                    {choices.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex min-w-0 items-center rounded-md border border-border px-2 focus-within:border-navy dark:focus-within:border-baby-blue">
                    <span className="text-sm text-foreground/50">$</span>
                    <CurrencyInput
                      ariaLabel="Lump sum amount"
                      value={lump.amount}
                      onChange={(v) => update(lump.id, { amount: v })}
                      className="min-w-0 flex-1 bg-transparent px-1.5 py-1.5 text-right text-sm outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onChange(lumpSums.filter((l) => l.id !== lump.id))
                    }
                    aria-label="Remove this lump sum"
                    className="rounded-md border border-border px-2 py-1.5 text-sm text-foreground/60 transition-colors hover:bg-surface-hover"
                  >
                    ✕
                  </button>
                </div>
                {outside && (
                  <p className="mt-1 text-xs text-foreground/50">
                    {what(lump.at)} is outside your timeline, so this one
                    isn&apos;t counted.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() =>
          onChange([
            ...lumpSums,
            {
              id: nextId.current++,
              at: choices[0]?.value ?? 1,
              amount: 1_000,
            },
          ])
        }
        disabled={choices.length === 0}
        className="mt-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        + Add a lump sum
      </button>
    </div>
  );
}
