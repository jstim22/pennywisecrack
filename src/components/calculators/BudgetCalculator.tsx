"use client";

import Link from "next/link";
import { useState } from "react";
import NumberField from "./NumberField";
import Segmented from "./Segmented";
import Disclosure from "./Disclosure";
import StateSelect from "./StateSelect";
import { dollars, rate1 } from "@/lib/format";
import {
  BUCKETS,
  PRESETS,
  WEEKS_PER_MONTH,
  estimateBudget,
  type BucketId,
  type Percents,
} from "@/lib/budget";
import { estimatePaycheck } from "@/lib/paycheckTax";

const SWATCH: Record<BucketId, string> = {
  housing: "bg-[#2a78d6] dark:bg-[#3987e5]",
  needs: "bg-[#eb6834] dark:bg-[#d95926]",
  wants: "bg-[#1baf7a] dark:bg-[#199e70]",
  savings: "bg-[#eda100] dark:bg-[#c98500]",
};

const PAY_MODES: { value: "known" | "estimate"; label: string }[] = [
  { value: "known", label: "I know my take-home" },
  { value: "estimate", label: "Estimate from my salary" },
];

export default function BudgetCalculator() {
  const [mode, setMode] = useState<"known" | "estimate">("known");
  const [takeHome, setTakeHome] = useState(4_000);
  const [yearlyPay, setYearlyPay] = useState(60_000);
  const [stateCode, setStateCode] = useState("");
  const [percents, setPercents] = useState<Percents>(PRESETS[0].percents);
  const [spent, setSpent] = useState<Record<BucketId, number>>({
    housing: 0,
    needs: 0,
    wants: 0,
    savings: 0,
  });

  // Take-home pay estimated from a yearly salary, paid monthly.
  const estimated = estimatePaycheck({
    payType: "salary",
    hourlyWage: 0,
    hoursPerWeek: 0,
    tipsPerWeek: 0,
    annualSalary: yearlyPay,
    payFrequency: "monthly",
    stateCode,
    retirementPct: 0,
    retirementType: "traditional",
    insurancePreTaxPerPaycheck: 0,
    insurancePostTaxPerPaycheck: 0,
    hsaPerPaycheck: 0,
    otherPreTaxPerPaycheck: 0,
    otherPostTaxPerPaycheck: 0,
    skipFica: false,
  }).perPaycheck.takeHome;

  const income = mode === "known" ? takeHome : estimated;
  const b = estimateBudget({ monthlyIncome: income, percents, spent });
  const activePreset = PRESETS.find((p) =>
    (Object.keys(p.percents) as BucketId[]).every((id) => p.percents[id] === percents[id]),
  );

  const shown = b.buckets.filter((x) => x.pct > 0);

  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <span className="text-sm font-medium text-foreground/80">
              Your pay
            </span>
            <Segmented options={PAY_MODES} value={mode} onChange={setMode} />
          </div>

          {mode === "known" ? (
            <div>
              <NumberField
                id="takeHome"
                label="Your monthly take-home pay"
                value={takeHome}
                onChange={setTakeHome}
                prefix="$"
              />
              <p className="mt-1.5 text-xs text-foreground/50">
                What lands in your bank account each month after taxes and
                anything taken out of your paycheck. Include other regular
                income, like a side job.
              </p>
            </div>
          ) : (
            <>
              <NumberField
                id="yearlyPay"
                label="Your yearly pay (before taxes)"
                value={yearlyPay}
                onChange={setYearlyPay}
                prefix="$"
              />
              <StateSelect
                value={stateCode}
                onChange={setStateCode}
                hideNote
                helper="Pick your state to include its income tax."
              />
              <p className="-mt-2 text-xs text-foreground/50">
                We estimate about {dollars(estimated)} a month after federal,
                state, and payroll taxes. The{" "}
                <Link href="/calculators/paycheck" className="underline hover:text-foreground">
                  Paycheck Estimator
                </Link>{" "}
                can add things like health insurance and a 401(k).
              </p>
            </>
          )}

          <div>
            <span className="text-sm font-medium text-foreground/80">
              How do you want to split it?
            </span>
            <div className="mt-1 grid grid-cols-2 gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPercents(p.percents)}
                  aria-pressed={activePreset?.id === p.id}
                  className={
                    "rounded-md border py-1.5 text-sm font-medium transition-colors " +
                    (activePreset?.id === p.id
                      ? "border-navy bg-navy text-white dark:border-baby-blue dark:bg-baby-blue dark:text-navy"
                      : "border-border hover:bg-surface-hover")
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-foreground/50">
              {activePreset
                ? activePreset.note
                : "Your own split. Change the percentages below."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {BUCKETS.map((bucket) => (
              <NumberField
                key={bucket.id}
                id={`pct-${bucket.id}`}
                label={bucket.label}
                value={percents[bucket.id]}
                onChange={(v) => setPercents((prev) => ({ ...prev, [bucket.id]: v }))}
                suffix="%"
                step={1}
              />
            ))}
          </div>
          <p
            className={
              "-mt-2 text-xs " +
              (b.balanced ? "text-foreground/50" : "font-medium text-[#c0410f] dark:text-[#f0916b]")
            }
          >
            {b.balanced
              ? "Adds up to 100%."
              : b.unassignedPct > 0
                ? `Adds up to ${rate1(b.totalPct / 100)}, so ${dollars(b.unassigned)} a month isn't assigned to a bucket.`
                : `Adds up to ${rate1(b.totalPct / 100)}, which is ${dollars(-b.unassigned)} a month more than you have.`}
          </p>

          <Disclosure title="Track this month's spending (optional)">
            <p className="text-xs text-foreground/50">
              Enter what you&apos;ve spent so far this month in each bucket and
              we&apos;ll show what&apos;s left.
            </p>
            {BUCKETS.map((bucket) => (
              <NumberField
                key={bucket.id}
                id={`spent-${bucket.id}`}
                label={
                  bucket.id === "savings"
                    ? "Saved so far"
                    : `Spent so far on ${bucket.label.toLowerCase()}`
                }
                value={spent[bucket.id]}
                onChange={(v) => setSpent((prev) => ({ ...prev, [bucket.id]: v }))}
                prefix="$"
              />
            ))}
          </Disclosure>
        </div>

        <div className="min-w-0 rounded-lg border border-border bg-surface-hover p-6 sm:sticky sm:top-6 sm:self-start">
          {b.income <= 0 ? (
            <p className="text-sm text-foreground/60">
              Enter your pay to see how much you can spend each month.
            </p>
          ) : (
            <>
              <p className="text-sm text-foreground/60">
                Of your {dollars(b.income)} a month, you can spend about
              </p>
              <p className="mt-1 text-3xl font-semibold text-navy dark:text-baby-blue">
                {dollars(b.spendMonthly)}
              </p>
              <p className="mt-1 text-sm text-foreground/60">
                a month, and set aside {dollars(b.saveMonthly)}. That&apos;s
                about {dollars(b.spendMonthly / WEEKS_PER_MONTH)} a week to
                spend.
              </p>

              {b.hasSpent && (
                <div className="mt-3 rounded-md border border-navy/40 bg-navy/5 p-3 text-sm dark:border-baby-blue/40 dark:bg-baby-blue/10">
                  {b.spendRemaining >= 0 ? (
                    <>
                      You have{" "}
                      <span className="font-semibold">{dollars(b.spendRemaining)}</span>{" "}
                      left to spend across housing, needs, and wants this month.
                    </>
                  ) : (
                    <>
                      You&apos;re{" "}
                      <span className="font-semibold">{dollars(-b.spendRemaining)}</span>{" "}
                      over across housing, needs, and wants this month.
                    </>
                  )}
                </div>
              )}

              <div
                role="img"
                aria-label={`Your pay split into buckets: ${shown
                  .map((x) => `${x.label} ${rate1(x.pct / 100)}`)
                  .join(", ")}`}
                className="mt-5 flex h-3 gap-0.5 overflow-hidden rounded-full"
              >
                {shown.map((x) => (
                  <div
                    key={x.id}
                    title={`${x.label}: ${dollars(x.monthly)}`}
                    className={`${SWATCH[x.id]} min-w-0.5`}
                    style={{ flexGrow: x.pct, flexBasis: 0 }}
                  />
                ))}
              </div>

              <ul className="mt-4 flex flex-col gap-4">
                {b.buckets.map((x) => (
                  <li key={x.id}>
                    <div className="flex items-start gap-3 text-sm">
                      <span
                        className={`mt-1 h-3 w-3 shrink-0 rounded-sm ${SWATCH[x.id]}`}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        {x.label}
                        <span className="block text-xs text-foreground/50">
                          {rate1(x.pct / 100)} · {dollars(x.weekly)} a week ·{" "}
                          {dollars(x.daily)} a day
                        </span>
                      </span>
                      <span className="text-right text-base font-semibold">
                        {dollars(x.monthly)}
                        <span className="block text-xs font-normal text-foreground/50">
                          a month
                        </span>
                      </span>
                    </div>
                    {x.spent > 0 && (
                      <div className="ml-6 mt-2">
                        <div className="h-1.5 overflow-hidden rounded-full bg-border">
                          <div
                            className={
                              "h-full " +
                              (x.overBy > 0
                                ? "bg-[#eb6834] dark:bg-[#d95926]"
                                : "bg-navy dark:bg-baby-blue")
                            }
                            style={{ width: `${Math.min(x.usedShare, 1) * 100}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-foreground/60">
                          {x.id === "savings"
                            ? x.remaining > 0
                              ? `${dollars(x.spent)} saved · ${dollars(x.remaining)} to go`
                              : `${dollars(x.spent)} saved · goal reached`
                            : x.overBy > 0
                              ? `${dollars(x.spent)} spent · ${dollars(x.overBy)} over`
                              : `${dollars(x.spent)} spent · ${dollars(x.remaining)} left`}
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              <p className="mt-4 text-xs text-foreground/60">
                Housing and other needs together are{" "}
                <span className="font-medium text-foreground">
                  {dollars(b.needsMonthly)}
                </span>{" "}
                ({rate1(b.needsPct / 100)} of your pay).
              </p>
            </>
          )}
        </div>
      </div>

      {b.income > 0 && (
        <>
          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-baby-blue">
              One way to split each bucket
            </h2>
            <p className="mt-1 max-w-xl text-sm text-foreground/60">
              Just examples to get you started. Your life won&apos;t match
              exactly, and that&apos;s fine.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {b.buckets
                .filter((x) => x.examples.length > 0)
                .map((x) => (
                  <div key={x.id} className="rounded-lg border border-border p-4">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span className={`h-3 w-3 rounded-sm ${SWATCH[x.id]}`} aria-hidden="true" />
                      {x.label}
                      <span className="text-xs font-normal text-foreground/50">
                        {dollars(x.monthly)}
                      </span>
                    </p>
                    <ul className="mt-3 flex flex-col gap-2 text-sm">
                      {x.examples.map((e) => (
                        <li key={e.label} className="flex items-baseline justify-between gap-3">
                          <span className="min-w-0 text-foreground/70">{e.label}</span>
                          <span className="font-medium">{dollars(e.monthly)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </section>

          <section className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <h3 className="font-medium">If housing costs more than its bucket</h3>
              <p className="mt-1 text-foreground/60">
                In expensive areas, rent or a mortgage can eat well over 25%.
                When it does, take the extra from wants first, then from
                savings, and try not to touch the essentials in other needs.
                Then look for ways to bring housing down over time, like a
                roommate or a cheaper place.
              </p>
            </div>
            <div>
              <h3 className="font-medium">If your savings bucket feels too big</h3>
              <p className="mt-1 text-foreground/60">
                Saving 25% is an ambitious target. Any of it counts, and
                things like a 401(k) match, emergency fund, and paying down
                high-interest debt all belong in this bucket. Start where you
                can and raise it when your pay does.
              </p>
            </div>
          </section>

          <p className="text-xs text-foreground/50">
            A planning guide, not financial advice. Percentages are applied to
            your take-home pay. The 50/30/20 rule comes from Elizabeth Warren
            and Amelia Warren Tyagi&apos;s book <em>All Your Worth</em>; the
            25/25/25/25 split simply gives housing its own bucket. Your
            situation may call for different numbers.
          </p>
        </>
      )}
    </div>
  );
}
