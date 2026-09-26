import { describe, expect, it } from "vitest";
import { check, near } from "../helpers";
import {
  MAX_MONTHS,
  runStrategy,
  at,
  describeMonths,
  estimateDebtPayoff,
  type Debt,
  type DebtPayoffInputs,
} from "@/lib/debtPayoff";

const debt = (id: number, name: string, balance: number, aprPct: number, minimum: number): Debt => ({ id, name, balance, aprPct, minimum });
const run = (debts: Debt[], extraPerMonth = 0, horizonMonths = 36) =>
  estimateDebtPayoff({ debts, extraPerMonth, horizonMonths });

describe("one debt, worked by hand", () => {
  // $1,000 at 12% a year (1% a month), paying $100 a month.
  // After 10 payments the balance is 1000(1.01)^10 - 100((1.01)^10 - 1)/0.01
  // = $58.40; month 11 adds 1% interest and pays it off with $58.98.
  const r = run([debt(1, "Card", 1_000, 12, 100)]);
  check("takes 11 months", r.results.avalanche.months!, 11);
  check("total paid", r.results.avalanche.totalPaid, 1_058.98, 0.01);
  check("total interest", r.results.avalanche.totalInterest, 58.98, 0.01);
  check("balance after 10 payments", r.results.avalanche.balanceByMonth[10], 58.4, 0.01);
  check("all three strategies agree with one debt (snowball)", r.results.snowball.totalInterest, r.results.avalanche.totalInterest, 1e-9);
  check("all three strategies agree with one debt (minimums)", r.results.minimums.totalInterest, r.results.avalanche.totalInterest, 1e-9);
  check("extra $100 a month: $200 total pays it in 6 months", run([debt(1, "Card", 1_000, 12, 100)], 100).results.avalanche.months!, 6);
  check("0% interest is just balance / payment", run([debt(1, "Loan", 1_000, 0, 100)]).results.avalanche.months!, 10);
  check("0% interest costs nothing extra", run([debt(1, "Loan", 1_000, 0, 100)]).results.avalanche.totalInterest, 0);
});

describe("snowball vs avalanche: which debt gets the extra", () => {
  // A: $1,000 at 24%, minimum $50.  B: $500 at 6%, minimum $25.  Extra $100.
  const debts = [debt(1, "High rate", 1_000, 24, 50), debt(2, "Small", 500, 6, 25)];
  const r = run(debts, 100);
  it("snowball clears the smaller balance first", () => {
    expect(r.results.snowball.payoffOrder.map((d) => d.name)).toEqual(["Small", "High rate"]);
  });
  it("avalanche clears the higher rate first", () => {
    expect(r.results.avalanche.payoffOrder.map((d) => d.name)).toEqual(["High rate", "Small"]);
  });
  it("avalanche pays less interest than snowball, and both beat minimums", () => {
    expect(r.results.avalanche.totalInterest).toBeLessThan(r.results.snowball.totalInterest);
    expect(r.results.snowball.totalInterest).toBeLessThan(r.results.minimums.totalInterest);
  });
  it("month 1: both spend the same money, so the total balance matches", () => {
    // Interest 20 + 2.50; payments 175 in all.
    near(r.results.snowball.balanceByMonth[1], 1_500 + 22.5 - 175, 0.005, "snowball");
    near(r.results.avalanche.balanceByMonth[1], 1_500 + 22.5 - 175, 0.005, "avalanche");
  });
  check("interest saved by avalanche", r.interestSavedByAvalanche, r.results.snowball.totalInterest - r.results.avalanche.totalInterest);
  it("snowball gets its first win sooner", () => {
    expect(r.firstWinMonthsSoonerWithSnowball).toBeGreaterThan(0);
  });
  it("freed-up minimums roll over: extra keeps the same total each month", () => {
    // Everything paid in full should equal balances + interest.
    for (const s of ["snowball", "avalanche", "minimums"] as const) {
      near(r.results[s].totalPaid, 1_500 + r.results[s].totalInterest, 0.01, `${s}: paid = balance + interest`);
    }
  });
});

