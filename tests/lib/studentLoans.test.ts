import { describe, expect, it } from "vitest";
import { check, near } from "../helpers";
import {
  AUTOPAY_STANDARD_DISCOUNT,
  AUTOPAY_TEMPORARY_DISCOUNT,
  RAP_FORGIVENESS_MONTHS,
  amortizedPayment,
  autopayBoostMonths,
  estimateStudentLoans,
  rapMonthlyPayment,
  tieredTermMonths,
  type Loan,
  type StudentLoanInputs,
} from "@/lib/studentLoans";

const loan = (id: number, balance: number, ratePct: number, subsidized = false): Loan => ({ id, name: `Loan ${id}`, balance, ratePct, subsidized });
const base: StudentLoanInputs = {
  loans: [loan(1, 10_000, 6)],
  monthsUntilRepayment: 0,
  plan: "standard",
  customYears: 15,
  extraPerMonth: 0,
  income: 50_000,
  dependents: 0,
  raisePct: 0,
};
const est = (o: Partial<StudentLoanInputs>) => estimateStudentLoans({ ...base, ...o });

describe("the loan payment formula", () => {
  check("$10,000 at 6% over 10 years", amortizedPayment(10_000, 6, 120), 111.02);
  check("$10,000 at 6% over 25 years", amortizedPayment(10_000, 6, 300), 64.43);
  check("0% interest is just balance / months", amortizedPayment(12_000, 0, 120), 100);
  check("nothing owed", amortizedPayment(0, 6, 120), 0);
});

describe("Tiered Standard terms by balance", () => {
  check("under $25,000: 10 years", tieredTermMonths(24_999.99), 120);
  check("$25,000: 15 years", tieredTermMonths(25_000), 180);
  check("$49,999: 15 years", tieredTermMonths(49_999), 180);
  check("$50,000: 20 years", tieredTermMonths(50_000), 240);
  check("$99,999: 20 years", tieredTermMonths(99_999), 240);
  check("$100,000: 25 years", tieredTermMonths(100_000), 300);
  check("plan picks the term from the balance ($30,000 -> 15 years)", est({ loans: [loan(1, 30_000, 6.52)], plan: "tiered" }).chosen.months!, 180);
});

describe("the Repayment Assistance Plan payment (AGI bands)", () => {
  check("$50,000: 4% of AGI", rapMonthlyPayment(50_000, 0), 2_000 / 12);
  check("$50,001 moves up to 5%", rapMonthlyPayment(50_001, 0), (50_001 * 0.05) / 12);
  check("$100,000: 9%", rapMonthlyPayment(100_000, 0), 750);
  check("$100,001: 10%", rapMonthlyPayment(100_001, 0), (100_001 * 0.1) / 12);
  check("$250,000 stays at 10%", rapMonthlyPayment(250_000, 0), 250_000 / 120);
  check("$20,000: 1%", rapMonthlyPayment(20_000, 0), 200 / 12);
  check("$20,001: 2%", rapMonthlyPayment(20_001, 0), (20_001 * 0.02) / 12);
  check("$10,000 or less: the $10 minimum", rapMonthlyPayment(8_000, 0), 10);
  check("a 1% payment under $10 is raised to $10", rapMonthlyPayment(12_000, 0), 10);
  check("$50 off per dependent", rapMonthlyPayment(50_000, 2), 2_000 / 12 - 100);
  check("never below $10", rapMonthlyPayment(50_000, 4), 10);
  check("no income: $10", rapMonthlyPayment(0, 0), 10);
});

describe("interest before repayment starts", () => {
  const unsub = est({ monthsUntilRepayment: 12 });
  check("unsubsidized: a year at 6% adds $600", unsub.balanceAtStart, 10_600);
  check("…reported as interest built up", unsub.interestBuilt, 600);
  check("subsidized: nothing builds up", est({ loans: [loan(1, 10_000, 6, true)], monthsUntilRepayment: 12 }).balanceAtStart, 10_000);
  check("already repaying: nothing added", est({}).balanceAtStart, 10_000);
  check("payments are sized on the bigger balance", unsub.chosen.monthlyPayment, amortizedPayment(10_600, 6, 120));
});

