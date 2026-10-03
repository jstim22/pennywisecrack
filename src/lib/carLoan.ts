import { amortize } from "./amortization";
import { hasVehicleSalesTaxRate, vehicleSalesTaxRatePct } from "./vehicleSalesTax";

export type CarCondition = "new" | "used";

// Quick-pick loan lengths (the buttons in the UI), plus a "custom" option for
// anything else. Shorter loans mean less interest and less time owing more
// than the car is worth, so the short ones come first.
export const TERM_PRESETS = [6, 12, 24, 36, 48];
// The full range shown in the "compare loan lengths" table.
export const TERM_CHOICES = [6, 12, 24, 36, 48, 60, 72, 84];
// Terms longer than this are flagged as suboptimal (see the callout in the
// UI) — the same 4-year cap as the 20/4/10 guideline's term check.
export const RECOMMENDED_MAX_TERM_MONTHS = 48;

// Rough guides, not appraisals. New cars are commonly said to lose about 20%
// of their value in the first year and around 15% a year after that; used
// cars lose less each year, roughly 10%.
export const DEPRECIATION: Record<CarCondition, { firstYear: number; after: number }> = {
  new: { firstYear: 0.2, after: 0.15 },
  used: { firstYear: 0.1, after: 0.1 },
};

export type CarInputs = {
  price: number;
  downPayment: number;
  tradeIn: number;
  stateCode: string;
  // The sales tax rate to use, or null to guess it from the state.
  salesTaxRatePct: number | null;
  // In most states sales tax is charged on the price minus your trade-in.
  taxOnPriceMinusTrade: boolean;
  // Title, registration, and dealer fees.
  fees: number;
  aprPct: number;
  termMonths: number;
  extraMonthly: number;
  condition: CarCondition;
  // Optional running costs, for the "10% of income" check.
  monthlyInsurance: number;
  monthlyUpkeep: number;
  // Optional yearly income before taxes.
  income: number;
};

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

// What the car is worth `month` months after buying it.
export function carValue(price: number, condition: CarCondition, month: number) {
  const { firstYear, after } = DEPRECIATION[condition];
  const m = Math.max(month, 0);
  return (
    price *
    Math.pow(1 - firstYear, Math.min(m, 12) / 12) *
    Math.pow(1 - after, Math.max(m - 12, 0) / 12)
  );
}

export function estimateCarLoan(raw: CarInputs) {
  const price = clamp(raw.price, 0, 10_000_000);
  const tradeIn = clamp(raw.tradeIn, 0, price);
  const down = clamp(raw.downPayment, 0, 10_000_000);
  const salesTaxRatePct =
    raw.salesTaxRatePct === null
      ? vehicleSalesTaxRatePct(raw.stateCode)
      : clamp(raw.salesTaxRatePct, 0, 25);
  const fees = clamp(raw.fees, 0, 1_000_000);
  const aprPct = clamp(raw.aprPct, 0, 40);
  const termMonths = Math.round(clamp(raw.termMonths, 1, 120));
  const extra = clamp(raw.extraMonthly, 0, 1_000_000);

  const taxable = raw.taxOnPriceMinusTrade ? price - tradeIn : price;
  const salesTax = (taxable * salesTaxRatePct) / 100;
  const outTheDoor = price + salesTax + fees;
  const financed = Math.max(outTheDoor - down - tradeIn, 0);

  const plain = amortize({ principal: financed, ratePct: aprPct, months: termMonths });
  const withExtra = amortize({ principal: financed, ratePct: aprPct, months: termMonths, extraMonthly: extra });

  // Everything you hand over for the car: cash down, the trade-in's value,
  // and every loan payment.
  const totalCost = down + tradeIn + withExtra.totalPaid;

  // What you owe vs. what the car is worth, month by month.
  const months = Math.max(withExtra.months, 1);
  const owe = withExtra.balanceByMonth;
  const worth = Array.from({ length: months + 1 }, (_, m) =>
    carValue(price, raw.condition, m),
  );
  let underwaterUntil = 0;
  let worstGap = 0;
  for (let m = 0; m <= months; m++) {
    const gap = owe[m] - worth[m];
    if (gap > 0.005) {
      underwaterUntil = m;
      worstGap = Math.max(worstGap, gap);
    }
  }

  const compare = TERM_CHOICES.map((term) => {
    const r = amortize({ principal: financed, ratePct: aprPct, months: term });
    return {
      term,
      payment: r.payment,
      totalInterest: r.totalInterest,
      totalPaid: r.totalPaid,
      totalCost: down + tradeIn + r.totalPaid,
      overRecommendedTerm: term > RECOMMENDED_MAX_TERM_MONTHS,
    };
  });

  const income = clamp(raw.income, 0, 1_000_000_000);
  const monthlyIncome = income / 12;
  const runningCosts =
    clamp(raw.monthlyInsurance, 0, 1e6) + clamp(raw.monthlyUpkeep, 0, 1e6);
  const monthlyCarCosts = plain.payment + extra + runningCosts;

  return {
    price,
    salesTax,
    salesTaxRatePct,
    salesTaxRateIsGuess: raw.salesTaxRatePct === null,
    stateHasSalesTaxRate: hasVehicleSalesTaxRate(raw.stateCode),
    fees,
    outTheDoor,
    down,
    tradeIn,
    financed,
    financedShareOfPrice: price > 0 ? financed / price : 0,
    payment: plain.payment,
    extra,
    termMonths,
    // Longer loans mean more interest and more time owing more than the car
    // is worth (see the underwater chart), so terms past the 20/4/10
    // guideline's 4-year cap are flagged with a callout.
    overRecommendedTerm: termMonths > RECOMMENDED_MAX_TERM_MONTHS,
    totalInterest: withExtra.totalInterest,
    totalPaid: withExtra.totalPaid,
    payoffMonths: withExtra.months,
    totalCost,
    interestShareOfPrice: price > 0 ? withExtra.totalInterest / price : 0,
    interestSavedByExtra: plain.totalInterest - withExtra.totalInterest,
    monthsSavedByExtra: plain.months - withExtra.months,
    compare,
    owe,
    worth,
    // The last month you owe more than the car is worth (0 = never).
    underwaterUntil,
    worstGap,
    startsUnderwater: financed > price + 0.005,
    // The 20/4/10 guideline: 20% down, a loan of 4 years or less, and total
    // car costs (payment, insurance, upkeep) under 10% of gross income.
    rule: {
      downShare: price > 0 ? (down + tradeIn) / price : 0,
      downOk: price > 0 && (down + tradeIn) / price >= 0.2,
      termOk: termMonths <= 48,
      monthlyCarCosts,
      incomeShare: monthlyIncome > 0 ? monthlyCarCosts / monthlyIncome : null,
      incomeOk: monthlyIncome > 0 ? monthlyCarCosts / monthlyIncome <= 0.1 : null,
    },
  };
}