describe("the time horizon", () => {
  const debts = [
    debt(1, "Credit card", 6_000, 24, 150),
    debt(2, "Personal loan", 2_000, 9, 80),
    debt(3, "Car loan", 9_000, 6.5, 220),
  ];
  const r = run(debts, 200, 24);
  it("reports each strategy's balance and interest at 24 months", () => {
    for (const s of ["minimums", "snowball", "avalanche"] as const) {
      near(r.atHorizon[s].balance, r.results[s].balanceByMonth[24], 1e-9, `${s}: balance`);
      near(r.atHorizon[s].interest, r.results[s].interestByMonth[24], 1e-9, `${s}: interest`);
    }
  });
  it("has less left after two years with avalanche than with minimums only", () => {
    expect(r.atHorizon.avalanche.balance).toBeLessThan(r.atHorizon.minimums.balance);
  });
  it("finds the smallest extra that clears everything in the horizon", () => {
    expect(r.onTrack).toBe(false);
    const needed = r.extraNeeded;
    const enough = run(debts, needed, 24);
    const oneLess = run(debts, needed - 1, 24);
    expect(enough.results.avalanche.months!).toBeLessThanOrEqual(24);
    expect(oneLess.results.avalanche.months ?? Infinity).toBeGreaterThan(24);
  });
  it("says you're on track when your extra already does it", () => {
    const on = run(debts, r.extraNeeded, 24);
    expect(on.onTrack).toBe(true);
    expect(on.extraNeeded).toBe(r.extraNeeded);
  });
  it("holds a paid-off balance at zero past the end", () => {
    const done = run([debt(1, "Loan", 500, 0, 100)], 0, 60);
    near(done.atHorizon.avalanche.balance, 0, 1e-9, "zero at the horizon");
    expect(done.atHorizon.avalanche.debtFree).toBe(true);
    near(at(done.results.avalanche.balanceByMonth, 999), 0, 1e-9, "reads the series past its end");
  });
});

describe("more money never makes it worse", () => {
  const debts = [debt(1, "A", 4_000, 19.9, 90), debt(2, "B", 1_500, 8, 45), debt(3, "C", 7_500, 5.5, 160)];
  it("more extra means fewer months and less interest, for every strategy", () => {
    for (const s of ["minimums", "snowball", "avalanche"] as const) {
      let lastMonths = Infinity;
      let lastInterest = Infinity;
      for (const extra of [0, 50, 150, 400, 1_000]) {
        const r = run(debts, extra).results[s];
        if (s === "minimums") continue; // extra doesn't apply
        expect(r.months!, `${s} +$${extra}`).toBeLessThanOrEqual(lastMonths);
        expect(r.totalInterest, `${s} +$${extra}`).toBeLessThanOrEqual(lastInterest + 1e-9);
        lastMonths = r.months!;
        lastInterest = r.totalInterest;
      }
    }
  });
});

describe("avalanche is never worse than snowball on interest (100 random setups)", () => {
  // A small deterministic generator so failures are reproducible.
  let seed = 12345;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let n = 0; n < 100; n++) {
    const count = 2 + Math.floor(rand() * 4);
    const debts = Array.from({ length: count }, (_, i) => {
      const balance = Math.round(500 + rand() * 15_000);
      const apr = Math.round((2 + rand() * 26) * 10) / 10;
      const minimum = Math.round(balance * (0.015 + rand() * 0.03));
      return debt(i + 1, `Debt ${i + 1}`, balance, apr, minimum);
    });
    const extra = Math.round(rand() * 500);
    it(`setup ${n + 1}: ${count} debts, +$${extra}`, () => {
      const r = run(debts, extra);
      expect(r.results.avalanche.totalInterest).toBeLessThanOrEqual(r.results.snowball.totalInterest + 0.01);
      expect(r.results.avalanche.totalInterest).toBeLessThanOrEqual(r.results.minimums.totalInterest + 0.01);
      for (const s of ["snowball", "avalanche"] as const) {
        expect(r.results[s].totalPaid).toBeCloseTo(r.totalBalance + r.results[s].totalInterest, 4);
      }
    });
  }
});

