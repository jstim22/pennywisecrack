import { describe, expect, it } from "vitest";
import { check, near } from "../helpers";
import { amortize, amortizedPayment } from "@/lib/amortization";
import {
  estimateMortgage,
  guessPmiRatePct,
  type MortgageInputs,
} from "@/lib/mortgage";
import { NATIONAL_PROPERTY_TAX_RATE, propertyTaxRatePct } from "@/lib/propertyTax";
import { STATES } from "@/lib/stateTax";

describe("amortization", () => {
  check("$100,000 at 6.5% over 30 years", amortizedPayment(100_000, 6.5, 360), 632.07);
  check("$320,000 at 6.5% over 30 years", amortizedPayment(320_000, 6.5, 360), 2_022.62);
  check("$200,000 at 7% over 15 years", amortizedPayment(200_000, 7, 180), 1_797.66);
  check("0% is balance / months", amortizedPayment(120_000, 0, 240), 500);
  check("nothing borrowed", amortizedPayment(0, 6, 360), 0);

  const a = amortize({ principal: 10_000, ratePct: 6, months: 120 });
  check("takes all 120 months", a.months, 120);
  check("ends at zero", a.balanceByMonth[120], 0);
  check("first month's interest is balance x rate/12", a.rows[0].interest, 50);
  check("first month's principal", a.rows[0].principal, 111.02 - 50, 0.01);
  check("paid = borrowed + interest", a.totalPaid, 10_000 + a.totalInterest, 1e-6);
  check("total interest", a.totalInterest, 111.0205 * 120 - 10_000, 0.05);
  it("groups the schedule by year", () => {
    expect(a.years).toHaveLength(10);
    check("year 1 interest + principal = 12 payments", a.years[0].interest + a.years[0].principal, 12 * 111.0205, 0.05);
    check("last year ends at zero", a.years[9].balance, 0);
    check("year interest sums to the total", a.years.reduce((s, y) => s + y.interest, 0), a.totalInterest, 1e-6);
  });
  it("extra payments finish sooner and cost less interest", () => {
    const x = amortize({ principal: 10_000, ratePct: 6, months: 120, extraMonthly: 100 });
    expect(x.months).toBeLessThan(a.months);
    expect(x.totalInterest).toBeLessThan(a.totalInterest);
    near(x.totalPaid, 10_000 + x.totalInterest, 1e-6, "paid");
  });
});

describe("property tax by state", () => {
  check("Illinois", propertyTaxRatePct("IL"), 1.88);
  check("Hawaii is the lowest", propertyTaxRatePct("HI"), 0.29);
  check("no state: the national average", propertyTaxRatePct(""), NATIONAL_PROPERTY_TAX_RATE);
  it("has a rate for every state we ask about", () => {
    for (const s of STATES) {
      const r = propertyTaxRatePct(s.code);
      expect(r, s.code).toBeGreaterThan(0.2);
      expect(r, s.code).toBeLessThan(2.5);
      // A state we don't have would silently fall back to the average.
      expect(r === NATIONAL_PROPERTY_TAX_RATE ? s.code : "ok", s.code).toBe("ok");
    }
  });
});

describe("guessing PMI", () => {
  check("none at 20% down", guessPmiRatePct(0.8, "720"), 0);
  check("none with more than 20% down", guessPmiRatePct(0.7, "620"), 0);
  check("90% loan, 760+ credit", guessPmiRatePct(0.9, "760"), 0.41);
  check("95% loan, 720-759", guessPmiRatePct(0.95, "720"), 0.8);
  check("97% loan, 620-639", guessPmiRatePct(0.97, "620"), 1.95);
  it("costs more with a lower credit score and less down", () => {
    const tiers = ["760", "720", "680", "640", "620"] as const;
    for (const ltv of [0.85, 0.9, 0.95, 0.97]) {
      const rates = tiers.map((t) => guessPmiRatePct(ltv, t));
      expect(rates, `LTV ${ltv}`).toEqual([...rates].sort((a, b) => a - b));
    }
    for (const t of tiers) {
      const rates = [0.85, 0.9, 0.95, 0.97].map((l) => guessPmiRatePct(l, t));
      expect(rates, t).toEqual([...rates].sort((a, b) => a - b));
    }
  });
});

const base: MortgageInputs = {
  price: 400_000,
  downPayment: 80_000,
  ratePct: 6.5,
  termYears: 30,
  stateCode: "IL",
  propertyTaxRatePct: null,
  insuranceRatePct: 0.7,
  hoaMonthly: 0,
  creditTier: "720",
  pmiRatePct: null,
  extraMonthly: 0,
  closingCostPct: 3,
  income: 0,
  otherMonthlyDebt: 0,
};
const est = (o: Partial<MortgageInputs>) => estimateMortgage({ ...base, ...o });

describe("a $400,000 home with 20% down in Illinois (hand computed)", () => {
  const m = est({});
  check("loan", m.loan, 320_000);
  check("down payment %", m.downPct, 20);
  check("principal & interest", m.principalAndInterest, 2_022.62);
  check("property tax: 1.88% of $400,000 a year, monthly", m.propertyTaxMonthly, (400_000 * 0.0188) / 12);
  check("insurance: 0.7% a year, monthly", m.insuranceMonthly, (400_000 * 0.007) / 12);
  check("escrow = tax + insurance", m.escrowMonthly, 626.67 + 233.33, 0.01);
  check("no PMI at 20% down", m.pmi.monthly, 0);
  it("says PMI doesn't apply", () => expect(m.pmi.applies).toBe(false));
  check("total monthly", m.totalMonthly, 2_022.62 + 626.67 + 233.33, 0.01);
  check("closing costs 3%", m.closingCosts, 12_000);
  check("cash to close", m.cashToClose, 92_000);
  check("total interest", m.schedule.totalInterest, 2_022.62 * 360 - 320_000, 5);
});

