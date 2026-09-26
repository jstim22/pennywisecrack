import { describe, expect, it } from "vitest";
import { check, near } from "../helpers";
import {
  BUCKETS,
  DAYS_PER_MONTH,
  PRESETS,
  WEEKS_PER_MONTH,
  estimateBudget,
  type Percents,
} from "@/lib/budget";

const bucket: Percents = { housing: 25, needs: 25, wants: 25, savings: 25 };
const est = (income: number, percents: Percents = bucket, spent = {}) =>
  estimateBudget({ monthlyIncome: income, percents, spent });

describe("the 25 / 25 / 25 / 25 bucket plan on $4,000 a month", () => {
  const b = est(4_000);
  check("housing", b.byId.housing.monthly, 1_000);
  check("other needs", b.byId.needs.monthly, 1_000);
  check("wants", b.byId.wants.monthly, 1_000);
  check("savings", b.byId.savings.monthly, 1_000);
  check("needs together are 50%", b.needsMonthly, 2_000);
  check("needs percent", b.needsPct, 50);
  check("what you can spend: everything but savings", b.spendMonthly, 3_000);
  check("what you save", b.saveMonthly, 1_000);
  check("spend percent", b.spendPct, 75);
  it("adds up to 100%", () => {
    expect(b.balanced).toBe(true);
    check("total", b.totalPct, 100);
    check("nothing unassigned", b.unassigned, 0);
  });
  check("weekly wants", b.byId.wants.weekly, 1_000 / WEEKS_PER_MONTH, 1e-9);
  check("about $230 a week", b.byId.wants.weekly, 230.77, 0.01);
  check("daily wants", b.byId.wants.daily, 1_000 / DAYS_PER_MONTH, 1e-9);
  check("yearly savings", b.byId.savings.yearly, 12_000);
  it("has four buckets in order", () => {
    expect(b.buckets.map((x) => x.id)).toEqual(["housing", "needs", "wants", "savings"]);
  });
});

describe("the 50/30/20 preset", () => {
  const classic = PRESETS.find((p) => p.id === "classic")!.percents;
  const b = est(5_000, classic);
  check("needs are 50% (housing + other)", b.needsMonthly, 2_500);
  check("wants 30%", b.byId.wants.monthly, 1_500);
  check("savings 20%", b.byId.savings.monthly, 1_000);
  it("adds up to 100%", () => expect(b.balanced).toBe(true));
  it("every preset adds up to 100%", () => {
    for (const p of PRESETS) {
      expect(Object.values(p.percents).reduce((s, v) => s + v, 0), p.id).toBe(100);
    }
  });
});

describe("custom percentages", () => {
  it("flags percentages that add to less than 100", () => {
    const b = est(4_000, { housing: 30, needs: 20, wants: 20, savings: 20 });
    check("total", b.totalPct, 90);
    check("unassigned percent", b.unassignedPct, 10);
    check("unassigned dollars", b.unassigned, 400);
    expect(b.balanced).toBe(false);
  });
  it("flags percentages that add to more than 100", () => {
    const b = est(4_000, { housing: 40, needs: 30, wants: 25, savings: 25 });
    check("over by 20", b.unassignedPct, -20);
    check("dollars over", b.unassigned, -800);
  });
  it("housing can take a different share", () => {
    const b = est(4_000, { housing: 35, needs: 15, wants: 25, savings: 25 });
    check("housing", b.byId.housing.monthly, 1_400);
    check("needs still 50%", b.needsMonthly, 2_000);
  });
});

describe("what you've spent so far", () => {
  const b = est(4_000, bucket, { housing: 1_000, needs: 1_200, wants: 450, savings: 0 });
  check("left in housing", b.byId.housing.remaining, 0);
  check("over on other needs", b.byId.needs.remaining, -200);
  check("over by", b.byId.needs.overBy, 200);
  check("left in wants", b.byId.wants.remaining, 550);
  check("used share of wants", b.byId.wants.usedShare, 0.45);
  check("total spent", b.totalSpent, 2_650);
  check("left to spend across housing, needs and wants", b.spendRemaining, 350);
  it("knows you entered spending", () => expect(b.hasSpent).toBe(true));
  it("with nothing entered, everything is left", () => {
    const none = est(4_000);
    expect(none.hasSpent).toBe(false);
    check("left", none.spendRemaining, 3_000);
    check("overBy", none.byId.needs.overBy, 0);
  });
});

describe("example splits within a bucket", () => {
  it("each list adds up to 100%", () => {
    for (const b of BUCKETS) {
      if (b.examples.length === 0) continue;
      expect(b.examples.reduce((s, e) => s + e.share, 0), b.id).toBe(100);
    }
  });
  it("turns into dollars", () => {
    const wants = est(4_000).byId.wants;
    const total = wants.examples.reduce((s, e) => s + e.monthly, 0);
    near(total, wants.monthly, 1e-9, "adds up to the bucket");
    check("eating out is 30% of wants", wants.examples[0].monthly, 300);
  });
  it("housing has no example split", () => {
    expect(est(4_000).byId.housing.examples).toEqual([]);
  });
});

describe("edge cases", () => {
  it("has nothing with no income", () => {
    const b = est(0);
    check("spend", b.spendMonthly, 0);
    check("weekly", b.byId.wants.weekly, 0);
  });
  it("stays finite for junk input", () => {
    const b = estimateBudget({
      monthlyIncome: NaN,
      percents: { housing: NaN, needs: -5, wants: 500, savings: NaN },
      spent: { housing: NaN, wants: -3 },
    });
    for (const v of [b.spendMonthly, b.saveMonthly, b.unassigned, b.spendRemaining, b.totalSpent]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
  it("spending with no budget counts as over", () => {
    const b = est(0, bucket, { wants: 50 });
    check("over", b.byId.wants.overBy, 50);
  });
});