describe("fixed-term plans, one loan (hand computed)", () => {
  const s = est({});
  check("Standard payment", s.chosen.monthlyPayment, 111.02);
  check("Standard: 120 months", s.chosen.months!, 120);
  check("Standard: total paid", s.chosen.totalPaid, 111.0205 * 120, 0.05);
  check("Standard: interest", s.chosen.totalInterest, 111.0205 * 120 - 10_000, 0.05);
  check("Standard: paid = borrowed + interest", s.chosen.totalPaid, 10_000 + s.chosen.totalInterest, 0.01);
  check("Standard: nothing forgiven", s.chosen.forgiven, 0);
  const e = est({ plan: "extended" });
  check("Extended payment", e.chosen.monthlyPayment, 64.43);
  check("Extended: 300 months", e.chosen.months!, 300);
  it("Extended costs less a month but more overall", () => {
    expect(e.chosen.monthlyPayment).toBeLessThan(s.chosen.monthlyPayment);
    expect(e.chosen.totalInterest).toBeGreaterThan(s.chosen.totalInterest);
  });
  check("your own 15-year term", est({ plan: "custom", customYears: 15 }).chosen.months!, 180);
  check("your own term payment", est({ plan: "custom", customYears: 15 }).chosen.monthlyPayment, amortizedPayment(10_000, 6, 180));
  check("0% loan", est({ loans: [loan(1, 12_000, 0)] }).chosen.totalInterest, 0);
  check("balance is $0 at the end", s.chosen.balanceByMonth[120], 0, 0.01);
});

describe("several loans", () => {
  const loans = [loan(1, 20_000, 6.52), loan(2, 8_000, 3.4, true), loan(3, 5_000, 8.07)];
  const r = est({ loans, plan: "standard" });
  it("adds up each loan's own payment", () => {
    const expected = amortizedPayment(20_000, 6.52, 120) + amortizedPayment(8_000, 3.4, 120) + amortizedPayment(5_000, 8.07, 120);
    near(r.chosen.monthlyPayment, expected, 1e-6);
  });
  it("all loans finish together on a fixed term", () => {
    expect(r.chosen.months).toBe(120);
  });
  it("tiered term is set by the combined balance ($33,000 -> 15 years)", () => {
    expect(est({ loans, plan: "tiered" }).chosen.months).toBe(180);
  });
});

describe("extra payments", () => {
  // $211.02 a month against a $10,000 balance at 0.5% a month: 55 months.
  const x = est({ extraPerMonth: 100 });
  check("months with $100 extra", x.chosen.months!, 55);
  check("months saved", x.monthsSavedByExtra, 65);
  it("saves interest", () => {
    expect(x.interestSavedByExtra).toBeGreaterThan(1_000);
  });
  check("the required payment doesn't change", x.chosen.monthlyPayment, 111.02);
  check("the comparison table ignores your extra", x.compared.standard.months!, 120);
  it("goes to the highest-rate loan first with several loans", () => {
    const r = est({ loans: [loan(1, 10_000, 3), loan(2, 10_000, 9)], extraPerMonth: 200 });
    expect(r.monthsSavedByExtra).toBeGreaterThan(0);
    expect(r.interestSavedByExtra).toBeGreaterThan(0);
  });
});

