"use client";

import { useMemo, useState } from "react";
import NumberField from "./NumberField";
import RetirementChart from "./RetirementChart";
import Disclosure from "./Disclosure";
import CheckRow from "./CheckRow";
import LumpSumsField from "./LumpSumsField";
import YearlySchedule from "./YearlySchedule";
import MonteCarloResults from "./MonteCarloResults";
import { money } from "@/lib/format";
import {
  ANNUAL_VOLATILITY_PCT,
  GLIDE_WINDOW_YEARS,
  MONTE_CARLO_TRIALS,
  lumpSumsByMonth as toLumpSumsByMonth,
  runMonteCarlo,
  simulate,
  type Frequency,
  type LumpSum,
  type YearOverride,
} from "@/lib/growth";

function extraMonthlyForTarget({
  target,
  months,
  monthlyRatePct,
  principal,
  currentMonthly,
  lumpSumsByMonth,
}: {
  target: number;
  months: number;
  monthlyRatePct: number;
  principal: number;
  currentMonthly: number;
  lumpSumsByMonth: Record<number, number>;
}) {
  if (months <= 0) return 0;
  const r = monthlyRatePct / 100 / 12;
  // What the planned lump sums will be worth by retirement.
  const lumpSumValue = Object.entries(lumpSumsByMonth).reduce(
    (sum, [m, amount]) => sum + amount * Math.pow(1 + r, months - Number(m)),
    0,
  );
  const requiredMonthly =
    r === 0
      ? (target - principal - lumpSumValue) / months
      : (target - lumpSumValue - principal * Math.pow(1 + r, months)) /
        ((Math.pow(1 + r, months) - 1) / r);
  return requiredMonthly - currentMonthly;
}

