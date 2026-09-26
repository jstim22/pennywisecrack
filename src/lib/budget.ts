// A "bucket" budget: split your take-home pay into four buckets. Housing
// (rent or mortgage) gets its own bucket so it can't quietly crowd out
// everything else.
//
//   Housing 25% + other needs 25% = needs 50%
//   Wants 25%
//   Savings 25%
//
// The classic 50/30/20 rule (needs / wants / savings, from Elizabeth Warren
// and Amelia Warren Tyagi's "All Your Worth") is here too as a preset.

export type BucketId = "housing" | "needs" | "wants" | "savings";

export const BUCKETS: {
  id: BucketId;
  label: string;
  blurb: string;
  // Example ways people split a bucket. These are suggestions to get you
  // thinking, not rules; each list adds up to 100%.
  examples: { label: string; share: number }[];
}[] = [
  {
    id: "housing",
    label: "Housing",
    blurb: "Rent or mortgage, plus the housing costs that come with it.",
    examples: [],
  },
  {
    id: "needs",
    label: "Other needs",
    blurb: "Things you can't really skip.",
    examples: [
      { label: "Groceries", share: 35 },
      { label: "Transportation (car payment, gas, transit)", share: 25 },
      { label: "Utilities and phone", share: 15 },
      { label: "Insurance and health care", share: 15 },
      { label: "Minimum debt payments", share: 10 },
    ],
  },
  {
    id: "wants",
    label: "Wants",
    blurb: "Things that make life fun but that you could do without.",
    examples: [
      { label: "Eating out", share: 30 },
      { label: "Fun and entertainment", share: 25 },
      { label: "Shopping", share: 20 },
      { label: "Travel and hobbies", share: 15 },
      { label: "Subscriptions", share: 10 },
    ],
  },
  {
    id: "savings",
    label: "Savings",
    blurb: "Money you're paying to your future self.",
    examples: [
      { label: "Retirement", share: 40 },
      { label: "Emergency fund", share: 30 },
      { label: "Other goals and investing", share: 20 },
      { label: "Extra debt payoff", share: 10 },
    ],
  },
];

export type Percents = Record<BucketId, number>;

export const PRESETS: { id: string; label: string; percents: Percents; note: string }[] = [
  {
    id: "bucket",
    label: "25 / 25 / 25 / 25",
    percents: { housing: 25, needs: 25, wants: 25, savings: 25 },
    note: "Housing 25%, other needs 25%, wants 25%, savings 25%.",
  },
  {
    id: "classic",
    label: "50 / 30 / 20",
    percents: { housing: 25, needs: 25, wants: 30, savings: 20 },
    note: "The classic rule: needs 50% (split here into housing and other needs), wants 30%, savings 20%.",
  },
];

export const WEEKS_PER_MONTH = 52 / 12;
export const DAYS_PER_MONTH = 365 / 12;

export type BudgetInputs = {
  // Monthly pay after taxes.
  monthlyIncome: number;
  percents: Percents;
  // Optional: what you've spent so far this month in each bucket.
  spent?: Partial<Record<BucketId, number>>;
};

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

export function estimateBudget(raw: BudgetInputs) {
  const income = clamp(raw.monthlyIncome, 0, 1_000_000_000);

  const buckets = BUCKETS.map((b) => {
    const pct = clamp(raw.percents[b.id], 0, 100);
    const monthly = (income * pct) / 100;
    const spent = clamp(raw.spent?.[b.id] ?? 0, 0, 1_000_000_000);
    return {
      id: b.id,
      label: b.label,
      pct,
      monthly,
      weekly: monthly / WEEKS_PER_MONTH,
      daily: monthly / DAYS_PER_MONTH,
      yearly: monthly * 12,
      spent,
      // Positive = left to spend; negative = over.
      remaining: monthly - spent,
      overBy: Math.max(spent - monthly, 0),
      usedShare: monthly > 0 ? spent / monthly : spent > 0 ? Infinity : 0,
      examples: b.examples.map((e) => ({
        label: e.label,
        share: e.share,
        monthly: (monthly * e.share) / 100,
      })),
    };
  });

  const byId = Object.fromEntries(buckets.map((b) => [b.id, b])) as Record<
    BucketId,
    (typeof buckets)[number]
  >;
  const totalPct = buckets.reduce((s, b) => s + b.pct, 0);
  const totalSpent = buckets.reduce((s, b) => s + b.spent, 0);

  const needsPct = byId.housing.pct + byId.needs.pct;
  // Spending money: everything except what goes to savings.
  const spendPct = needsPct + byId.wants.pct;

  return {
    income,
    buckets,
    byId,
    totalPct,
    // Percentages that add to less than 100 leave money unassigned; more than
    // 100 promises more money than you have.
    unassignedPct: 100 - totalPct,
    unassigned: (income * (100 - totalPct)) / 100,
    balanced: Math.abs(totalPct - 100) < 1e-9,
    needsPct,
    needsMonthly: byId.housing.monthly + byId.needs.monthly,
    spendPct,
    spendMonthly: byId.housing.monthly + byId.needs.monthly + byId.wants.monthly,
    saveMonthly: byId.savings.monthly,
    totalSpent,
    hasSpent: totalSpent > 0,
    // What's left to spend across housing, needs, and wants this month.
    spendRemaining:
      byId.housing.remaining + byId.needs.remaining + byId.wants.remaining,
  };
}
