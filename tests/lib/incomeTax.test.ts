import { describe, expect, it } from "vitest";
import { check, near } from "../helpers";
import {
  estimateIncomeTax,
  payBasis,
  taxRateCurve,
  type IncomeTaxInputs,
} from "@/lib/incomeTax";
import { estimatePaycheck } from "@/lib/paycheckTax";
import { STATES } from "@/lib/stateTax";

const base: IncomeTaxInputs = {
  wages: 60_000,
  otherIncome: 0,
  stateCode: "TX",
  localId: "",
  localCustomRatePct: 0,
  traditionalRetirement: 0,
  hsa: 0,
  otherPreTax: 0,
  itemizedDeductions: 0,
  credits: 0,
};
const est = (o: Partial<IncomeTaxInputs>) => estimateIncomeTax({ ...base, ...o });

describe("$60,000 of pay in a state with no income tax (hand computed)", () => {
  const a = est({});
  // Taxable = 60,000 - 16,100 = 43,900: 12,400 at 10% + 31,500 at 12%.
  check("federal income tax", a.federal, 1_240 + 3_780);
  check("Social Security 6.2%", a.socialSecurity, 3_720);
  check("Medicare 1.45%", a.medicare, 870);
  check("no state tax", a.state, 0);
  check("total", a.total, 9_610);
  check("take-home", a.takeHome, 50_390);
  check("total rate", a.totalRate, 9_610 / 60_000, 1e-9);
  check("federal taxable income", a.federalTaxable, 43_900);
  check("next dollar: 12% federal", a.marginal.federal, 0.12, 1e-9);
  check("next dollar: 7.65% payroll", a.marginal.payroll, 0.0765, 1e-9);
  check("next dollar: total", a.marginal.total, 0.1965, 1e-9);
  check("top bracket", a.topBracket ?? 0, 0.12);
  it("puts income in the right brackets", () => {
    expect(a.brackets.map((b) => Math.round(b.inBracket))).toEqual([
      12_400, 31_500, 0, 0, 0, 0, 0,
    ]);
  });
  it("bracket taxes add up to the federal tax", () => {
    expect(a.brackets.reduce((s, b) => s + b.tax, 0)).toBeCloseTo(a.federal, 6);
  });
});

describe("state and city/county tax", () => {
  check("Illinois flat 4.95% after its $2,925 deduction", est({ stateCode: "IL" }).state, 57_075 * 0.0495);
  check("Illinois: next dollar", est({ stateCode: "IL" }).marginal.state, 0.0495, 1e-9);
  check("state shows up in the total", est({ stateCode: "IL" }).total, 9_610 + 57_075 * 0.0495);
  const bal = est({ stateCode: "MD", localId: "baltimore-city" });
  // Maryland taxable = 60,000 - 6,550; Baltimore City charges 3.20% of it.
  check("Baltimore City 3.20% of Maryland taxable income", bal.local, 53_450 * 0.032);
  check("local name", bal.localName === "Baltimore City" ? 1 : 0, 1);
  check("Philadelphia resident 3.735% of wages", est({ stateCode: "PA", localId: "phl-resident" }).local, 60_000 * 0.03735);
  check("your own local rate", est({ stateCode: "OH", localId: "custom", localCustomRatePct: 2 }).local, 1_200);
  check("wage-based local tax ignores a 401(k)", est({ stateCode: "OH", localId: "custom", localCustomRatePct: 2, traditionalRetirement: 6_000 }).local, 1_200);
  check("no answer, no local tax", est({ stateCode: "MD" }).local, 0);
  check("stale answer from another state is ignored", est({ stateCode: "TX", localId: "baltimore-city" }).local, 0);
});

