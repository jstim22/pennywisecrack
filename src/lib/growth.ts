// Shared growth math for the Retirement and Compound Interest calculators:
// monthly compounding with contributions, per-year overrides, yearly
// contribution raises, one-time lump sums, an optional glide path, and a
// Monte Carlo run.

export type Frequency = "monthly" | "yearly";
export type YearOverride = { contribution?: number; rate?: number };
// A one-time deposit made at the end of year `year` of the plan.
export type LumpSum = { id: number; at: number; amount: number };

export const GLIDE_WINDOW_YEARS = 15;
export const GLIDE_FLOOR_RATE = 4;
export const MONTE_CARLO_TRIALS = 300;
// Long-run annualized volatility (standard deviation of yearly returns) for
// a stock-heavy portfolio — a widely-cited, publicly available figure, not
// tied to any specific firm's proprietary assumptions.
export const ANNUAL_VOLATILITY_PCT = 15;

export function glideAdjustedRate(
  rate: number,
  yearIndex: number,
  totalYears: number,
) {
  const floor = Math.min(GLIDE_FLOOR_RATE, rate);
  const window = Math.min(GLIDE_WINDOW_YEARS, totalYears);
  if (window <= 0) return rate;
  const yearsRemaining = totalYears - yearIndex;
  if (yearsRemaining >= window) return rate;
  const t = Math.max(yearsRemaining, 0) / window;
  return floor + (rate - floor) * t;
}

// Lump sums keyed by the month (1-based) they land in, given how many years
// into the plan each one is (`yearOf`). Ones outside the timeline are left out.
export function lumpSumsByMonth(
  lumpSums: LumpSum[],
  yearOf: (at: number) => number,
  totalMonths: number,
) {
  const byMonth: Record<number, number> = {};
  for (const { at, amount } of lumpSums) {
    const month = Math.round(yearOf(at) * 12);
    if (month < 1 || month > totalMonths) continue;
    byMonth[month] = (byMonth[month] ?? 0) + amount;
  }
  return byMonth;
}

export type SimulateParams = {
  months: number;
  principal: number;
  frequency: Frequency;
  baseContribution: number;
  baseRate: number;
  customSchedule: boolean;
  getYearContribution: (yearIndex: number) => number;
  getYearRate: (yearIndex: number) => number;
  contributionGrowthPct: number;
  glidePath: boolean;
  // One-time deposits, keyed by the month (1-based) they land in.
  lumpSumsByMonth: Record<number, number>;
};

function yearSettings(params: SimulateParams, yearIndex: number) {
  let rate = params.customSchedule
    ? params.getYearRate(yearIndex)
    : params.baseRate;
  if (params.glidePath) {
    rate = glideAdjustedRate(rate, yearIndex, params.months / 12);
  }

  let contribution = params.customSchedule
    ? params.getYearContribution(yearIndex)
    : params.baseContribution;
  if (params.contributionGrowthPct) {
    contribution *= Math.pow(
      1 + params.contributionGrowthPct / 100,
      yearIndex - 1,
    );
  }
  return { rate, contribution };
}

export function simulate(params: SimulateParams) {
  const { months, principal, frequency, lumpSumsByMonth } = params;
  let balance = principal;
  let contributed = principal;
  const yearly: { year: number; balance: number }[] = [];

  for (let m = 1; m <= months; m++) {
    const { rate, contribution } = yearSettings(params, Math.ceil(m / 12));

    balance *= 1 + rate / 100 / 12;
    if (frequency === "monthly" || m % 12 === 0) {
      balance += contribution;
      contributed += contribution;
    }
    const lumpSum = lumpSumsByMonth[m] ?? 0;
    balance += lumpSum;
    contributed += lumpSum;
    if (m % 12 === 0) {
      yearly.push({ year: m / 12, balance });
    }
  }

  return {
    yearly,
    balance,
    contributed,
    growth: Math.max(balance - contributed, 0),
  };
}

function randomNormal(mean: number, stddev: number) {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * stddev;
}

function runMonteCarloTrial(params: SimulateParams) {
  const { months, principal, frequency, lumpSumsByMonth } = params;

  let balance = principal;
  const monthlyVolatility = ANNUAL_VOLATILITY_PCT / 100 / Math.sqrt(12);

  for (let m = 1; m <= months; m++) {
    const { rate, contribution } = yearSettings(params, Math.ceil(m / 12));

    const monthlyReturn = randomNormal(rate / 100 / 12, monthlyVolatility);
    balance = Math.max(balance * (1 + monthlyReturn), 0);
    if (frequency === "monthly" || m % 12 === 0) {
      balance += contribution;
    }
    balance += lumpSumsByMonth[m] ?? 0;
  }

  return balance;
}

export function runMonteCarlo(params: SimulateParams) {
  const results: number[] = [];
  for (let t = 0; t < MONTE_CARLO_TRIALS; t++) {
    results.push(runMonteCarloTrial(params));
  }
  results.sort((a, b) => a - b);
  const percentile = (p: number) =>
    results[Math.floor(p * (results.length - 1))];
  return {
    p10: percentile(0.1),
    p50: percentile(0.5),
    p90: percentile(0.9),
  };
}
