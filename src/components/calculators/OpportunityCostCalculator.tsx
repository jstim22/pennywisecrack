"use client";

import { useMemo, useState } from "react";
import NumberField from "./NumberField";
import Disclosure from "./Disclosure";
import CheckRow from "./CheckRow";
import RetirementChart from "./RetirementChart";
import MonteCarloResults from "./MonteCarloResults";
import { dollars } from "@/lib/format";
import { runMonteCarlo } from "@/lib/growth";
import { estimateOpportunityCost } from "@/lib/opportunityCost";

const EXAMPLES = [
  { label: "$5 coffee every workday", oneTime: 0, monthly: 105, years: 10 },
  { label: "$1,200 phone upgrade", oneTime: 1_200, monthly: 0, years: 0 },
  { label: "$15/month streaming", oneTime: 0, monthly: 15, years: 10 },
  { label: "$5,000 vacation", oneTime: 5_000, monthly: 0, years: 0 },
  { label: "$15,000 pricier car", oneTime: 15_000, monthly: 0, years: 0 },
];

export default function OpportunityCostCalculator() {
  const [oneTime, setOneTime] = useState(5_000);
  const [monthly, setMonthly] = useState(0);
  const [years, setYears] = useState(10);
  const [currentAge, setCurrentAge] = useState(25);
  const [retireAge, setRetireAge] = useState(65);
  const [usefulYears, setUsefulYears] = useState(0);
  const [valuePerYear, setValuePerYear] = useState(0);
  const [returnPct, setReturnPct] = useState(7);
  const [inflationPct, setInflationPct] = useState(2.75);
  const [withdrawalPct, setWithdrawalPct] = useState(4);
  const [hourlyWage, setHourlyWage] = useState(0);
  const [monteCarlo, setMonteCarlo] = useState(false);

  const inputs = {
    oneTime,
    monthly,
    recurringYears: years,
    currentAge,
    retireAge,
    returnPct,
    inflationPct,
    withdrawalPct,
    hourlyWage,
    usefulYears,
    valuePerYear,
  };
  const o = estimateOpportunityCost(inputs);

  const scenarios = useMemo(
    () =>
      monteCarlo && o.yearsToRetire > 0 && o.spent > 0
        ? runMonteCarlo(o.simulateParams)
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monteCarlo, oneTime, monthly, years, currentAge, retireAge, returnPct],
  );

  const noDecision = o.spent <= 0;
  const noTime = o.yearsToRetire <= 0;
  const chartData = o.yearly.map((y) => ({
    age: currentAge + y.year,
    balance: y.balance,
  }));

  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-foreground/80">
              Try an example
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => {
                    setOneTime(ex.oneTime);
                    setMonthly(ex.monthly);
                    if (ex.years) setYears(ex.years);
                  }}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:bg-surface-hover"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          <NumberField
            id="oneTime"
            label="One-time cost, right now"
            value={oneTime}
            onChange={setOneTime}
            prefix="$"
          />
          <NumberField
            id="monthly"
            label="Recurring cost (per month)"
            value={monthly}
            onChange={setMonthly}
            prefix="$"
          />
          {monthly > 0 && (
            <NumberField
              id="years"
              label="How many years will you keep paying it?"
              value={years}
              onChange={setYears}
              suffix="yrs"
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <NumberField
              id="currentAge"
              label="Your age"
              value={currentAge}
              onChange={setCurrentAge}
              min={1}
            />
            <NumberField
              id="retireAge"
              label="Retirement age"
              value={retireAge}
              onChange={setRetireAge}
              min={1}
            />
          </div>

          <div className="rounded-md border border-border p-3">
            <p className="text-sm font-semibold text-foreground/80">
              Is it worth it? (optional)
            </p>
            <p className="mt-1 text-xs text-foreground/50">
              Tell us what you&apos;d get out of it and we&apos;ll compare that
              to what investing the money could do.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <NumberField
                id="usefulYears"
                label="Years you'll enjoy it"
                value={usefulYears}
                onChange={setUsefulYears}
                suffix="yrs"
              />
              <NumberField
                id="valuePerYear"
                label="Worth to you per year"
                value={valuePerYear}
                onChange={setValuePerYear}
                prefix="$"
              />
            </div>
          </div>

          <Disclosure title="Advanced settings">
            <NumberField
              id="returnPct"
              label="Expected yearly return if invested"
              value={returnPct}
              onChange={setReturnPct}
              suffix="%"
              step={0.1}
            />
            <NumberField
              id="inflationPct"
              label="Inflation"
              value={inflationPct}
              onChange={setInflationPct}
              suffix="%"
              step={0.05}
            />
            <div>
              <NumberField
                id="withdrawalPct"
                label="Yearly withdrawal in retirement"
                value={withdrawalPct}
                onChange={setWithdrawalPct}
                suffix="%"
                step={0.1}
              />
              <p className="mt-1.5 text-xs text-foreground/50">
                The &ldquo;4% rule&rdquo; is a common guideline for how much
                of a nest egg you can spend each year.
              </p>
            </div>
            <div>
              <NumberField
                id="hourlyWage"
                label="Your take-home pay per hour"
                value={hourlyWage}
                onChange={setHourlyWage}
                prefix="$"
              />
              <p className="mt-1.5 text-xs text-foreground/50">
                Turns the cost into hours of work.
              </p>
            </div>
            <CheckRow
              label="Show a range of outcomes"
              description="Runs randomized market simulations instead of a steady return, and shows the 10th, 50th, and 90th percentile results."
              checked={monteCarlo}
              onChange={setMonteCarlo}
            />
          </Disclosure>
        </div>

        <div className="min-w-0 rounded-lg border border-border bg-surface-hover p-6 sm:sticky sm:top-6 sm:self-start">
          {noDecision ? (
            <p className="text-sm text-foreground/60">
              Enter a cost above to see what it could mean for your
              retirement.
            </p>
          ) : noTime ? (
            <p className="text-sm text-foreground/60">
              Set a retirement age older than your current age to see how the
              money could have grown.
            </p>
          ) : (
            <>
              <p className="text-sm text-foreground/60">
                Spending {dollars(o.spent)} now could cost you
              </p>
              <p className="mt-1 text-3xl font-semibold text-navy dark:text-baby-blue">
                {dollars(o.futureValue)}
              </p>
              <p className="mt-1 text-sm text-foreground/60">
                at age {retireAge}, if you&apos;d invested it instead — about{" "}
                {dollars(o.todaysDollars)} in today&apos;s dollars.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border border-border p-3">
                  <p className="text-foreground/50">It grows</p>
                  <p className="font-medium">{o.multiple.toFixed(1)}×</p>
                  <p className="mt-0.5 text-xs text-foreground/50">
                    over {o.yearsToRetire} years
                  </p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-foreground/50">In retirement</p>
                  <p className="font-medium text-navy dark:text-baby-blue">
                    {dollars(o.incomePerMonth)} a month
                  </p>
                  <p className="mt-0.5 text-xs text-foreground/50">
                    of income, in today&apos;s dollars
                  </p>
                </div>
                {o.hoursOfWork !== null && (
                  <div className="col-span-2 rounded-md border border-border p-3">
                    <p className="text-foreground/50">In hours of work</p>
                    <p className="font-medium">
                      {Math.round(o.hoursOfWork).toLocaleString()} hours
                    </p>
                    <p className="mt-0.5 text-xs text-foreground/50">
                      about {(o.hoursOfWork / 40).toFixed(1)} full-time weeks
                      of take-home pay
                    </p>
                  </div>
                )}
              </div>

              {scenarios && <MonteCarloResults scenarios={scenarios} />}

              <div className="mt-4 rounded-md border border-yellow/50 bg-yellow/10 p-3 text-sm">
                {o.hasWorthCheck ? (
                  o.worthIt ? (
                    <>
                      <span className="font-semibold">
                        Worth it, by this measure.
                      </span>{" "}
                      To beat investing the money, this has to give you about{" "}
                      {dollars(o.breakEvenPerYear)} a year of value. You put it
                      at {dollars(valuePerYear)} — about{" "}
                      {dollars(o.worthMargin)} a year more than it needs.
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">
                        Probably not, by this measure.
                      </span>{" "}
                      To beat investing the money, this has to give you about{" "}
                      {dollars(o.breakEvenPerYear)} a year of value, but you put
                      it at {dollars(valuePerYear)}.
                    </>
                  )
                ) : (
                  <>
                    To beat investing the money, this has to be worth about{" "}
                    <span className="font-semibold">
                      {dollars(o.breakEvenPerYear || o.spent / Math.max(usefulYears, 1))}
                      {usefulYears > 0 ? " a year" : ""}
                    </span>{" "}
                    to you
                    {usefulYears > 0
                      ? ` over ${usefulYears} ${usefulYears === 1 ? "year" : "years"}`
                      : ". Add how many years you'll enjoy it, and what that's worth to you, for a verdict"}
                    .
                  </>
                )}
                <span className="mt-2 block text-xs text-foreground/60">
                  Money is for living, too. This just shows the trade-off.
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {!noDecision && !noTime && (
        <>
          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-baby-blue">
              What that money could grow into
            </h2>
            <p className="mt-1 max-w-xl text-sm text-foreground/60">
              If you invested it instead of spending it, at a steady {returnPct}%
              a year.
            </p>
            <div className="mt-4 rounded-lg border border-border p-4">
              <RetirementChart data={chartData} />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-baby-blue">
              What if you spend less?
            </h2>
            <div className="mt-3 overflow-hidden rounded-md border border-border text-sm">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-border px-3 py-2 text-xs font-medium text-foreground/50">
                <span>Version</span>
                <span className="w-20 text-right">You spend</span>
                <span className="w-24 text-right">Costs at {retireAge}</span>
              </div>
              {o.smaller.map((row) => (
                <div
                  key={row.share}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border px-3 py-2 last:border-b-0"
                >
                  <span>
                    {row.share === 1
                      ? "As planned"
                      : `${Math.round(row.share * 100)}% of the cost`}
                  </span>
                  <span className="w-20 text-right">{dollars(row.spent)}</span>
                  <span className="w-24 text-right font-medium">
                    {dollars(row.futureValue)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <p className="text-xs text-foreground/50">
            An estimate, not financial advice. It assumes a steady return, that
            you&apos;d really invest the money, and that recurring costs stay
            the same. Real markets go up and down, and the future is
            uncertain. The &ldquo;worth it&rdquo; comparison spreads a one-time
            cost over the years you&apos;ll use it, earning the same return you
            could have gotten by investing.
          </p>
        </>
      )}
    </div>
  );
}
