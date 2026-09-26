import { simulate } from "./growth";

// What a spending decision could cost by retirement: the money you spend now
// can't be invested and grow. Returns are a steady yearly rate compounded
// monthly, like the retirement calculator.

export type OpportunityInputs = {
  // One-time cost now.
  oneTime: number;
  // Recurring monthly cost, and how many years it lasts.
  monthly: number;
  recurringYears: number;
  currentAge: number;
  retireAge: number;
  returnPct: number;
  inflationPct: number;
  // The 4% rule: a common estimate of how much a nest egg can pay out a year.
  withdrawalPct: number;
  // Optional: your take-home pay per hour, for "hours of work".
  hourlyWage: number;
  // Optional: how many years you'll get use out of it, and what that use is
  // worth to you per year.
  usefulYears: number;
  valuePerYear: number;
};

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

// The steady yearly payment (paid monthly, shown yearly) that has the same
// value today as `amount`, spread over `years` at `returnPct`.
export function breakEvenPerYear(amount: number, years: number, returnPct: number) {
  if (amount <= 0 || years <= 0) return 0;
  const r = returnPct / 1200;
  const months = Math.round(years * 12);
  const monthly =
    r === 0 ? amount / months : (amount * r) / (1 - Math.pow(1 + r, -months));
  return monthly * 12;
}

export function estimateOpportunityCost(raw: OpportunityInputs) {
  const oneTime = clamp(raw.oneTime, 0, 1_000_000_000);
  const monthly = clamp(raw.monthly, 0, 1_000_000_000);
  const currentAge = clamp(raw.currentAge, 0, 120);
  const retireAge = clamp(raw.retireAge, 0, 120);
  const returnPct = clamp(raw.returnPct, 0, 30);
  const inflationPct = clamp(raw.inflationPct, 0, 30);
  const withdrawalPct = clamp(raw.withdrawalPct, 0, 20);

  const yearsToRetire = Math.max(Math.round(retireAge - currentAge), 0);
  const months = yearsToRetire * 12;
  // The recurring cost can't last past retirement.
  const recurringYears = Math.min(
    Math.round(clamp(raw.recurringYears, 0, 120)),
    yearsToRetire,
  );

  const growth = (
    oneTimeAmount: number,
    monthlyAmount: number,
    rate = returnPct,
  ) =>
    simulate({
      months,
      principal: oneTimeAmount,
      frequency: "monthly",
      baseContribution: monthlyAmount,
      baseRate: rate,
      customSchedule: true,
      getYearContribution: (y) => (y <= recurringYears ? monthlyAmount : 0),
      getYearRate: () => rate,
      contributionGrowthPct: 0,
      glidePath: false,
      lumpSumsByMonth: {},
    });

  const invested = growth(oneTime, monthly);
  const spent = oneTime + monthly * 12 * recurringYears;
  const futureValue = invested.balance;
  const inflationFactor = Math.pow(1 + inflationPct / 100, yearsToRetire);
  const todaysDollars = futureValue / inflationFactor;

  const hourlyWage = clamp(raw.hourlyWage, 0, 100_000);
  const usefulYears = clamp(raw.usefulYears, 0, 120);
  const valuePerYear = clamp(raw.valuePerYear, 0, 1_000_000_000);

  // To beat investing, what the purchase gives you each year has to cover the
  // one-time cost spread over its useful life (with the return you'd have
  // earned) plus any yearly cost.
  const breakEven =
    breakEvenPerYear(oneTime, usefulYears, returnPct) + monthly * 12;
  const hasWorthCheck = usefulYears > 0 && valuePerYear > 0;

  return {
    yearsToRetire,
    recurringYears,
    spent,
    futureValue,
    todaysDollars,
    // What the money earned by retirement.
    growth: futureValue - spent,
    multiple: spent > 0 ? futureValue / spent : 0,
    // What a nest egg that size could pay each year.
    incomePerYear: (todaysDollars * withdrawalPct) / 100,
    incomePerMonth: (todaysDollars * withdrawalPct) / 100 / 12,
    hoursOfWork: hourlyWage > 0 ? spent / hourlyWage : null,
    breakEvenPerYear: breakEven,
    hasWorthCheck,
    worthIt: hasWorthCheck ? valuePerYear >= breakEven : null,
    worthMargin: valuePerYear - breakEven,
    // Balance at the end of each year, for a chart.
    yearly: invested.yearly,
    // What a cheaper version of the decision would cost at retirement.
    smaller: [1, 0.5, 0.25].map((share) => ({
      share,
      spent: spent * share,
      futureValue: growth(oneTime * share, monthly * share).balance,
    })),
    simulateParams: {
      months,
      principal: oneTime,
      frequency: "monthly" as const,
      baseContribution: monthly,
      baseRate: returnPct,
      customSchedule: true,
      getYearContribution: (y: number) => (y <= recurringYears ? monthly : 0),
      getYearRate: () => returnPct,
      contributionGrowthPct: 0,
      glidePath: false,
      lumpSumsByMonth: {} as Record<number, number>,
    },
  };
}