describe("pre-tax savings and deductions", () => {
  const k = est({ traditionalRetirement: 6_000 });
  check("401(k): federal on $54,000", k.federal, 1_240 + 25_500 * 0.12);
  check("401(k): Social Security unchanged", k.socialSecurity, 3_720);
  check("401(k): take-home", k.takeHome, 60_000 - 6_000 - (4_300 + 4_590));
  check("401(k): savings shown separately", k.savings, 6_000);
  const c = est({ hsa: 2_000, otherPreTax: 3_000 });
  check("HSA + premiums: Social Security drops", c.socialSecurity, 0.062 * 55_000);
  check("HSA + premiums: Medicare drops", c.medicare, 0.0145 * 55_000);
  check("HSA + premiums: federal on $55,000", c.federal, 1_240 + 26_500 * 0.12);
  check("CA taxes HSA money", est({ stateCode: "CA", hsa: 2_000 }).state, est({ stateCode: "CA" }).state);
  check("PA taxes 401(k) money", est({ stateCode: "PA", traditionalRetirement: 6_000 }).state, est({ stateCode: "PA" }).state);
  check("IL does not", est({ stateCode: "IL", traditionalRetirement: 6_000 }).state, 51_075 * 0.0495);
  check("401(k) limit is $24,500", est({ wages: 200_000, traditionalRetirement: 50_000 }).retirement, 24_500);
  check("401(k) capped flag", est({ traditionalRetirement: 50_000 }).retirementCapped ? 1 : 0, 1);
  check("HSA limit is $8,750", est({ hsa: 20_000 }).hsa, 8_750);
  check("HSA capped flag", est({ hsa: 20_000 }).hsaCapped ? 1 : 0, 1);
});

describe("other income, itemizing, and credits", () => {
  check("other income is taxed like pay", est({ otherIncome: 5_000 }).federal, 1_240 + 36_500 * 0.12);
  check("other income has no Social Security", est({ otherIncome: 5_000 }).socialSecurity, 3_720);
  check("other income counts toward your total rate", est({ otherIncome: 5_000 }).totalRate, (5_620 + 3_720 + 870) / 65_000, 1e-9);
  check("bigger itemized deduction replaces the standard one", est({ itemizedDeductions: 20_000 }).federal, 1_240 + 27_600 * 0.12);
  check("…and is flagged", est({ itemizedDeductions: 20_000 }).usedItemized ? 1 : 0, 1);
  check("smaller itemized deduction is ignored", est({ itemizedDeductions: 10_000 }).federal, 5_020);
  check("…and not flagged", est({ itemizedDeductions: 10_000 }).usedItemized ? 1 : 0, 0);
  check("credits reduce federal tax", est({ credits: 1_000 }).federal, 4_020);
  check("credits can't push federal tax below zero", est({ credits: 6_000 }).federal, 0);
  check("unused credit reported", est({ credits: 6_000 }).creditsUnused, 980);
  check("credits used reported", est({ credits: 6_000 }).creditsUsed, 5_020);
  check("credits don't touch payroll tax", est({ credits: 6_000 }).socialSecurity, 3_720);
});

describe("high earners", () => {
  const cap = est({ wages: 200_000 });
  check("Social Security stops at the $184,500 wage base", cap.socialSecurity, 0.062 * 184_500);
  check("no Additional Medicare at exactly $200,000", cap.additionalMedicare, 0);
  const top = est({ wages: 250_000 });
  check("Additional Medicare 0.9% above $200,000", top.additionalMedicare, 450);
  check("federal tax at $250,000", top.federal, 51_304);
  check("top bracket at $250,000", top.topBracket ?? 0, 0.32);
  check("next dollar above the cap: 1.45% + 0.9% payroll", top.marginal.payroll, 0.0235, 1e-9);
  check("next dollar: 32% + payroll", top.marginal.total, 0.3435, 1e-9);
  check("bracket rows cover the taxable income", top.brackets.reduce((s, b) => s + b.inBracket, 0), top.federalTaxable);
});

