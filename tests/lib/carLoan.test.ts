import { describe, expect, it } from "vitest";
import { check, near } from "../helpers";
import { carValue, estimateCarLoan, type CarInputs } from "@/lib/carLoan";

const base: CarInputs = {
  price: 30_000,
  downPayment: 5_000,
  tradeIn: 0,
  salesTaxPct: 6,
  taxOnPriceMinusTrade: true,
  fees: 500,
  aprPct: 7,
  termMonths: 60,
  extraMonthly: 0,
  condition: "new",
  monthlyInsurance: 0,
  monthlyUpkeep: 0,
  income: 0,
};
const est = (o: Partial<CarInputs>) => estimateCarLoan({ ...base, ...o });

describe("what you finance (hand computed)", () => {
  const c = est({});
  check("sales tax: 6% of $30,000", c.salesTax, 1_800);
  check("out-the-door price", c.outTheDoor, 32_300);
  check("amount financed = out-the-door - down payment", c.financed, 27_300);
  check("payment on $27,300 at 7% for 60 months", c.payment, 495.03 * 1.092, 0.02);
  check("total paid = financed + interest", c.totalPaid, 27_300 + c.totalInterest, 1e-6);
  check("everything you hand over = down + payments", c.totalCost, 5_000 + c.totalPaid, 1e-6);
  check("payoff months", c.payoffMonths, 60);
  check("interest share of the price", c.interestShareOfPrice, c.totalInterest / 30_000, 1e-9);
});

describe("trade-in and sales tax", () => {
  const t = est({ tradeIn: 10_000 });
  check("tax on price minus trade-in: 6% of $20,000", t.salesTax, 1_200);
  check("the trade-in comes off what you finance", t.financed, 30_000 + 1_200 + 500 - 5_000 - 10_000);
  check("tax on the full price when your state works that way", est({ tradeIn: 10_000, taxOnPriceMinusTrade: false }).salesTax, 1_800);
  it("counts the trade-in in what you gave up", () => {
    near(t.totalCost, 5_000 + 10_000 + t.totalPaid, 1e-6, "total");
  });
});

describe("terms and interest", () => {
  const c = est({});
  it("compares 36 to 84 months", () => {
    expect(c.compare.map((r) => r.term)).toEqual([36, 48, 60, 72, 84]);
  });
  it("longer terms mean lower payments and more interest", () => {
    for (let i = 1; i < c.compare.length; i++) {
      expect(c.compare[i].payment).toBeLessThan(c.compare[i - 1].payment);
      expect(c.compare[i].totalInterest).toBeGreaterThan(c.compare[i - 1].totalInterest);
    }
  });
  check("the 60-month row matches the main result", c.compare[2].payment, c.payment, 1e-9);
  check("0% financing costs no interest", est({ aprPct: 0 }).totalInterest, 0);
  check("0% payment", est({ aprPct: 0 }).payment, 27_300 / 60);
  it("extra payments save interest and months", () => {
    const x = est({ extraMonthly: 150 });
    expect(x.interestSavedByExtra).toBeGreaterThan(500);
    expect(x.monthsSavedByExtra).toBeGreaterThan(5);
    check("the required payment doesn't change", x.payment, c.payment, 1e-9);
  });
});

describe("depreciation", () => {
  check("a new car after a year: 80%", carValue(30_000, "new", 12), 24_000);
  check("after two years: another 15%", carValue(30_000, "new", 24), 20_400);
  check("six months in", carValue(30_000, "new", 6), 30_000 * Math.sqrt(0.8), 1e-6);
  check("a used car after a year: 90%", carValue(20_000, "used", 12), 18_000);
  check("used, two years: 81%", carValue(20_000, "used", 24), 16_200);
  check("day one it's worth the price", carValue(30_000, "new", 0), 30_000);
});

describe("owing more than the car is worth", () => {
  it("starts underwater when you roll tax and fees in with no down payment", () => {
    const c = est({ downPayment: 0 });
    expect(c.startsUnderwater).toBe(true);
    expect(c.underwaterUntil).toBeGreaterThan(12);
    expect(c.worstGap).toBeGreaterThan(2_000);
  });
  it("matches a step-by-step check of the months underwater", () => {
    const c = est({ downPayment: 0 });
    let last = 0;
    for (let m = 0; m < c.owe.length; m++) {
      if (c.owe[m] > carValue(30_000, "new", m) + 0.005) last = m;
    }
    expect(c.underwaterUntil).toBe(last);
  });
  it("a big down payment avoids it", () => {
    const c = est({ downPayment: 12_000, aprPct: 4, termMonths: 36, condition: "used" });
    expect(c.underwaterUntil).toBeLessThan(6);
  });
  it("owing = the financed amount at the start, and zero at the end", () => {
    const c = est({});
    check("start", c.owe[0], 27_300, 1e-6);
    check("end", c.owe[c.owe.length - 1], 0, 1e-6);
    check("worth at the start", c.worth[0], 30_000);
  });
});

describe("the 20/4/10 guideline", () => {
  it("passes with 20% down, a 4-year loan and modest running costs", () => {
    const c = est({ downPayment: 6_000, termMonths: 48, income: 120_000, monthlyInsurance: 120, monthlyUpkeep: 100 });
    expect(c.rule.downOk).toBe(true);
    expect(c.rule.termOk).toBe(true);
    expect(c.rule.incomeOk).toBe(true);
    check("share of income", c.rule.incomeShare!, (c.payment + 220) / 10_000, 1e-9);
  });
  it("counts a trade-in as part of the down payment", () => {
    expect(est({ downPayment: 0, tradeIn: 6_000 }).rule.downOk).toBe(true);
  });
  it("fails for a small down payment and a long loan", () => {
    const c = est({ downPayment: 1_000, termMonths: 72, income: 40_000 });
    expect(c.rule.downOk).toBe(false);
    expect(c.rule.termOk).toBe(false);
    expect(c.rule.incomeOk).toBe(false);
  });
  it("has no income check without an income", () => {
    expect(est({}).rule.incomeShare).toBeNull();
    expect(est({}).rule.incomeOk).toBeNull();
  });
  it("adds your extra payment to your monthly car costs", () => {
    const a = est({ income: 60_000 });
    const b = est({ income: 60_000, extraMonthly: 100 });
    check("extra counted", b.rule.monthlyCarCosts, a.rule.monthlyCarCosts + 100, 1e-9);
  });
});

describe("edge cases", () => {
  it("handles paying cash (down payment covers everything)", () => {
    const c = est({ downPayment: 40_000 });
    expect(c.financed).toBe(0);
    expect(c.payment).toBe(0);
    expect(c.totalInterest).toBe(0);
  });
  it("stays finite for junk input", () => {
    const c = estimateCarLoan({ ...base, price: NaN, downPayment: NaN, tradeIn: NaN, salesTaxPct: NaN, fees: NaN, aprPct: NaN, termMonths: NaN, extraMonthly: NaN, income: NaN, monthlyInsurance: NaN, monthlyUpkeep: NaN });
    for (const v of [c.payment, c.totalCost, c.financed, c.underwaterUntil]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});