export default function RetirementCalculator() {
  const [currentAge, setCurrentAge] = useState(16);
  const [retireAge, setRetireAge] = useState(65);
  const [currentInvested, setCurrentInvested] = useState(0);
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [contribution, setContribution] = useState(50);
  const [rate, setRate] = useState(9);
  const [customSchedule, setCustomSchedule] = useState(false);
  const [yearOverrides, setYearOverrides] = useState<
    Record<number, YearOverride>
  >({});

  const [lumpSums, setLumpSums] = useState<LumpSum[]>([]);

  const [contributionGrowth, setContributionGrowth] = useState(0);
  const [glidePath, setGlidePath] = useState(false);
  const [inflationAdjust, setInflationAdjust] = useState(false);
  const [inflationRate, setInflationRate] = useState(2.75);
  const [monteCarlo, setMonteCarlo] = useState(false);

  const yearsToGrow = Math.max(retireAge - currentAge, 0);
  const monthsToGrow = Math.round(yearsToGrow * 12);
  const currentMonthlyEquivalent =
    frequency === "monthly" ? contribution : contribution / 12;

  function getYearContribution(yearIndex: number) {
    return yearOverrides[yearIndex]?.contribution ?? contribution;
  }

  function getYearRate(yearIndex: number) {
    return yearOverrides[yearIndex]?.rate ?? rate;
  }

  function setYearOverride(
    yearIndex: number,
    field: keyof YearOverride,
    value: number,
  ) {
    setYearOverrides((prev) => ({
      ...prev,
      [yearIndex]: { ...prev[yearIndex], [field]: value },
    }));
  }

  const lumpSumsByMonth = useMemo(
    () => toLumpSumsByMonth(lumpSums, (age) => age - currentAge, monthsToGrow),
    [lumpSums, currentAge, monthsToGrow],
  );

  const data = useMemo(
    () =>
      simulate({
        months: monthsToGrow,
        principal: currentInvested,
        frequency,
        baseContribution: contribution,
        baseRate: rate,
        customSchedule,
        getYearContribution,
        getYearRate,
        contributionGrowthPct: contributionGrowth,
        glidePath,
        lumpSumsByMonth,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      currentAge,
      currentInvested,
      contribution,
      frequency,
      rate,
      monthsToGrow,
      customSchedule,
      yearOverrides,
      contributionGrowth,
      glidePath,
      lumpSumsByMonth,
    ],
  );

  const scenarios = useMemo(() => {
    if (!monteCarlo || monthsToGrow <= 0) return null;
    return runMonteCarlo({
      months: monthsToGrow,
      principal: currentInvested,
      frequency,
      baseContribution: contribution,
      baseRate: rate,
      customSchedule,
      getYearContribution,
      getYearRate,
      contributionGrowthPct: contributionGrowth,
      glidePath,
      lumpSumsByMonth,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    monteCarlo,
    currentInvested,
    contribution,
    frequency,
    rate,
    monthsToGrow,
    customSchedule,
    yearOverrides,
    contributionGrowth,
    glidePath,
    lumpSumsByMonth,
  ]);

  const inflationAdjustedBalance = inflationAdjust
    ? data.balance / Math.pow(1 + inflationRate / 100, yearsToGrow)
    : null;

  const years = Array.from({ length: yearsToGrow }, (_, i) => i + 1);
  const chartData = data.yearly.map((y) => ({
    age: currentAge + y.year,
    balance: y.balance,
  }));
  const hasExtraAdjustments = contributionGrowth > 0 || glidePath;

  return (
    <div className="flex flex-col gap-8">
      <div className="min-w-0 rounded-lg border border-border bg-surface-hover p-4 sm:p-6">
        {yearsToGrow <= 0 ? (
          <p className="text-sm text-foreground/60">
            Set a retirement age older than your current age to see a
            projection.
          </p>
        ) : (
          <>
            <p className="text-sm text-foreground/60">
              By age {retireAge}, you could have
            </p>
            <p className="mt-1 text-3xl font-semibold text-navy dark:text-baby-blue sm:text-4xl">
              ${money(data.balance)}
            </p>
            <p className="mt-1 text-xs text-foreground/50">
              that&apos;s {yearsToGrow} {yearsToGrow === 1 ? "year" : "years"}{" "}
              of growth
            </p>
            <p className="mt-3 text-sm italic text-foreground/60">
              Enter your details below and watch your money grow.
            </p>

            {data.yearly.length > 0 && (
              <div className="mt-4">
                <RetirementChart data={chartData} />
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              id="currentAge"
              label="Your current age"
              value={currentAge}
              onChange={setCurrentAge}
              min={1}
            />
            <NumberField
              id="retireAge"
              label="Age you want to retire"
              value={retireAge}
              onChange={setRetireAge}
              min={1}
            />
          </div>

          <NumberField
            id="currentInvested"
            label="How much do you have invested now?"
            value={currentInvested}
            onChange={setCurrentInvested}
            prefix="$"
          />

          <div>
            <span className="text-sm font-medium text-foreground/80">
              How often do you contribute?
            </span>
            <div className="mt-1 grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setFrequency("monthly")}
                aria-pressed={frequency === "monthly"}
                className={
                  "rounded-md border py-1.5 text-sm font-medium transition-colors " +
                  (frequency === "monthly"
                    ? "border-navy bg-navy text-white dark:border-baby-blue dark:bg-baby-blue dark:text-navy"
                    : "border-border hover:bg-surface-hover")
                }
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setFrequency("yearly")}
                aria-pressed={frequency === "yearly"}
                className={
                  "rounded-md border py-1.5 text-sm font-medium transition-colors " +
                  (frequency === "yearly"
                    ? "border-navy bg-navy text-white dark:border-baby-blue dark:bg-baby-blue dark:text-navy"
                    : "border-border hover:bg-surface-hover")
                }
              >
                Yearly
              </button>
            </div>
          </div>

          <NumberField
            id="contribution"
            label={
              frequency === "monthly"
                ? "Contribution per month"
                : "Contribution per year"
            }
            value={contribution}
            onChange={setContribution}
            prefix="$"
          />

          <Disclosure title="Advanced settings">
            <NumberField
              id="rate"
              label="Expected annual return"
              value={rate}
              onChange={setRate}
              suffix="%"
              step={0.1}
            />

            <div>
              <NumberField
                id="contributionGrowth"
                label="Increase my contribution by each year"
                value={contributionGrowth}
                onChange={setContributionGrowth}
                suffix="%"
                step={0.1}
              />
              <p className="mt-1.5 text-xs text-foreground/50">
                1%–2% a year is normal — think of it like a raise keeping pace
                with your contributions.
              </p>
            </div>

            <CheckRow
              label="Glide path"
              description={`Your return rate gradually drops over the last ${GLIDE_WINDOW_YEARS} years before retirement, like shifting from stocks into safer bonds.`}
              checked={glidePath}
              onChange={setGlidePath}
            />

            <div>
              <CheckRow
                label="Adjust for inflation"
                checked={inflationAdjust}
                onChange={setInflationAdjust}
              />
              {inflationAdjust && (
                <div className="mt-2">
                  <NumberField
                    id="inflationRate"
                    label="Inflation rate"
                    value={inflationRate}
                    onChange={setInflationRate}
                    suffix="%"
                    step={0.05}
                  />
                </div>
              )}
            </div>

            <CheckRow
              label="Monte Carlo scenarios"
              description={`Runs ${MONTE_CARLO_TRIALS} randomized market simulations (assuming ${ANNUAL_VOLATILITY_PCT}% annual volatility) and shows the 10th, 50th, and 90th percentile outcomes — the same percentile-based approach real retirement planning tools use.`}
              checked={monteCarlo}
              onChange={setMonteCarlo}
            />

            <LumpSumsField
              lumpSums={lumpSums}
              onChange={setLumpSums}
              choices={years.map((y) => ({
                value: currentAge + y,
                label: `Age ${currentAge + y}`,
              }))}
              what={(age) => `Age ${age}`}
            />

            <CheckRow
              label="Customize by year"
              checked={customSchedule}
              onChange={setCustomSchedule}
            />

            {customSchedule && (
              <YearlySchedule
                rows={years.map((y) => ({
                  year: y,
                  label: `Age ${currentAge + y}`,
                }))}
                amountHeader={frequency === "monthly" ? "$/month" : "$/year"}
                emptyMessage="Set a retirement age older than your current age first."
                getContribution={getYearContribution}
                getRate={getYearRate}
                onChange={setYearOverride}
              />
            )}
          </Disclosure>
        </div>

        <div className="min-w-0 rounded-lg border border-border bg-surface-hover p-6">
          {yearsToGrow > 0 && (
            <>
              {inflationAdjust && inflationAdjustedBalance !== null && (
                <p className="text-sm text-foreground/60">
                  About{" "}
                  <span className="font-medium text-foreground">
                    ${money(inflationAdjustedBalance)}
                  </span>{" "}
                  in today&apos;s dollars, after {inflationRate}% inflation.
                </p>
              )}

              <div
                className={
                  "grid grid-cols-2 gap-3 text-sm" +
                  (inflationAdjust && inflationAdjustedBalance !== null
                    ? " mt-4"
                    : "")
                }
              >
                <div className="rounded-md border border-border p-3">
                  <p className="text-foreground/50">You put in</p>
                  <p className="font-medium">${money(data.contributed)}</p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-foreground/50">Growth earned</p>
                  <p className="font-medium text-navy dark:text-baby-blue">
                    ${money(data.growth)}
                  </p>
                </div>
              </div>

              {scenarios && <MonteCarloResults scenarios={scenarios} />}

              <div className="mt-6 flex flex-col gap-2">
                {[1_000_000, 5_000_000].map((target) => {
                  const reached = data.balance >= target;
                  const extra = extraMonthlyForTarget({
                    target,
                    months: monthsToGrow,
                    monthlyRatePct: rate,
                    principal: currentInvested,
                    currentMonthly: currentMonthlyEquivalent,
                    lumpSumsByMonth,
                  });

                  return (
                    <div
                      key={target}
                      className="rounded-md border border-yellow/50 bg-yellow/10 p-3 text-sm"
                    >
                      {reached ? (
                        <p>
                          You&apos;re already on track to hit{" "}
                          <span className="font-semibold">
                            ${target.toLocaleString()}
                          </span>{" "}
                          by age {retireAge}! 🎉
                        </p>
                      ) : (
                        <p>
                          Invest{" "}
                          <span className="font-semibold text-navy dark:text-baby-blue">
                            ${Math.ceil(extra).toLocaleString()} more a month
                          </span>{" "}
                          to reach ${target.toLocaleString()} by age{" "}
                          {retireAge}.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="mt-4 text-xs text-foreground/50">
                {customSchedule
                  ? "This is just an estimate based on the returns and contributions you set — real markets go up and down."
                  : `This is just an estimate based on a steady ${rate}% return — real markets go up and down.`}
                {hasExtraAdjustments &&
                  " The “invest more” suggestions above use your base rate, contribution, and lump sums, not the other adjustments."}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
