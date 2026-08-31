"use client";

import { useState } from "react";
import NumberField from "./NumberField";

export default function PaycheckCalculator() {
  const [wage, setWage] = useState(15);
  const [hours, setHours] = useState(10);
  const [withholding, setWithholding] = useState(10);

  const weeklyGross = wage * hours;
  const weeklyTakeHome = weeklyGross * (1 - withholding / 100);
  const monthlyGross = weeklyGross * (52 / 12);
  const monthlyTakeHome = weeklyTakeHome * (52 / 12);

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <div className="flex flex-col gap-4">
        <NumberField
          id="wage"
          label="Hourly wage"
          value={wage}
          onChange={setWage}
          prefix="$"
        />
        <NumberField
          id="hours"
          label="Hours per week"
          value={hours}
          onChange={setHours}
          suffix="hrs"
        />
        <NumberField
          id="withholding"
          label="Estimated taxes withheld"
          value={withholding}
          onChange={setWithholding}
          suffix="%"
        />
        <p className="text-xs text-foreground/50">
          This is a rough estimate — actual paycheck deductions depend on
          where you live and how your employer sets up payroll.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface-hover p-6">
        <p className="text-sm text-foreground/60">
          Estimated weekly take-home pay
        </p>
        <p className="mt-1 text-3xl font-semibold text-navy dark:text-baby-blue">
          ${weeklyTakeHome.toFixed(2)}
        </p>
        <p className="mt-1 text-xs text-foreground/50">
          (${weeklyGross.toFixed(2)} gross before taxes)
        </p>

        <div className="mt-6 border-t border-border pt-4">
          <p className="text-sm text-foreground/60">
            Estimated monthly take-home pay
          </p>
          <p className="mt-1 text-xl font-semibold">
            ${monthlyTakeHome.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-foreground/50">
            (${monthlyGross.toFixed(2)} gross before taxes)
          </p>
        </div>
      </div>
    </div>
  );
}
