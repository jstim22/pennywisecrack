"use client";

import { useState } from "react";
import NumberField from "./NumberField";

export default function SavingsGoalCalculator() {
  const [goal, setGoal] = useState(150);
  const [saved, setSaved] = useState(20);
  const [perWeek, setPerWeek] = useState(10);

  const remaining = Math.max(goal - saved, 0);
  const reached = goal > 0 && remaining === 0;
  const weeksNeeded = perWeek > 0 ? Math.ceil(remaining / perWeek) : null;
  const targetDate =
    weeksNeeded !== null
      ? new Date(Date.now() + weeksNeeded * 7 * 24 * 60 * 60 * 1000)
      : null;
  const progress = goal > 0 ? Math.min((saved / goal) * 100, 100) : 0;

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <div className="flex flex-col gap-4">
        <NumberField
          id="goal"
          label="What are you saving for? (goal amount)"
          value={goal}
          onChange={setGoal}
          prefix="$"
        />
        <NumberField
          id="saved"
          label="How much have you saved already?"
          value={saved}
          onChange={setSaved}
          prefix="$"
        />
        <NumberField
          id="perWeek"
          label="How much can you save per week?"
          value={perWeek}
          onChange={setPerWeek}
          prefix="$"
        />
      </div>

      <div className="rounded-lg border border-border bg-surface-hover p-6">
        {reached ? (
          <p className="text-lg font-medium">
            You&apos;ve already hit your goal! 🎉
          </p>
        ) : perWeek <= 0 ? (
          <p className="text-sm text-foreground/60">
            Enter how much you can save each week to see your timeline.
          </p>
        ) : (
          <>
            <p className="text-sm text-foreground/60">
              At this rate, you&apos;ll reach your goal in
            </p>
            <p className="mt-1 text-3xl font-semibold text-navy dark:text-baby-blue">
              {weeksNeeded} {weeksNeeded === 1 ? "week" : "weeks"}
            </p>
            {targetDate && (
              <p className="mt-1 text-sm text-foreground/60">
                around{" "}
                {targetDate.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </>
        )}

        <div className="mt-6">
          <div className="h-2 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full bg-navy dark:bg-baby-blue"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-foreground/50">
            ${saved} of ${goal} saved
          </p>
        </div>
      </div>
    </div>
  );
}
