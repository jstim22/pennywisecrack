"use client";

import { useMemo, useState } from "react";
import NumberField from "./NumberField";
import CurrencyInput from "./CurrencyInput";
import PlainNumberInput from "./PlainNumberInput";
import RetirementChart from "./RetirementChart";

type Frequency = "monthly" | "yearly";
type YearOverride = { contribution?: number; rate?: number };

const GLIDE_WINDOW_YEARS = 15;
const GLIDE_FLOOR_RATE = 4;
const MONTE_CARLO_TRIALS = 300;
// Long-run annualized volatility (standard deviation of yearly returns) for
// a stock-heavy portfolio — a widely-cited, publicly available figure, not
// tied to any specific firm's proprietary assumptions.
const ANNUAL_VOLATILITY_PCT = 15;

function extraMonthlyForTarget({
  target,
  months,
  monthlyRatePct,
  principal,
  currentMonthly,
}: {
  target: number;
  months: number;
  monthlyRatePct: number;
  principal: number;
  currentMonthly: number;
}) {
  if (months <= 0) return 0;
  const r = monthlyRatePct / 100 / 12;
  const requiredMonthly =
    r === 0
      ? (target - principal) / months
      : (target - principal * Math.pow(1 + r, months)) /
        ((Math.pow(1 + r, months) - 1) / r);
  return requiredMonthly - currentMonthly;
}

function glideAdjustedRate(
  rate: number,
  yearIndex: number,
  totalYears: number,
) {
  const floor = Math.min(GLIDE_FLOOR_RATE, rate);
  const window = Math.min(GLIDE_WINDOW_YEARS, totalYears);
  if (window <= 0) return rate;
  const yearsRemaining = totalYears - yearIndex;
  if (yearsRemaining >= window) return rate;
  const t = Math.max(yearsRemaining, 0) / window;
  return floor + (rate - floor) * t;
}

type SimulateParams = {
  months: number;
  principal: number;
  currentAge: number;
  frequency: Frequency;
  baseContribution: number;
  baseRate: number;
  customSchedule: boolean;
  getYearContribution: (yearIndex: number) => number;
  getYearRate: (yearIndex: number) => number;
  contributionGrowthPct: number;
  glidePath: boolean;
};

function simulate({
  months,
  principal,
  currentAge,
  frequency,
  baseContribution,
  baseRate,
  customSchedule,
  getYearContribution,
  getYearRate,
  contributionGrowthPct,
  glidePath,
}: SimulateParams) {
  let balance = principal;
  let contributed = principal;
  const yearly: { age: number; balance: number }[] = [];
  const totalYears = months / 12;

  for (let m = 1; m <= months; m++) {
    const yearIndex = Math.ceil(m / 12);

    let yearRate = customSchedule ? getYearRate(yearIndex) : baseRate;
    if (glidePath) {
      yearRate = glideAdjustedRate(yearRate, yearIndex, totalYears);
    }

    let yearContribution = customSchedule
      ? getYearContribution(yearIndex)
      : baseContribution;
    if (contributionGrowthPct) {
      yearContribution *= Math.pow(
        1 + contributionGrowthPct / 100,
        yearIndex - 1,
      );
    }

    const monthlyRate = yearRate / 100 / 12;
    balance *= 1 + monthlyRate;
    if (frequency === "monthly") {
      balance += yearContribution;
      contributed += yearContribution;
    } else if (m % 12 === 0) {
      balance += yearContribution;
      contributed += yearContribution;
    }
    if (m % 12 === 0) {
      yearly.push({ age: currentAge + m / 12, balance });
    }
  }

  return {
    yearly,
    balance,
    contributed,
    growth: Math.max(balance - contributed, 0),
  };
}

function randomNormal(mean: number, stddev: number) {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * stddev;
}

type MonteCarloParams = Omit<SimulateParams, "currentAge">;

function runMonteCarloTrial(params: MonteCarloParams) {
  const {
    months,
    principal,
    frequency,
    baseContribution,
    baseRate,
    customSchedule,
    getYearContribution,
    getYearRate,
    contributionGrowthPct,
    glidePath,
  } = params;

  let balance = principal;
  const totalYears = months / 12;
  const monthlyVolatility = ANNUAL_VOLATILITY_PCT / 100 / Math.sqrt(12);

  for (let m = 1; m <= months; m++) {
    const yearIndex = Math.ceil(m / 12);

    let yearRate = customSchedule ? getYearRate(yearIndex) : baseRate;
    if (glidePath) {
      yearRate = glideAdjustedRate(yearRate, yearIndex, totalYears);
    }

    let yearContribution = customSchedule
      ? getYearContribution(yearIndex)
      : baseContribution;
    if (contributionGrowthPct) {
      yearContribution *= Math.pow(
        1 + contributionGrowthPct / 100,
        yearIndex - 1,
      );
    }

    const meanMonthlyReturn = yearRate / 100 / 12;
    const monthlyReturn = randomNormal(meanMonthlyReturn, monthlyVolatility);

    balance = Math.max(balance * (1 + monthlyReturn), 0);
    if (frequency === "monthly") {
      balance += yearContribution;
    } else if (m % 12 === 0) {
      balance += yearContribution;
    }
  }

  return balance;
}