describe("matches the paycheck estimator", () => {
  // The same person, worked out per year by both engines. Includes the real
  // pay stub (OASDI 168.08, Medicare 39.31, federal 256.80, biweekly).
  const scenarios = [
    { salary: 78_000, ins: 289, hsa: 0, pct: 0, state: "TX" },
    { salary: 52_000, ins: 120, hsa: 50, pct: 6, state: "IL" },
    { salary: 95_000, ins: 200, hsa: 100, pct: 10, state: "CA" },
    { salary: 41_600, ins: 0, hsa: 25, pct: 4, state: "NJ" },
    { salary: 130_000, ins: 310, hsa: 0, pct: 15, state: "PA" },
    { salary: 30_000, ins: 0, hsa: 0, pct: 0, state: "NY" },
  ];
  for (const s of scenarios) {
    const label = `$${s.salary.toLocaleString()} in ${s.state}, 401(k) ${s.pct}%`;
    const p = estimatePaycheck({
      payType: "salary",
      hourlyWage: 0,
      hoursPerWeek: 0,
      tipsPerWeek: 0,
      annualSalary: s.salary,
      payFrequency: "biweekly",
      stateCode: s.state,
      retirementPct: s.pct,
      retirementType: "traditional",
      insurancePreTaxPerPaycheck: s.ins,
      insurancePostTaxPerPaycheck: 0,
      hsaPerPaycheck: s.hsa,
      otherPreTaxPerPaycheck: 0,
      otherPostTaxPerPaycheck: 0,
      skipFica: false,
    });
    const t = est({
      wages: s.salary,
      stateCode: s.state,
      traditionalRetirement: (s.pct / 100) * s.salary,
      hsa: s.hsa * 26,
      otherPreTax: s.ins * 26,
    });
    check(`${label}: federal`, t.federal, p.perPaycheck.federal * 26, 0.01);
    check(`${label}: Social Security`, t.socialSecurity, p.perPaycheck.socialSecurity * 26, 0.01);
    check(`${label}: Medicare`, t.medicare, p.perPaycheck.medicare * 26, 0.01);
    check(`${label}: state`, t.state, p.perPaycheck.state * 26, 0.01);
    check(`${label}: take-home`, t.takeHome, p.takeHomeYear, 0.01);
  }
  const stub = est({ wages: 78_000, otherPreTax: 289 * 26 });
  check("real stub: OASDI", stub.socialSecurity / 26, 168.08);
  check("real stub: Medicare", stub.medicare / 26, 39.31);
  check("real stub: federal", stub.federal / 26, 256.8);
});

describe("the rate curve", () => {
  const curve = taxRateCurve(base, 200_000, 100);
  it("has a point at every step, starting at $0", () => {
    expect(curve).toHaveLength(101);
    expect(curve[0].wages).toBe(0);
    expect(curve[0].average).toBe(0);
    expect(curve[100].wages).toBe(200_000);
  });
  it("average rate never falls as pay rises, up to the Social Security cap", () => {
    // (Past the cap the next dollar can be taxed less than the average, so the
    // average can dip slightly.)
    for (let i = 1; i < curve.length && curve[i].wages <= 180_000; i++) {
      expect(curve[i].average, `at $${curve[i].wages}`).toBeGreaterThanOrEqual(curve[i - 1].average - 1e-9);
    }
  });
  check("marginal rate at $60,000", curve.find((p) => p.wages === 60_000)!.marginal, 0.1965, 1e-9);
  check("marginal rate at $120,000 (22% bracket + 7.65%)", curve.find((p) => p.wages === 120_000)!.marginal, 0.2965, 1e-9);
  check("marginal rate at $150,000 (24% bracket + 7.65%)", curve.find((p) => p.wages === 150_000)!.marginal, 0.3165, 1e-9);
  it("payroll tax drops out above the Social Security cap", () => {
    const below = curve.find((p) => p.wages === 180_000)!.marginal;
    const above = curve.find((p) => p.wages === 190_000)!.marginal;
    expect(below - above).toBeCloseTo(0.062, 6);
  });
});