describe("the Repayment Assistance Plan over time", () => {
  const rap = (o: Partial<StudentLoanInputs>) => est({ plan: "rap", ...o });

  it("pays a small loan off like a normal loan when the payment covers interest", () => {
    // $2,000 at 6% with a $250 payment (5% of $60,000): 9 months.
    const r = rap({ loans: [loan(1, 2_000, 6)], income: 60_000 });
    expect(r.chosen.months).toBe(9);
    expect(r.chosen.forgiven).toBe(0);
    near(r.chosen.monthlyPayment, 250, 1e-9);
  });

  describe("when the payment doesn't cover the interest", () => {
    // $50,000 at 7% costs $291.67 a month in interest; 2% of $30,000 is $50.
    const r = rap({ loans: [loan(1, 50_000, 7)], income: 30_000 });
    check("the balance doesn't grow", r.chosen.balanceByMonth[120], 50_000, 0.01);
    check("payments run the full 30 years", r.chosen.months!, RAP_FORGIVENESS_MONTHS);
    check("everything left is forgiven", r.chosen.forgiven, 50_000, 0.01);
    check("every payment went to interest", r.chosen.totalInterest, 50 * 360, 0.01);
    check("total paid", r.chosen.totalPaid, 18_000, 0.01);
    check("first payment", r.chosen.monthlyPayment, 50);
  });

  it("raises the payment as your income grows", () => {
    const r = rap({ loans: [loan(1, 60_000, 6)], income: 50_000, raisePct: 3 });
    near(r.chosen.monthlyPayment, 2_000 / 12, 1e-9);
    expect(r.chosen.peakPayment).toBeGreaterThan(r.chosen.monthlyPayment);
  });

  it("stays flat with no raises", () => {
    const r = rap({ loans: [loan(1, 60_000, 6)], income: 50_000, raisePct: 0 });
    near(r.chosen.peakPayment, r.chosen.monthlyPayment, 1e-9);
  });

  it("charges more with a higher income and less with dependents", () => {
    const low = rap({ income: 40_000 }).chosen.monthlyPayment;
    const high = rap({ income: 90_000 }).chosen.monthlyPayment;
    const kids = rap({ income: 90_000, dependents: 2 }).chosen.monthlyPayment;
    expect(high).toBeGreaterThan(low);
    near(kids, high - 100, 1e-9);
  });

  it("balances: paid - interest = borrowed - forgiven", () => {
    for (const income of [15_000, 40_000, 75_000, 150_000]) {
      const r = rap({ loans: [loan(1, 30_000, 6.52), loan(2, 15_000, 8.07)], income, raisePct: 2 }).chosen;
      near(r.totalPaid - r.totalInterest, 45_000 - r.forgiven, 0.01, `income ${income}`);
    }
  });

  it("extra payments finish it sooner and forgive less", () => {
    const loans = [loan(1, 40_000, 7)];
    const without = rap({ loans, income: 35_000 }).chosen;
    const withExtra = rap({ loans, income: 35_000, extraPerMonth: 300 }).chosen;
    expect(withExtra.months!).toBeLessThan(without.months!);
    expect(withExtra.forgiven).toBeLessThan(without.forgiven);
  });

  it("a big enough extra pays everything off with nothing forgiven", () => {
    const r = rap({ loans: [loan(1, 10_000, 6)], income: 20_000, extraPerMonth: 1_000 });
    expect(r.chosen.forgiven).toBe(0);
    expect(r.chosen.months!).toBeLessThan(12);
  });

  it("works across several loans (payment shared out by balance)", () => {
    const r = rap({ loans: [loan(1, 30_000, 6.52), loan(2, 10_000, 8.07)], income: 80_000 });
    expect(r.chosen.balanceByMonth[1]).toBeLessThan(40_000);
    expect(r.chosen.balanceByMonth.every((b) => b >= 0)).toBe(true);
  });
});

describe("comparing plans", () => {
  const r = est({ loans: [loan(1, 40_000, 6.52)], income: 45_000 });
  it("lists every plan, without your extra", () => {
    expect(Object.keys(r.compared).sort()).toEqual(["custom", "extended", "rap", "standard", "tiered"]);
  });
  it("orders the fixed plans by payment and by cost", () => {
    expect(r.compared.standard.monthlyPayment).toBeGreaterThan(r.compared.tiered.monthlyPayment);
    expect(r.compared.tiered.monthlyPayment).toBeGreaterThan(r.compared.extended.monthlyPayment);
    expect(r.compared.standard.totalInterest).toBeLessThan(r.compared.tiered.totalInterest);
    expect(r.compared.tiered.totalInterest).toBeLessThan(r.compared.extended.totalInterest);
  });
  it("RAP is the cheapest month for a lower income, but can leave a balance forgiven", () => {
    expect(r.compared.rap.monthlyPayment).toBeLessThan(r.compared.standard.monthlyPayment);
  });
  check("the chosen plan matches its row in the table", r.chosenNoExtra.totalPaid, r.compared.standard.totalPaid, 1e-9);
});

describe("affordability", () => {
  const r = est({});
  check("payment as a share of income ($111.02 of $4,166.67)", r.paymentShareOfIncome!, 111.0205 / (50_000 / 12), 1e-4);
  check("borrowed vs yearly income", r.borrowedVsIncome!, 0.2);
  it("has no ratio without an income", () => {
    const none = est({ income: 0 });
    expect(none.paymentShareOfIncome).toBeNull();
    expect(none.borrowedVsIncome).toBeNull();
  });
});

