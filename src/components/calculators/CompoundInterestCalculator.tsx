"use client";

import { useMemo, useState } from "react";
import NumberField from "./NumberField";

export default function CompoundInterestCalculator() {
  const [principal, setPrincipal] = useState(100);
  const [monthly, setMonthly] = useState(20);
  const [rate, setRate] = useState(5);
  const [years, setYears] = useState(5);

  const data = useMemo(() => {
    const monthlyRate = rate / 100 / 12;
    const months = Math.max(Math.round(years), 0) * 12;

    let balance = principal;
    let contributed = principal;
    const yearly: { year: number; balance: number }[] = [];

    for (let m = 1; m <= months; m++) {
      balance = balance * (1 + monthlyRate) + monthly;
      contributed += monthly;
      if (m % 12 === 0) {
        yearly.push({ year: m / 12, balance });
      }
    }

    return {
      yearly,
      balance,
      contributed,
      interestEarned: Math.max(balance - contributed, 0),
    };
  }, [principal, monthly, rate, years]);

  const maxBalance = Math.max(...data.yearly.map((y) => y.balance), 1);

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <div className="flex flex-col gap-4">
        <NumberField
          id="principal"
          label="Starting amount"
          value={principal}
          onChange={setPrincipal}
          prefix="$"
        />
        <NumberField
          id="monthly"
          label="Add per month"
          value={monthly}
          onChange={setMonthly}
          prefix="$"
        />
        <NumberField
          id="rate"
          label="Annual interest rate"
          value={rate}
          onChange={setRate}
          suffix="%"
          step={0.1}
        />
        <NumberField
          id="years"
          label="Number of years"
          value={years}
          onChange={setYears}
          suffix="yrs"
        />
      </div>

      <div className="rounded-lg border border-border bg-surface-hover p-6">
        <p className="text-sm text-foreground/60">
          After {years} {years === 1 ? "year" : "years"}, you&apos;d have
        </p>
        <p className="mt-1 text-3xl font-semibold text-navy dark:text-baby-blue">
          ${data.balance.toFixed(2)}
        </p>

        <div className="mt-4 flex gap-6 text-sm">
          <div>
            <p className="text-foreground/50">You put in</p>
            <p className="font-medium">${data.contributed.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-foreground/50">Interest earned</p>
            <p className="font-medium text-navy dark:text-baby-blue">
              ${data.interestEarned.toFixed(2)}
            </p>
          </div>
        </div>

        {data.yearly.length > 0 && (
          <div className="mt-6 flex h-32 items-end gap-1 overflow-x-auto">
            {data.yearly.map((y) => (
              <div
                key={y.year}
                title={`Year ${y.year}: $${y.balance.toFixed(2)}`}
                className="w-2 shrink-0 rounded-t bg-navy dark:bg-baby-blue"
                style={{
                  height: `${Math.max((y.balance / maxBalance) * 100, 2)}%`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
