"use client";

import { useMemo, useState } from "react";
import NumberField from "./NumberField";
import Disclosure from "./Disclosure";
import CheckRow from "./CheckRow";
import LumpSumsField from "./LumpSumsField";
import YearlySchedule from "./YearlySchedule";
import MonteCarloResults from "./MonteCarloResults";
import { usd } from "@/lib/format";
import {
  ANNUAL_VOLATILITY_PCT,
  MONTE_CARLO_TRIALS,
  lumpSumsByMonth as toLumpSumsByMonth,
  runMonteCarlo,
  simulate,
  type LumpSum,
  type YearOverride,
} from "@/lib/growth";

export default function CompoundInterestCalculator() {
  const [principal, setPrincipal] = useState(100);
  const [monthly, setMonthly] = useState(20);
  const [rate, setRate] = useState(5);
  const [years, setYears] = useState(5);

  const [contributionGrowth, setContributionGrowth] = useState(0);
  const [inflationAdjust, setInflationAdjust] = useState(false);
  const [inflationRate, setInflationRate] = useState(2.75);
  const [monteCarlo, setMonteCarlo] = useState(false);
  const [lumpSums, setLumpSums] = useState<LumpSum[]>([]);
  const [customSchedule, setCustomSchedule] = useState(false);
  const [yearOverrides, setYearOverrides] = useState<
    Record<number, YearOverride>
  >({});

  const wholeYears = Math.max(Math.round(years), 0);
  const months = wholeYears * 12;
  const yearRows = Array.from({ length: wholeYears }, (_, i) => i + 1);

  function getYearContribution(yearIndex: number) {
    return yearOverrides[yearIndex]?.contribution ?? monthly;
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
    () => toLumpSumsByMonth(lumpSums, (year) => year, months),
    [lumpSums, months],
  );

  const params = {
    months,
    principal,
    frequency: "monthly" as const,
    baseContribution: monthly,
    baseRate: rate,
    customSchedule,
    getYearContribution,
    getYearRate,
    contributionGrowthPct: contributionGrowth,
    glidePath: false,
    lumpSumsByMonth,
  };

  const data = useMemo(
    () => simulate(params),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      months,
      principal,
      monthly,
      rate,
      customSchedule,
      yearOverrides,
      contributionGrowth,
      lumpSumsByMonth,
    ],
  );

  const scenarios = useMemo(
    () => (monteCarlo && months > 0 ? runMonteCarlo(params) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      monteCarlo,
      months,
      principal,
      monthly,
      rate,
      customSchedule,
      yearOverrides,
      contributionGrowth,
      lumpSumsByMonth,
    ],
  );

  const inflationAdjustedBalance = inflationAdjust
    ? data.balance / Math.pow(1 + inflationRate / 100, wholeYears)
    : null;
  const interestEarned = Math.max(data.balance - data.contributed, 0);
  const maxBalance = Math.max(...data.yearly.map((y) => y.balance), 1);

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-4">
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

        <Disclosure title="Advanced settings">
          <div>
            <NumberField
              id="contributionGrowth"
              label="Increase my monthly amount by each year"
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
            description={`Runs ${MONTE_CARLO_TRIALS} randomized market simulations (assuming ${ANNUAL_VOLATILITY_PCT}% annual volatility) and shows the 10th, 50th, and 90th percentile outcomes. It's built for investments that go up and down, so it's most useful with a stock-market-style rate rather than a fixed savings rate.`}
            checked={monteCarlo}
            onChange={setMonteCarlo}
          />

          <LumpSumsField
            lumpSums={lumpSums}
            onChange={setLumpSums}
            choices={yearRows.map((y) => ({ value: y, label: `Year ${y}` }))}
            what={(year) => `Year ${year}`}
          />

          <CheckRow
            label="Customize by year"
            checked={customSchedule}
            onChange={setCustomSchedule}
          />

          {customSchedule && (
            <YearlySchedule
              rows={yearRows.map((y) => ({ year: y, label: `Year ${y}` }))}
              amountHeader="$/month"
              emptyMessage="Set a number of years first."
              getContribution={getYearContribution}
              getRate={getYearRate}
              onChange={setYearOverride}
            />
          )}
        </Disclosure>
      </div>

      <div className="min-w-0 rounded-lg border border-border bg-surface-hover p-6">
        <p className="text-sm text-foreground/60">
          After {years} {years === 1 ? "year" : "years"}, you&apos;d have
        </p>
        <p className="mt-1 text-3xl font-semibold text-navy dark:text-baby-blue">
          {usd(data.balance)}
        </p>

        {inflationAdjustedBalance !== null && (
          <p className="mt-2 text-sm text-foreground/60">
            About{" "}
            <span className="font-medium text-foreground">
              {usd(inflationAdjustedBalance)}
            </span>{" "}
            in today&apos;s dollars, after {inflationRate}% inflation.
          </p>
        )}

        <div className="mt-4 flex gap-6 text-sm">
          <div>
            <p className="text-foreground/50">You put in</p>
            <p className="font-medium">{usd(data.contributed)}</p>
          </div>
          <div>
            <p className="text-foreground/50">Interest earned</p>
            <p className="font-medium text-navy dark:text-baby-blue">
              {usd(interestEarned)}
            </p>
          </div>
        </div>

        {scenarios && <MonteCarloResults scenarios={scenarios} />}

        {data.yearly.length > 0 && (
          <div className="mt-6 flex h-32 items-end gap-1 overflow-x-auto">
            {data.yearly.map((y) => (
              <div
                key={y.year}
                title={`Year ${y.year}: ${usd(y.balance)}`}
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