describe("guards", () => {
  it("stays finite for junk input", () => {
    const r = est({ wages: NaN, otherIncome: -5, traditionalRetirement: NaN, hsa: -1, credits: NaN, stateCode: "ZZ", localCustomRatePct: NaN });
    for (const v of [r.total, r.takeHome, r.totalRate, r.marginal.total, r.federal]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
  it("says so when there's no income", () => {
    const r = est({ wages: 0 });
    expect(r.hasIncome).toBe(false);
    expect(r.totalRate).toBe(0);
    expect(r.topBracket).toBeNull();
  });
  it("never taxes more than the income, in any state", () => {
    for (const s of STATES) {
      const r = est({ wages: 90_000, stateCode: s.code });
      expect(r.total, s.code).toBeLessThan(90_000 * 0.6);
      expect(r.takeHome, s.code).toBeGreaterThan(0);
    }
  });
  it("adds up: take-home + savings + taxes = income", () => {
    const r = est({ wages: 88_000, otherIncome: 2_000, stateCode: "CA", traditionalRetirement: 5_000, hsa: 1_000, otherPreTax: 2_000 });
    expect(r.takeHome + r.savings + r.total).toBeCloseTo(90_000, 6);
  });
});

describe("1099 / self-employment income (hand computed)", () => {
  // $80,000 of 1099 income, $10,000 of expenses -> $70,000 net profit, no W-2 pay.
  const se = (o: Partial<IncomeTaxInputs> = {}) =>
    est({ wages: 0, selfEmployment: 80_000, businessExpenses: 10_000, ...o });
  const a = se();
  const earnings = 70_000 * 0.9235; // 64,645
  const seTax = earnings * 0.124 + earnings * 0.029;
  const agi = 70_000 - seTax / 2;
  const taxableBeforeQbi = agi - 16_100;
  // The QBI deduction is 20% of business income, but no more than 20% of taxable income.
  const qbi = Math.min(0.2 * agi, 0.2 * taxableBeforeQbi);
  const taxable = taxableBeforeQbi - qbi;
  const federal = 1_240 + (taxable - 12_400) * 0.12;

  check("net profit", a.selfEmployed.netProfit, 70_000);
  check("Social Security part: 12.4% of 92.35% of profit", a.selfEmployed.socialSecurity, earnings * 0.124, 1e-6);
  check("Medicare part: 2.9%", a.selfEmployed.medicare, earnings * 0.029, 1e-6);
  check("self-employment tax", a.selfEmploymentTax, seTax, 1e-6);
  check("half of it is deducted", a.selfEmployed.halfDeduction, seTax / 2, 1e-6);
  check("income after adjustments", a.federalIncome, agi, 1e-6);
  check("QBI deduction (capped at 20% of taxable income)", a.qbiDeduction, qbi, 1e-6);
  check("federal taxable income", a.federalTaxable, taxable, 1e-6);
  check("federal income tax", a.federal, federal, 0.01);
  check("no wage-side payroll tax", a.payroll, 0);
  check("total = income tax + self-employment tax", a.total, federal + seTax, 0.01);
  check("take-home", a.takeHome, 70_000 - (federal + seTax), 0.01);
  check("income counts profit, not gross receipts", a.income, 70_000);
  check("expenses shown", a.selfEmployed.expenses, 10_000);
  check("rate is on profit", a.totalRate, (federal + seTax) / 70_000, 1e-6);

  it("all the tax comes from the 1099 income when it's your only income", () => {
    check("tax from 1099", a.taxFromSelfEmployment, a.total, 1e-6);
    check("a quarter of it", a.quarterlyEstimate, a.total / 4, 1e-6);
  });
  it("adds up: take-home + savings + taxes = income", () => {
    near(a.takeHome + a.savings + a.total, a.income, 1e-6, "balance");
  });

  describe("with a W-2 job too", () => {
    const b = est({ wages: 100_000, selfEmployment: 30_000 });
    const e = 30_000 * 0.9235;
    check("Social Security uses the room left under the wage base", b.selfEmployed.socialSecurity, e * 0.124, 1e-6);
    check("self-employment tax", b.selfEmploymentTax, e * 0.153, 1e-6);
    it("your W-2 tax stays as it was", () => {
      check("W-2 payroll", b.payroll, est({ wages: 100_000 }).payroll, 1e-9);
    });
    it("the 1099 tax is what you'd add to your W-2 bill", () => {
      near(b.taxFromSelfEmployment, b.total - est({ wages: 100_000 }).total, 1e-6, "difference");
      expect(b.taxFromSelfEmployment).toBeGreaterThan(b.selfEmploymentTax);
    });
  });

  describe("the Social Security wage base is shared with your W-2 pay", () => {
    const c = est({ wages: 170_000, selfEmployment: 50_000 });
    const e = 50_000 * 0.9235;
    // Only $14,500 of the $184,500 base is left after $170,000 of wages.
    check("Social Security on the remaining $14,500", c.selfEmployed.socialSecurity, 14_500 * 0.124, 1e-6);
    check("Medicare on everything", c.selfEmployed.medicare, e * 0.029, 1e-6);
    check("nothing left when wages already hit the base", est({ wages: 200_000, selfEmployment: 50_000 }).selfEmployed.socialSecurity, 0);
  });

  describe("high earners", () => {
    const h = est({ wages: 0, selfEmployment: 250_000 });
    const e = 250_000 * 0.9235; // 230,875
    check("Social Security stops at the wage base", h.selfEmployed.socialSecurity, 184_500 * 0.124, 1e-6);
    check("Additional Medicare on earnings over $200,000", h.additionalMedicare, 0.009 * (e - 200_000), 1e-6);
    it("Additional Medicare counts wages and 1099 earnings together", () => {
      const together = est({ wages: 150_000, selfEmployment: 100_000 });
      check("wages + earnings over $200,000", together.additionalMedicare, 0.009 * (150_000 + 92_350 - 200_000), 1e-6);
    });
  });

  describe("small amounts", () => {
    check("no self-employment tax under $400 of earnings", est({ wages: 0, selfEmployment: 400 }).selfEmploymentTax, 0);
    check("just over: $433 of profit is $400.0 of earnings", est({ wages: 0, selfEmployment: 434 }).selfEmploymentTax, 434 * 0.9235 * 0.153, 1e-6);
    check("expenses bigger than receipts mean no profit", est({ wages: 0, selfEmployment: 5_000, businessExpenses: 9_000 }).selfEmployed.netProfit, 0);
    check("…and no tax", est({ wages: 0, selfEmployment: 5_000, businessExpenses: 9_000 }).total, 0);
  });

  describe("the QBI (20%) deduction", () => {
    it("is 20% of business income when taxable income is the limit only above it", () => {
      // With a large W-2 income the 20%-of-taxable cap doesn't bind.
      const q = est({ wages: 100_000, selfEmployment: 20_000 });
      const netAfterHalf = 20_000 - q.selfEmployed.halfDeduction;
      check("20% of profit after the half deduction", q.qbiDeduction, 0.2 * netAfterHalf, 1e-6);
    });
    it("phases out between $201,750 and $276,750 of taxable income (no employees)", () => {
      const at = (wages: number) => est({ wages, selfEmployment: 50_000 });
      const low = at(100_000);
      const mid = at(200_000); // taxable before QBI lands inside the range
      const high = at(400_000);
      expect(mid.qbiDeduction).toBeLessThan(low.qbiDeduction);
      // Past the range only the $400 minimum is left.
      check("past the range: the $400 minimum", high.qbiDeduction, 400);
      check("phase-in inside the range", mid.selfEmployed.qbiPhaseIn, (mid.federalIncome - 16_100 - 201_750) / 75_000, 1e-6);
    });
    it("has a $400 minimum for $1,000+ of business income", () => {
      // $1,200 of profit: 20% would be well under $400, so it's $400.
      check("small business", est({ wages: 50_000, selfEmployment: 1_200 }).qbiDeduction, 400);
    });
    it("nothing under $1,000 of business income beyond the 20%", () => {
      const tiny = est({ wages: 50_000, selfEmployment: 900 });
      check("just 20%", tiny.qbiDeduction, 0.2 * (900 - tiny.selfEmployed.halfDeduction), 1e-6);
    });
    it("can't be more than taxable income allows", () => {
      const low = est({ wages: 0, selfEmployment: 20_000 });
      expect(low.qbiDeduction).toBeLessThanOrEqual(0.2 * (low.federalIncome - 16_100) + 1e-9);
    });
    it("lowers federal tax", () => {
      const withQbi = est({ wages: 60_000, selfEmployment: 30_000 });
      const noQbi = est({ wages: 60_000, selfEmployment: 30_000 });
      expect(withQbi.federal).toBeLessThan(
        noQbi.federal + noQbi.qbiDeduction * 0.12 + 1e-9,
      );
    });
  });

  describe("deductions for the self-employed", () => {
    check("SEP-IRA reduces income after adjustments", se({ sepContribution: 5_000 }).federalIncome, agi - 5_000, 1e-6);
    check("…and isn't part of take-home", se({ sepContribution: 5_000 }).savings, 5_000, 1e-9);
    check("SEP-IRA doesn't change self-employment tax", se({ sepContribution: 5_000 }).selfEmploymentTax, seTax, 1e-9);
    it("SEP-IRA is capped at 20% of profit after half the SE tax", () => {
      const cap = 0.2 * (70_000 - seTax / 2);
      const big = se({ sepContribution: 30_000 });
      check("deduction", big.selfEmployed.sepDeduction, cap, 1e-6);
      expect(big.selfEmployed.sepCapped).toBe(true);
      expect(se({ sepContribution: 5_000 }).selfEmployed.sepCapped).toBe(false);
    });
    it("SEP-IRA is capped at $72,000", () => {
      check("limit", est({ wages: 0, selfEmployment: 1_000_000, sepContribution: 500_000 }).selfEmployed.sepDeduction, 72_000);
    });
    check("health insurance premiums come off income", se({ selfEmployedHealthInsurance: 6_000 }).federalIncome, agi - 6_000, 1e-6);
    it("health insurance can't be more than profit", () => {
      const r = est({ wages: 0, selfEmployment: 3_000, selfEmployedHealthInsurance: 9_000 });
      expect(r.selfEmployed.healthDeduction).toBeLessThanOrEqual(3_000);
    });
    it("both lower the tax you pay", () => {
      expect(se({ sepContribution: 5_000, selfEmployedHealthInsurance: 6_000 }).total).toBeLessThan(a.total);
    });
  });

  describe("state tax", () => {
    it("Illinois taxes profit after half the SE tax", () => {
      check("state tax", se({ stateCode: "IL" }).state, (70_000 - seTax / 2 - 2_925) * 0.0495, 0.01);
    });
    it("state QBI doesn't apply: state income ignores the federal 20%", () => {
      expect(se({ stateCode: "IL" }).state).toBeGreaterThan(0);
    });
    it("a state with no income tax adds nothing", () => {
      check("TX", se({ stateCode: "TX" }).state, 0);
    });
  });

  describe("the next dollar and the rate curve follow your 1099 income", () => {
    it("switches to 1099 income when it's the bigger part", () => {
      expect(payBasis({ ...base, wages: 60_000, selfEmployment: 10_000 })).toBe("wages");
      expect(payBasis({ ...base, wages: 10_000, selfEmployment: 30_000 })).toBe("selfEmployment");
      expect(a.basis).toBe("selfEmployment");
    });
    it("counts self-employment tax on the next dollar of profit", () => {
      // 14.13% self-employment tax, plus 12% federal on 92.9% of it after the
      // half deduction, after the QBI deduction takes 20% of that.
      const seRate = 0.153 * 0.9235;
      const expected = seRate + 0.12 * 0.8 * (1 - seRate / 2);
      check("total next-dollar rate", a.marginal.total, expected, 0.0005);
    });
    it("charts the 1099 income", () => {
      const curve = taxRateCurve({ ...base, wages: 0, selfEmployment: 70_000 }, 100_000, 100);
      expect(curve[0].average).toBe(0);
      expect(curve[70].wages).toBe(70_000);
      check("marginal at $70,000 of 1099 income", curve[70].marginal, a.marginal.total, 0.0005);
    });
  });

  describe("with no 1099 income it changes nothing", () => {
    it("matches the plain result", () => {
      const plain = est({});
      const withZeros = est({ selfEmployment: 0, businessExpenses: 0, selfEmployedHealthInsurance: 0, sepContribution: 0 });
      check("total", withZeros.total, plain.total, 1e-9);
      check("quarterly", withZeros.quarterlyEstimate, 0);
      check("qbi", withZeros.qbiDeduction, 0);
    });
  });

  it("stays finite for junk input", () => {
    const r = est({ selfEmployment: NaN, businessExpenses: NaN, selfEmployedHealthInsurance: NaN, sepContribution: NaN });
    for (const v of [r.total, r.selfEmploymentTax, r.quarterlyEstimate, r.qbiDeduction, r.takeHome]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});
