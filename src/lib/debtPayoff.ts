// Compares ways of paying off several debts at once, month by month:
//  - minimums only: every debt gets just its minimum, nothing rolls over
//  - snowball: extra money goes to the smallest balance first
//  - avalanche: extra money goes to the highest interest rate first
// In the last two, the same total each month (all the minimums plus your
// extra) keeps going, so when a debt is paid off its minimum rolls into the
// next one.

export type Debt = {
  id: number;
  name: string;
  balance: number;
  // Yearly interest rate in percent.
  aprPct: number;
  // Fixed monthly minimum payment.
  minimum: number;
};

export type Strategy = "minimums" | "snowball" | "avalanche";

export const STRATEGIES: { value: Strategy; label: string }[] = [
  { value: "minimums", label: "Minimums only" },
  { value: "snowball", label: "Snowball" },
  { value: "avalanche", label: "Avalanche" },
];

// Stop looking after 100 years and call it "never".
export const MAX_MONTHS = 1200;
const PENNY = 0.005;

export type DebtPayoffInputs = {
  debts: Debt[];
  // Extra dollars a month, on top of all the minimums.
  extraPerMonth: number;
  // How far ahead to look, in months.
  horizonMonths: number;
};

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

export type StrategyResult = {
  strategy: Strategy;
  // Months until every debt is gone, or null if that takes over 100 years.
  months: number | null;
  totalInterest: number;
  totalPaid: number;
  // Total balance at the start (index 0) and after each month.
  balanceByMonth: number[];
  // Interest paid so far, same indexing.
  interestByMonth: number[];
  // When each debt hits zero, in the order the debts were given.
  payoffMonths: (number | null)[];
  // The debts in the order they're paid off.
  payoffOrder: { name: string; month: number | null }[];
  firstPayoffMonth: number | null;
};

export type ActiveDebt = {
  name: string;
  balance: number;
  apr: number;
  minimum: number;
  // True if this debt gets the rate discount passed to runStrategy.
  discountEligible?: boolean;
};

export function runStrategy(
  debts: ActiveDebt[],
  extra: number,
  strategy: Strategy,
  // Percentage points taken off the rate of eligible debts in a given month
  // (like an autopay discount). It lowers the interest charged, not the
  // required payment.
  rateDiscount?: (month: number) => number,
): StrategyResult {
  const bal = debts.map((d) => d.balance);
  const paidOffAt: (number | null)[] = debts.map(() => null);
  const budget = debts.reduce((s, d) => s + d.minimum, 0) + extra;
  const total = () => bal.reduce((s, b) => s + b, 0);

  const balanceByMonth = [total()];
  const interestByMonth = [0];
  let totalInterest = 0;
  let totalPaid = 0;
  let months: number | null = total() <= 0 ? 0 : null;

  for (let m = 1; months === null && m <= MAX_MONTHS; m++) {
    let monthInterest = 0;
    bal.forEach((b, i) => {
      if (b > 0) {
        const discount =
          rateDiscount && debts[i].discountEligible ? rateDiscount(m) : 0;
        const interest = (b * Math.max(debts[i].apr - discount, 0)) / 1200;
        bal[i] += interest;
        monthInterest += interest;
      }
    });
    totalInterest += monthInterest;

    const pay = bal.map((b, i) => (b > 0 ? Math.min(debts[i].minimum, b) : 0));
    if (strategy !== "minimums") {
      let available = budget - pay.reduce((s, p) => s + p, 0);
      const order = bal
        .map((_, i) => i)
        .filter((i) => bal[i] - pay[i] > PENNY)
        .sort((a, b) =>
          strategy === "snowball"
            ? bal[a] - bal[b] || debts[b].apr - debts[a].apr
            : debts[b].apr - debts[a].apr || bal[a] - bal[b],
        );
      for (const i of order) {
        if (available <= 0) break;
        const add = Math.min(available, bal[i] - pay[i]);
        pay[i] += add;
        available -= add;
      }
    }

    bal.forEach((_, i) => {
      bal[i] -= pay[i];
      totalPaid += pay[i];
      if (bal[i] <= PENNY) {
        bal[i] = 0;
        if (paidOffAt[i] === null) paidOffAt[i] = m;
      }
    });

    balanceByMonth.push(total());
    interestByMonth.push(totalInterest);
    if (total() <= 0) months = m;
  }

  const order = debts
    .map((d, i) => ({ name: d.name, month: paidOffAt[i] }))
    .sort((a, b) => (a.month ?? Infinity) - (b.month ?? Infinity));

  return {
    strategy,
    months,
    totalInterest,
    totalPaid,
    balanceByMonth,
    interestByMonth,
    payoffMonths: paidOffAt,
    payoffOrder: order,
    firstPayoffMonth: order[0]?.month ?? null,
  };
}