describe("PMI with 5% down", () => {
  const m = est({ downPayment: 20_000 });
  check("loan", m.loan, 380_000);
  check("loan-to-value", m.ltv, 0.95);
  it("applies PMI", () => expect(m.pmi.applies).toBe(true));
  check("guessed rate: 95% loan, 720-759 credit", m.pmi.ratePct, 0.8);
  check("monthly PMI on the original loan", m.pmi.monthly, (380_000 * 0.008) / 12);
  check("total monthly includes PMI", m.totalMonthly, m.principalAndInterest + m.escrowMonthly + m.pmi.monthly, 1e-9);
  check("after PMI ends", m.totalAfterPmi, m.totalMonthly - m.pmi.monthly, 1e-9);
  it("ends PMI when the balance reaches 80% of the price ($320,000)", () => {
    // Independent check: walk the loan until the balance is at or below $320,000.
    let b = 380_000;
    const pay = amortizedPayment(380_000, 6.5, 360);
    let months = 0;
    while (b > 320_000) {
      b = b * (1 + 0.065 / 12) - pay;
      months++;
    }
    expect(m.pmi.months).toBe(months);
    near(m.pmi.total, m.pmi.monthly * months, 1e-6, "total PMI");
  });
  check("what 20% down would take", m.pmi.moreFor20, 60_000);
  it("your own PMI rate wins over the guess", () => {
    const own = est({ downPayment: 20_000, pmiRatePct: 1 });
    near(own.pmi.monthly, (380_000 * 0.01) / 12, 1e-9, "override");
    expect(own.pmi.rateIsGuess).toBe(false);
  });
  it("a lower credit score costs more", () => {
    expect(est({ downPayment: 20_000, creditTier: "620" }).pmi.monthly).toBeGreaterThan(m.pmi.monthly);
  });
  it("extra payments end PMI sooner", () => {
    const x = est({ downPayment: 20_000, extraMonthly: 300 });
    expect(x.pmi.months).toBeLessThan(m.pmi.months);
    expect(x.pmi.monthsWithoutExtra).toBe(m.pmi.months);
  });
  it("PMI cost makes the payment higher than at 20% down", () => {
    expect(m.totalMonthly).toBeGreaterThan(est({}).principalAndInterest * 0 + m.principalAndInterest + m.escrowMonthly);
  });
});

describe("escrow guesses", () => {
  it("follows the state", () => {
    expect(est({ stateCode: "HI" }).escrowMonthly).toBeLessThan(est({ stateCode: "NJ" }).escrowMonthly);
  });
  it("uses the national average with no state", () => {
    check("rate", est({ stateCode: "" }).propertyTaxRate, NATIONAL_PROPERTY_TAX_RATE);
    expect(est({ stateCode: "" }).stateHasRate).toBe(false);
  });
  check("your own property tax rate wins", est({ propertyTaxRatePct: 2 }).propertyTaxMonthly, (400_000 * 0.02) / 12);
  it("flags whether the rate is a guess", () => {
    expect(est({}).propertyTaxRateIsGuess).toBe(true);
    expect(est({ propertyTaxRatePct: 2 }).propertyTaxRateIsGuess).toBe(false);
  });
  check("HOA is added to the total", est({ hoaMonthly: 250 }).totalMonthly, est({}).totalMonthly + 250, 1e-9);
  check("your own insurance rate", est({ insuranceRatePct: 1.5 }).insuranceMonthly, (400_000 * 0.015) / 12);
});

describe("extra payments and affordability", () => {
  const x = est({ extraMonthly: 500 });
  it("saves interest and time", () => {
    expect(x.interestSavedByExtra).toBeGreaterThan(50_000);
    expect(x.monthsSavedByExtra).toBeGreaterThan(60);
  });
  check("without extra, the schedule is the plain one", est({}).interestSavedByExtra, 0, 1e-9);
  const a = est({ income: 120_000, otherMonthlyDebt: 500 });
  check("housing costs as a share of income", a.frontEndRatio!, a.totalMonthly / 10_000, 1e-9);
  check("all debts as a share of income", a.backEndRatio!, (a.totalMonthly + 500) / 10_000, 1e-9);
  it("has no ratio without an income", () => expect(est({}).frontEndRatio).toBeNull());
});

describe("edge cases", () => {
  it("handles a down payment as big as the price", () => {
    const m = est({ downPayment: 500_000 });
    expect(m.loan).toBe(0);
    expect(m.principalAndInterest).toBe(0);
    expect(m.pmi.applies).toBe(false);
  });
  it("handles a 0% rate", () => {
    check("payment", est({ ratePct: 0 }).principalAndInterest, 320_000 / 360);
  });
  it("stays finite for junk input", () => {
    const m = estimateMortgage({ ...base, price: NaN, downPayment: NaN, ratePct: NaN, termYears: NaN, insuranceRatePct: NaN, hoaMonthly: -5, extraMonthly: NaN, closingCostPct: NaN, income: NaN, otherMonthlyDebt: NaN });
    for (const v of [m.totalMonthly, m.loan, m.cashToClose, m.schedule.totalInterest]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
  it("15-year loans cost less interest and more a month", () => {
    const short = est({ termYears: 15 });
    const long = est({});
    expect(short.schedule.totalInterest).toBeLessThan(long.schedule.totalInterest);
    expect(short.principalAndInterest).toBeGreaterThan(long.principalAndInterest);
  });
});