describe("edge cases", () => {
  it("has nothing to do with no debts", () => {
    const r = run([]);
    expect(r.empty).toBe(true);
    expect(r.results.avalanche.months).toBe(0);
    expect(r.extraNeeded).toBe(0);
  });
  it("ignores a debt with no balance", () => {
    expect(run([debt(1, "Paid", 0, 20, 50), debt(2, "Real", 500, 0, 100)]).debtCount).toBe(1);
  });
  it("gives a blank name a default", () => {
    expect(run([debt(1, "  ", 500, 0, 100)]).results.avalanche.payoffOrder[0].name).toBe("Debt 1");
  });
  it("never pays off when the minimum doesn't cover the interest", () => {
    // $10,000 at 24% costs $200 a month in interest; $100 goes nowhere.
    const r = run([debt(1, "Card", 10_000, 24, 100)]);
    expect(r.minimumsBelowInterest).toBe(true);
    expect(r.results.minimums.months).toBeNull();
    expect(r.results.minimums.balanceByMonth).toHaveLength(MAX_MONTHS + 1);
    expect(r.results.minimums.balanceByMonth[MAX_MONTHS]).toBeGreaterThan(10_000);
  });
  it("still finds a way out with enough extra", () => {
    const r = run([debt(1, "Card", 10_000, 24, 100)], 300, 60);
    expect(r.results.avalanche.months).not.toBeNull();
    expect(r.results.avalanche.months!).toBeLessThan(60);
  });
  it("finds the extra needed even when minimums are tiny", () => {
    const r = run([debt(1, "Card", 10_000, 24, 100)], 0, 36);
    expect(r.extraNeeded).toBeGreaterThan(200);
    const enough = run([debt(1, "Card", 10_000, 24, 100)], r.extraNeeded, 36);
    expect(enough.results.avalanche.months!).toBeLessThanOrEqual(36);
  });
  it("handles a debt with a zero minimum by paying it from the extra", () => {
    const r = run([debt(1, "Friend", 300, 0, 0)], 100);
    expect(r.results.avalanche.months).toBe(3);
    expect(r.results.minimums.months).toBeNull();
  });
  it("stays finite for junk input", () => {
    const r = estimateDebtPayoff({
      debts: [{ id: 1, name: "x", balance: NaN, aprPct: -5, minimum: NaN }, { id: 2, name: "y", balance: 1_000, aprPct: NaN, minimum: 50 }],
      extraPerMonth: NaN,
      horizonMonths: NaN,
    } as DebtPayoffInputs);
    for (const v of [r.totalBalance, r.results.avalanche.totalInterest, r.extraNeeded]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
  it("finishes all 100 years quickly even at 100% interest", () => {
    const t = Date.now();
    run([debt(1, "Shark", 50_000, 100, 10)], 0, 1_200);
    expect(Date.now() - t).toBeLessThan(2_000);
  });
});

describe("wording", () => {
  it("describes months", () => {
    expect(describeMonths(1)).toBe("1 month");
    expect(describeMonths(11)).toBe("11 months");
    expect(describeMonths(12)).toBe("1 year");
    expect(describeMonths(16)).toBe("1 year, 4 months");
    expect(describeMonths(24)).toBe("2 years");
    expect(describeMonths(30)).toBe("2 years, 6 months");
  });
});

describe("a rate discount (like autopay)", () => {
  const card = [{ name: "Card", balance: 1_000, apr: 12, minimum: 100, discountEligible: true }];
  it("changes nothing when no discount is given", () => {
    const plain = runStrategy(card, 0, "avalanche");
    expect(plain.months).toBe(11);
    near(plain.totalInterest, 58.98, 0.01, "interest");
  });
  it("a discount as big as the rate makes the debt interest-free", () => {
    const free = runStrategy(card, 0, "avalanche", () => 12);
    expect(free.months).toBe(10);
    near(free.totalInterest, 0, 1e-9, "no interest");
  });
  it("only touches eligible debts", () => {
    const off = runStrategy([{ ...card[0], discountEligible: false }], 0, "avalanche", () => 12);
    expect(off.months).toBe(11);
  });
  it("can change month to month", () => {
    const some = runStrategy(card, 0, "avalanche", (m) => (m <= 3 ? 12 : 0));
    const none = runStrategy(card, 0, "avalanche");
    expect(some.totalInterest).toBeLessThan(none.totalInterest);
    near(some.balanceByMonth[3], 700, 1e-6, "interest-free for 3 months: 3 x $100 off the balance");
  });
});