// The value of a month-by-month series at `month`, holding the last value
// once the series ends (a paid-off debt stays at zero).
export function at(series: number[], month: number) {
  return series[Math.min(Math.max(month, 0), series.length - 1)];
}

export function estimateDebtPayoff(raw: DebtPayoffInputs) {
  const debts: ActiveDebt[] = raw.debts
    .map((d, i) => ({
      name: d.name.trim() || `Debt ${i + 1}`,
      balance: clamp(d.balance, 0, 1_000_000_000),
      apr: clamp(d.aprPct, 0, 100),
      minimum: clamp(d.minimum, 0, 1_000_000_000),
    }))
    .filter((d) => d.balance > PENNY);
  const extra = clamp(raw.extraPerMonth, 0, 1_000_000_000);
  const horizonMonths = Math.round(clamp(raw.horizonMonths, 1, MAX_MONTHS));

  const totalBalance = debts.reduce((s, d) => s + d.balance, 0);
  const totalMinimum = debts.reduce((s, d) => s + d.minimum, 0);
  const firstMonthInterest = debts.reduce(
    (s, d) => s + (d.balance * d.apr) / 1200,
    0,
  );

  const empty = debts.length === 0;
  const results = Object.fromEntries(
    STRATEGIES.map(({ value }) => [
      value,
      runStrategy(debts, extra, value),
    ]),
  ) as Record<Strategy, StrategyResult>;

  const atHorizon = Object.fromEntries(
    STRATEGIES.map(({ value }) => [
      value,
      {
        balance: at(results[value].balanceByMonth, horizonMonths),
        interest: at(results[value].interestByMonth, horizonMonths),
        debtFree: results[value].months !== null && results[value].months! <= horizonMonths,
      },
    ]),
  ) as Record<Strategy, { balance: number; interest: number; debtFree: boolean }>;

  // The smallest whole-dollar extra that clears every debt within the horizon
  // (avalanche order, which finishes soonest or ties).
  let extraNeeded = 0;
  if (!empty && !atHorizon.avalanche.debtFree) {
    let low = extra;
    // Interest can add at most 1/12 of a balance in a month, so this always
    // clears everything in the first month.
    let high = Math.ceil(totalBalance * 1.1);
    while (high - low > 1) {
      const mid = Math.floor((low + high) / 2);
      const months = runStrategy(debts, mid, "avalanche").months;
      if (months !== null && months <= horizonMonths) high = mid;
      else low = mid;
    }
    extraNeeded = high;
  } else {
    extraNeeded = extra;
  }

  return {
    empty,
    debtCount: debts.length,
    totalBalance,
    totalMinimum,
    monthlyBudget: totalMinimum + extra,
    // Minimums that don't even cover a month of interest go nowhere.
    minimumsBelowInterest: !empty && totalMinimum < firstMonthInterest,
    horizonMonths,
    extra,
    results,
    atHorizon,
    onTrack: atHorizon.avalanche.debtFree,
    extraNeeded,
    // Positive numbers mean avalanche comes out ahead of snowball.
    interestSavedByAvalanche:
      results.snowball.totalInterest - results.avalanche.totalInterest,
    monthsSavedByAvalanche:
      results.snowball.months !== null && results.avalanche.months !== null
        ? results.snowball.months - results.avalanche.months
        : 0,
    // How much sooner snowball clears its first debt than avalanche does.
    firstWinMonthsSoonerWithSnowball:
      results.snowball.firstPayoffMonth !== null &&
      results.avalanche.firstPayoffMonth !== null
        ? results.avalanche.firstPayoffMonth - results.snowball.firstPayoffMonth
        : 0,
  };
}

// "9 months", "1 year, 4 months", "12 years".
export function describeMonths(months: number) {
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  if (months < 12) return plural(months, "month");
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0
    ? plural(years, "year")
    : `${plural(years, "year")}, ${plural(rest, "month")}`;
}