describe("edge cases", () => {
  it("has nothing to do with no loans", () => {
    const r = est({ loans: [] });
    expect(r.empty).toBe(true);
    expect(r.chosen.monthlyPayment).toBe(0);
  });
  it("ignores loans with no balance and names blank ones", () => {
    const r = est({ loans: [loan(1, 0, 6), { ...loan(2, 1_000, 5), name: " " }] });
    expect(r.loans).toHaveLength(1);
    expect(r.loans[0].name).toBe("Loan 2");
  });
  it("stays finite for junk input", () => {
    const r = estimateStudentLoans({
      loans: [{ id: 1, name: "x", balance: NaN, ratePct: NaN, subsidized: false }, loan(2, 5_000, -3)],
      monthsUntilRepayment: NaN,
      plan: "rap",
      customYears: NaN,
      extraPerMonth: NaN,
      income: NaN,
      dependents: NaN,
      raisePct: NaN,
    });
    for (const v of [r.chosen.monthlyPayment, r.chosen.totalPaid, r.chosen.totalInterest, r.balanceAtStart]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
  it("clamps your own term to 1-30 years", () => {
    expect(est({ plan: "custom", customYears: 99 }).customMonths).toBe(360);
    expect(est({ plan: "custom", customYears: 0 }).customMonths).toBe(12);
  });
});

describe("autopay discount on federal loans", () => {
  // A plain step-by-step loan, worked independently of the engine: the payment
  // is set from the full rate, and the rate charged is lower for the first
  // `boost` months (1 point), then 0.25 points.
  function reference(balance: number, ratePct: number, payment: number, boost: number) {
    let b = balance;
    let interest = 0;
    let m = 0;
    while (b > 0.005 && m < 1_200) {
      m++;
      const discount = m <= boost ? AUTOPAY_TEMPORARY_DISCOUNT : AUTOPAY_STANDARD_DISCOUNT;
      const i = (b * Math.max(ratePct - discount, 0)) / 1200;
      interest += i;
      b += i;
      b -= Math.min(payment, b);
    }
    return { months: m, interest };
  }
  const payment = amortizedPayment(25_000, 6.52, 120);
  const off = est({ loans: [loan(1, 25_000, 6.52)] });
  const on = est({ loans: [loan(1, 25_000, 6.52)], autopay: true, autopayBoostMonths: 21 });

  it("uses the standard 0.25 and the temporary 1 point", () => {
    expect(AUTOPAY_STANDARD_DISCOUNT).toBe(0.25);
    expect(AUTOPAY_TEMPORARY_DISCOUNT).toBe(1);
  });
  it("matches a step-by-step loan: 1 point off for 21 months, then 0.25", () => {
    const ref = reference(25_000, 6.52, payment, 21);
    expect(on.chosen.months).toBe(ref.months);
    near(on.chosen.totalInterest, ref.interest, 0.01, "interest");
  });
  it("leaves the required payment alone", () => {
    near(on.chosen.monthlyPayment, off.chosen.monthlyPayment, 1e-9);
  });
  it("saves interest, and can finish a little sooner", () => {
    expect(on.chosen.totalInterest).toBeLessThan(off.chosen.totalInterest);
    expect(on.interestSavedByAutopay).toBeCloseTo(off.chosen.totalInterest - on.chosen.totalInterest, 6);
    expect(on.chosen.months!).toBeLessThanOrEqual(off.chosen.months!);
    expect(on.monthsSavedByAutopay).toBe(off.chosen.months! - on.chosen.months!);
  });
  it("is worth more when more of your repayment is in the 1% window", () => {
    const longer = est({ loans: [loan(1, 25_000, 6.52)], autopay: true, autopayBoostMonths: 21 });
    const none = est({ loans: [loan(1, 25_000, 6.52)], autopay: true, autopayBoostMonths: 0 });
    expect(longer.interestSavedByAutopay).toBeGreaterThan(none.interestSavedByAutopay);
    // With no window left, it's just the regular 0.25.
    const ref = reference(25_000, 6.52, payment, 0);
    near(none.chosen.totalInterest, ref.interest, 0.01, "0.25 only");
  });
  it("does nothing when autopay is off", () => {
    expect(off.interestSavedByAutopay).toBe(0);
    expect(off.monthsSavedByAutopay).toBe(0);
    const stillOff = est({ loans: [loan(1, 25_000, 6.52)], autopay: false, autopayBoostMonths: 21 });
    near(stillOff.chosen.totalInterest, off.chosen.totalInterest, 1e-9);
  });
  it("skips private loans", () => {
    const priv = est({ loans: [{ ...loan(1, 25_000, 6.52), federal: false }], autopay: true, autopayBoostMonths: 21 });
    near(priv.chosen.totalInterest, off.chosen.totalInterest, 1e-9);
    expect(priv.hasFederal).toBe(false);
    expect(priv.interestSavedByAutopay).toBe(0);
  });
  it("only discounts the federal loans in a mix", () => {
    const mix = est({ loans: [loan(1, 15_000, 6.52), { ...loan(2, 10_000, 8), federal: false }], autopay: true, autopayBoostMonths: 21 });
    const fed = est({ loans: [loan(1, 15_000, 6.52)], autopay: true, autopayBoostMonths: 21 });
    const priv = est({ loans: [{ ...loan(2, 10_000, 8), federal: false }], autopay: true, autopayBoostMonths: 21 });
    near(mix.chosen.totalInterest, fed.chosen.totalInterest + priv.chosen.totalInterest, 0.01, "mix");
    expect(mix.hasFederal).toBe(true);
  });
  it("doesn't discount a rate below zero", () => {
    const low = est({ loans: [loan(1, 5_000, 0.5)], autopay: true, autopayBoostMonths: 200 });
    expect(low.chosen.totalInterest).toBeGreaterThanOrEqual(0);
  });
  it("doesn't touch the interest that builds up in school", () => {
    const school = est({ loans: [loan(1, 10_000, 6)], monthsUntilRepayment: 12, autopay: true, autopayBoostMonths: 9 });
    near(school.interestBuilt, 600, 0.005, "still $600 of in-school interest");
  });
  it("applies to every plan in the comparison", () => {
    for (const id of ["standard", "tiered", "extended"] as const) {
      const a = est({ loans: [loan(1, 25_000, 6.52)], autopay: true, autopayBoostMonths: 21, plan: id });
      const b = est({ loans: [loan(1, 25_000, 6.52)], plan: id });
      expect(a.compared[id].totalInterest, id).toBeLessThan(b.compared[id].totalInterest);
    }
  });
  it("RAP: no help when the payment is below the interest anyway", () => {
    // $80,000 at 6.52% costs about $435 a month; the payment is $50.
    const rapOff = est({ loans: [loan(1, 80_000, 6.52)], plan: "rap", income: 30_000, extraPerMonth: 0 });
    const rapOn = est({ loans: [loan(1, 80_000, 6.52)], plan: "rap", income: 30_000, extraPerMonth: 0, autopay: true, autopayBoostMonths: 21 });
    near(rapOn.chosen.forgiven, rapOff.chosen.forgiven, 0.01, "forgiven");
    near(rapOn.chosen.totalPaid, rapOff.chosen.totalPaid, 0.01, "paid");
  });
  it("RAP: helps when the payment does cover the interest", () => {
    const rapOff = est({ loans: [loan(1, 20_000, 6.52)], plan: "rap", income: 90_000 });
    const rapOn = est({ loans: [loan(1, 20_000, 6.52)], plan: "rap", income: 90_000, autopay: true, autopayBoostMonths: 21 });
    expect(rapOn.chosen.totalInterest).toBeLessThan(rapOff.chosen.totalInterest);
  });
});

describe("how many repayment months fall in the 1% window", () => {
  // The window runs through June 2028. Month is 0-based (8 = September).
  check("today Sept 2026, already repaying: 21 payments (Oct 2026 - Jun 2028)", autopayBoostMonths({ year: 2026, month: 8 }, 0), 21);
  check("starting repayment in 6 months leaves 15", autopayBoostMonths({ year: 2026, month: 8 }, 6), 15);
  check("starting after the window ends leaves 0", autopayBoostMonths({ year: 2026, month: 8 }, 30), 0);
  check("today in June 2028: 0", autopayBoostMonths({ year: 2028, month: 5 }, 0), 0);
  check("today in May 2028: 1", autopayBoostMonths({ year: 2028, month: 4 }, 0), 1);
  check("after the window: 0", autopayBoostMonths({ year: 2029, month: 2 }, 0), 0);
  check("earlier in 2026: more months", autopayBoostMonths({ year: 2026, month: 6 }, 0), 23);
});
