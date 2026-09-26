import { describe, it, expect } from "vitest";
import { check } from "../helpers";
import {
  glideAdjustedRate,
  lumpSumsByMonth,
  runMonteCarlo,
  simulate,
  type SimulateParams,
} from "@/lib/growth";

// Retirement defaults: age 16 -> 65, nothing invested, $50 a month, 9% return.
const retirement: SimulateParams = {
  months: 49 * 12,
  principal: 0,
  frequency: "monthly",
  baseContribution: 50,
  baseRate: 9,
  customSchedule: false,
  getYearContribution: () => 50,
  getYearRate: () => 9,
  contributionGrowthPct: 0,
  glidePath: false,
  lumpSumsByMonth: {},
};

// Compound Interest defaults: $100 start, $20 a month, 5% for 5 years.
const compound: SimulateParams = {
  months: 60,
  principal: 100,
  frequency: "monthly",
  baseContribution: 20,
  baseRate: 5,
  customSchedule: false,
  getYearContribution: () => 20,
  getYearRate: () => 5,
  contributionGrowthPct: 0,
  glidePath: false,
  lumpSumsByMonth: {},
};

// Numbers below were captured from the calculators before the shared engine
// was extracted, so they pin down that nothing has drifted since.
describe("retirement scenarios", () => {
  const whole = (p: Partial<SimulateParams>) =>
    Math.round(simulate({ ...retirement, ...p }).balance);

  check("defaults", whole({}), 532_845, 0.5);
  check("contributions rise 2% a year", whole({ contributionGrowthPct: 2 }), 663_348, 0.5);
  check(
    "…with a glide path",
    whole({ contributionGrowthPct: 2, glidePath: true }),
    448_992,
    0.5,
  );
  check("$600 a year instead of $50 a month", whole({ frequency: "yearly", baseContribution: 600, getYearContribution: () => 600 }), 511_221, 0.5);
  check(
    "customized year 3: $500 a month at 20%",
    whole({
      customSchedule: true,
      getYearContribution: (y) => (y === 3 ? 500 : 50),
      getYearRate: (y) => (y === 3 ? 20 : 9),
    }),
    911_356,
    0.5,
  );
  check(
    "$10,000 lump sum at age 26",
    whole({ lumpSumsByMonth: lumpSumsByMonth([{ id: 1, at: 26, amount: 10_000 }], (age) => age - 16, 588) }),
    862_976,
    0.5,
  );
  check("total put in", simulate(retirement).contributed, 29_400);
  check("one yearly point per year", simulate(retirement).yearly.length, 49);
});

describe("compound interest scenarios", () => {
  check("defaults", simulate(compound).balance, 1_488.46);
  check("put in", simulate(compound).contributed, 1_300);
  check(
    "$1,000 lump sum at the end of year 2",
    simulate({ ...compound, lumpSumsByMonth: lumpSumsByMonth([{ id: 1, at: 2, amount: 1_000 }], (y) => y, 60) }).balance,
    2_649.93,
  );
  check("contributions rise 2% a year", simulate({ ...compound, contributionGrowthPct: 2 }).balance, 1_541.17);
  check(
    "customized year 3: $200 a month at 12%",
    simulate({
      ...compound,
      customSchedule: true,
      getYearContribution: (y) => (y === 3 ? 200 : 20),
      getYearRate: (y) => (y === 3 ? 12 : 5),
    }).balance,
    4_071.14,
  );
  check(
    "$1,000 start, $150 a month, 7% for 30 years",
    simulate({ ...compound, months: 360, principal: 1_000, baseContribution: 150, baseRate: 7, getYearContribution: () => 150, getYearRate: () => 7 }).balance,
    191_112.15,
  );
  check("no growth at 0%", simulate({ ...compound, baseRate: 0 }).balance, 1_300);
});

describe("lump sums", () => {
  it("land in the month a year ends", () => {
    expect(lumpSumsByMonth([{ id: 1, at: 3, amount: 500 }], (y) => y, 60)).toEqual({ 36: 500 });
  });
  it("add together when two share a year", () => {
    expect(
      lumpSumsByMonth([{ id: 1, at: 3, amount: 500 }, { id: 2, at: 3, amount: 250 }], (y) => y, 60),
    ).toEqual({ 36: 750 });
  });
  it("are dropped when outside the timeline", () => {
    expect(
      lumpSumsByMonth([{ id: 1, at: 9, amount: 1 }, { id: 2, at: 0, amount: 1 }, { id: 3, at: -2, amount: 1 }], (y) => y, 60),
    ).toEqual({});
  });
  check("are counted in what you put in", simulate({ ...compound, lumpSumsByMonth: { 12: 400 } }).contributed, 1_700);
});

describe("glide path", () => {
  check("full rate until 15 years out", glideAdjustedRate(9, 10, 40), 9);
  check("floors at 4% at retirement", glideAdjustedRate(9, 40, 40), 4);
  check("halfway down partway through the window", glideAdjustedRate(9, 32.5, 40), 6.5);
  check("never raises a rate already under the floor", glideAdjustedRate(3, 40, 40), 3);
});

describe("Monte Carlo", () => {
  const trial = runMonteCarlo({ ...retirement, baseContribution: 200, getYearContribution: () => 200 });

  it("orders the percentiles", () => {
    expect(trial.p10).toBeLessThan(trial.p50);
    expect(trial.p50).toBeLessThan(trial.p90);
  });
  it("keeps the median in the neighbourhood of the steady projection", () => {
    const steady = simulate({ ...retirement, baseContribution: 200, getYearContribution: () => 200 }).balance;
    // Volatility drag pulls the median below the smooth 9% line, but not wildly.
    expect(trial.p50).toBeGreaterThan(steady * 0.4);
    expect(trial.p50).toBeLessThan(steady * 1.2);
  });
  it("never goes negative", () => {
    expect(trial.p10).toBeGreaterThanOrEqual(0);
  });
});