function runMonteCarlo(params: MonteCarloParams) {
  const results: number[] = [];
  for (let t = 0; t < MONTE_CARLO_TRIALS; t++) {
    results.push(runMonteCarloTrial(params));
  }
  results.sort((a, b) => a - b);
  const percentile = (p: number) =>
    results[Math.floor(p * (results.length - 1))];
  return {
    p10: percentile(0.1),
    p50: percentile(0.5),
    p90: percentile(0.9),
  };
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function money(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
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

  const data = useMemo(
    () =>
      simulate({
        months: monthsToGrow,
        principal: currentInvested,
        currentAge,
        frequency,
        baseContribution: contribution,
        baseRate: rate,
        customSchedule,
        getYearContribution,
        getYearRate,
        contributionGrowthPct: contributionGrowth,
        glidePath,
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
  ]);

  const inflationAdjustedBalance = inflationAdjust
    ? data.balance / Math.pow(1 + inflationRate / 100, yearsToGrow)
    : null;

  const years = Array.from({ length: yearsToGrow }, (_, i) => i + 1);
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
                <RetirementChart data={data.yearly} />
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

          <details className="group rounded-md border border-border">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-medium">
              Advanced settings
              <ChevronIcon className="h-4 w-4 text-foreground/50 transition-transform group-open:rotate-180" />
            </summary>

            <div className="flex flex-col gap-4 border-t border-border px-3 py-4">
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
                  1%–2% a year is normal — think of it like a raise keeping
                  pace with your contributions.
                </p>
              </div>

              <label className="flex items-start justify-between gap-3 text-sm font-medium text-foreground/80">
                <span>
                  Glide path
                  <span className="mt-0.5 block text-xs font-normal text-foreground/50">
                    Your return rate gradually drops over the last{" "}
                    {GLIDE_WINDOW_YEARS} years before retirement, like
                    shifting from stocks into safer bonds.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={glidePath}
                  onChange={(e) => setGlidePath(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-navy dark:accent-baby-blue"
                />
              </label>

              <div>
                <label className="flex items-center justify-between text-sm font-medium text-foreground/80">
                  Adjust for inflation
                  <input
                    type="checkbox"
                    checked={inflationAdjust}
                    onChange={(e) => setInflationAdjust(e.target.checked)}
                    className="h-4 w-4 accent-navy dark:accent-baby-blue"
                  />
                </label>
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

              <label className="flex items-start justify-between gap-3 text-sm font-medium text-foreground/80">
                <span>
                  Monte Carlo scenarios
                  <span className="mt-0.5 block text-xs font-normal text-foreground/50">
                    Runs {MONTE_CARLO_TRIALS} randomized market simulations
                    (assuming {ANNUAL_VOLATILITY_PCT}% annual volatility) and
                    shows the 10th, 50th, and 90th percentile outcomes — the
                    same percentile-based approach real retirement planning
                    tools use.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={monteCarlo}
                  onChange={(e) => setMonteCarlo(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-navy dark:accent-baby-blue"
                />
              </label>

              <label className="flex items-center justify-between text-sm font-medium text-foreground/80">
                Customize by year
                <input
                  type="checkbox"
                  checked={customSchedule}
                  onChange={(e) => setCustomSchedule(e.target.checked)}
                  className="h-4 w-4 accent-navy dark:accent-baby-blue"
                />
              </label>

              {customSchedule && (
                <div className="rounded-md border border-border">
                  {years.length === 0 ? (
                    <p className="p-3 text-xs text-foreground/50">
                      Set a retirement age older than your current age first.
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-border px-3 py-2 text-xs font-medium text-foreground/50">
                        <span>Year</span>
                        <span className="w-24 text-right">
                          {frequency === "monthly" ? "$/month" : "$/year"}
                        </span>
                        <span className="w-16 text-right">Return</span>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {years.map((yearIndex) => (
                          <div
                            key={yearIndex}
                            className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-border px-3 py-1.5 text-sm last:border-b-0"
                          >
                            <span className="text-foreground/60">
                              Age {currentAge + yearIndex}
                            </span>
                            <CurrencyInput
                              value={getYearContribution(yearIndex)}
                              onChange={(v) =>
                                setYearOverride(yearIndex, "contribution", v)
                              }
                              className="w-24 rounded border border-border bg-transparent px-1.5 py-1 text-right text-sm outline-none focus:border-navy dark:focus:border-baby-blue"
                            />
                            <PlainNumberInput
                              step={0.1}
                              value={getYearRate(yearIndex)}
                              onChange={(v) =>
                                setYearOverride(yearIndex, "rate", v)
                              }
                              className="w-16 rounded border border-border bg-transparent px-1.5 py-1 text-right text-sm outline-none focus:border-navy dark:focus:border-baby-blue [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </details>
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

              {scenarios && (
                <div className="mt-6">
                  <p className="mb-2 text-xs font-medium text-foreground/50">
                    Monte Carlo outcomes
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-foreground/50">
                        10th percentile
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        ${money(scenarios.p10)}
                      </p>
                    </div>
                    <div className="rounded-md border border-navy/40 bg-navy/5 p-3 dark:border-baby-blue/40 dark:bg-baby-blue/10">
                      <p className="text-xs text-foreground/50">Median</p>
                      <p className="mt-1 text-sm font-medium text-navy dark:text-baby-blue">
                        ${money(scenarios.p50)}
                      </p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-foreground/50">
                        90th percentile
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        ${money(scenarios.p90)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-2">
                {[1_000_000, 5_000_000].map((target) => {
                  const reached = data.balance >= target;
                  const extra = extraMonthlyForTarget({
                    target,
                    months: monthsToGrow,
                    monthlyRatePct: rate,
                    principal: currentInvested,
                    currentMonthly: currentMonthlyEquivalent,
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
                  " The “invest more” suggestions above use your base rate and contribution, not the extra adjustments."}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
