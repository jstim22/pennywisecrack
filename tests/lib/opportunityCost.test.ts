import { describe, expect, it } from "vitest";
import { check, near } from "../helpers";
import {
  breakEvenPerYear,
  estimateOpportunityCost,
  type OpportunityInputs,
} from "@/lib/opportunityCost";

const base: OpportunityInputs = {
  oneTime: 5_000,
  monthly: 0,
  recurringYears: 0,
  currentAge: 25,
  retireAge: 65,
  returnPct: 7,
  inflationPct: 2.75,
  withdrawalPct: 4,
  hourlyWage: 0,
  usefulYears: 0,
  valuePerYear: 0,
};
const est = (o: Partial<OpportunityInputs>) => estimateOpportunityCost({ ...base, ...o });

describe("a one-time purchase (hand computed)", () => {
  const r = est({});
  const g = Math.pow(1 + 0.07 / 12, 480);
  check("40 years to retirement", r.yearsToRetire, 40);
  check("spent", r.spent, 5_000);
  check("$5,000 grows for 480 months at 7%/12", r.futureValue, 5_000 * g, 0.01);
  check("in today's dollars, after 2.75% inflation", r.todaysDollars, (5_000 * g) / Math.pow(1.0275, 40), 0.01);
  check("growth", r.growth, 5_000 * g - 5_000, 0.01);
  check("multiple", r.multiple, g, 1e-9);
  check("4% of today's-dollar value per year", r.incomePerYear, (r.todaysDollars * 4) / 100, 1e-9);
  check("per month", r.incomePerMonth, r.incomePerYear / 12, 1e-9);
  it("has one chart point per year", () => expect(r.yearly).toHaveLength(40));
  check("the last point is the future value", r.yearly[39].balance, r.futureValue, 1e-6);
});

describe("a monthly expense that stops", () => {
  // $100 a month for 5 years: it grows to 100 * ((1+r)^60 - 1) / r, then keeps
  // growing for the other 35 years.
  const r = est({ oneTime: 0, monthly: 100, recurringYears: 5 });
  const m = 0.07 / 12;
  const atFive = (100 * (Math.pow(1 + m, 60) - 1)) / m;
  check("spent 12 x 5 x $100", r.spent, 6_000);
  check("future value", r.futureValue, atFive * Math.pow(1 + m, 420), 0.05);
  it("costs more if it lasts longer", () => {
    expect(est({ oneTime: 0, monthly: 100, recurringYears: 20 }).futureValue).toBeGreaterThan(r.futureValue);
  });
  it("can't last past retirement", () => {
    const capped = est({ oneTime: 0, monthly: 100, recurringYears: 99 });
    check("capped at 40 years", capped.recurringYears, 40);
    check("spent", capped.spent, 100 * 12 * 40);
  });
  it("adds to a one-time cost", () => {
    const both = est({ oneTime: 5_000, monthly: 100, recurringYears: 5 });
    check("adds up", both.futureValue, est({}).futureValue + r.futureValue, 0.05);
    check("spent adds up", both.spent, 11_000);
  });
});

describe("returns and time", () => {
  it("more return means a bigger cost", () => {
    expect(est({ returnPct: 9 }).futureValue).toBeGreaterThan(est({ returnPct: 5 }).futureValue);
  });
  it("starting later means a smaller cost", () => {
    expect(est({ currentAge: 45 }).futureValue).toBeLessThan(est({ currentAge: 25 }).futureValue);
  });
  check("0% return: it's just what you spent", est({ returnPct: 0 }).futureValue, 5_000);
  it("at retirement age already, nothing grows", () => {
    const r = est({ currentAge: 65, retireAge: 65 });
    check("no years", r.yearsToRetire, 0);
    check("value is what you spent", r.futureValue, 5_000);
    expect(r.yearly).toHaveLength(0);
  });
  it("a retirement age before your age is treated as none left", () => {
    check("years", est({ currentAge: 70, retireAge: 65 }).yearsToRetire, 0);
  });
});

describe("hours of work", () => {
  check("$5,000 at $25 an hour", est({ hourlyWage: 25 }).hoursOfWork!, 200);
  it("is empty without a wage", () => expect(est({}).hoursOfWork).toBeNull());
  check("counts recurring spending too", est({ oneTime: 0, monthly: 100, recurringYears: 5, hourlyWage: 20 }).hoursOfWork!, 300);
});

describe("is it worth it?", () => {
  // $5,000 enjoyed for 5 years, with the same money earning 7% compounded
  // monthly: a monthly amount of 5000 * r / (1 - (1+r)^-60), r = 0.07/12,
  // is $98.99, or about $1,188 a year.
  check("break-even for $5,000 over 5 years", breakEvenPerYear(5_000, 5, 7), 1_188.07, 0.05);
  check("0% return: just the cost spread out", breakEvenPerYear(6_000, 5, 0), 1_200);
  check("nothing spent", breakEvenPerYear(0, 5, 7), 0);
  it("says yes when it's worth more than break-even", () => {
    const r = est({ usefulYears: 5, valuePerYear: 2_000 });
    expect(r.worthIt).toBe(true);
    expect(r.worthMargin).toBeGreaterThan(700);
  });
  it("says no when it isn't", () => {
    expect(est({ usefulYears: 5, valuePerYear: 500 }).worthIt).toBe(false);
  });
  it("gives no verdict until you say what it's worth", () => {
    expect(est({}).worthIt).toBeNull();
    expect(est({ usefulYears: 5 }).hasWorthCheck).toBe(false);
    expect(est({ valuePerYear: 500 }).hasWorthCheck).toBe(false);
  });
  it("yearly costs raise the bar", () => {
    const a = est({ usefulYears: 5 }).breakEvenPerYear;
    const b = est({ usefulYears: 5, monthly: 50, recurringYears: 5 }).breakEvenPerYear;
    near(b, a + 600, 1e-9, "adds $600 a year");
  });
  it("a longer life makes it cheaper per year", () => {
    expect(est({ usefulYears: 10 }).breakEvenPerYear).toBeLessThan(est({ usefulYears: 3 }).breakEvenPerYear);
  });
});

describe("a cheaper version", () => {
  const r = est({});
  it("shows 100%, 50% and 25%", () => {
    expect(r.smaller.map((s) => s.share)).toEqual([1, 0.5, 0.25]);
  });
  check("the full version matches the main result", r.smaller[0].futureValue, r.futureValue, 1e-6);
  check("half the money is half the cost at retirement", r.smaller[1].futureValue, r.futureValue / 2, 1e-6);
  check("half the spending", r.smaller[1].spent, 2_500);
});

describe("edge cases", () => {
  it("has nothing to say about a $0 decision", () => {
    const r = est({ oneTime: 0 });
    expect(r.spent).toBe(0);
    expect(r.futureValue).toBe(0);
    expect(r.multiple).toBe(0);
  });
  it("stays finite for junk input", () => {
    const r = estimateOpportunityCost({ oneTime: NaN, monthly: NaN, recurringYears: NaN, currentAge: NaN, retireAge: NaN, returnPct: NaN, inflationPct: NaN, withdrawalPct: NaN, hourlyWage: NaN, usefulYears: NaN, valuePerYear: NaN });
    for (const v of [r.futureValue, r.todaysDollars, r.breakEvenPerYear, r.spent]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});
