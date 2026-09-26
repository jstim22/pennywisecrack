import { amortize } from "./amortization";
import { hasPropertyTaxRate, propertyTaxRatePct } from "./propertyTax";

// Guesses, not quotes. Homeowners insurance typically runs somewhere around
// 0.5%-1% of a home's price a year (much more in some hurricane and wildfire
// areas); national averages of about $2,500-$2,900 a year for a $300,000-
// $400,000 home put 0.7% in the middle.
export const DEFAULT_INSURANCE_RATE_PCT = 0.7;
export const DEFAULT_CLOSING_COST_PCT = 3;

// Private mortgage insurance (PMI) is charged when you put down less than 20%.
// It goes away when your balance reaches 80% of the home's original value
// (you have to ask) and automatically at 78%. Rates depend on your credit
// score and how much of the home's price you borrow; the numbers below are
// typical annual rates as a percentage of the loan, in the range lenders'
// rate cards show (roughly 0.2% to 2%). Your quote will differ.
export const CREDIT_TIERS = [
  { value: "760", label: "760 or higher" },
  { value: "720", label: "720 – 759" },
  { value: "680", label: "680 – 719" },
  { value: "640", label: "640 – 679" },
  { value: "620", label: "620 – 639" },
] as const;
export type CreditTier = (typeof CREDIT_TIERS)[number]["value"];

// Columns: loan is 80.01-85%, 85.01-90%, 90.01-95%, 95.01-97% of the price.
const PMI_RATES: Record<CreditTier, [number, number, number, number]> = {
  "760": [0.25, 0.41, 0.6, 0.8],
  "720": [0.35, 0.55, 0.8, 1.05],
  "680": [0.5, 0.75, 1.05, 1.35],
  "640": [0.75, 1.05, 1.4, 1.75],
  "620": [0.9, 1.25, 1.6, 1.95],
};

export const PMI_REMOVAL_LTV = 0.8;

export function guessPmiRatePct(ltv: number, tier: CreditTier) {
  if (ltv <= PMI_REMOVAL_LTV + 1e-9) return 0;
  const band = ltv <= 0.85 ? 0 : ltv <= 0.9 ? 1 : ltv <= 0.95 ? 2 : 3;
  return PMI_RATES[tier][band];
}

export type MortgageInputs = {
  price: number;
  // Dollars down.
  downPayment: number;
  ratePct: number;
  termYears: number;
  stateCode: string;
  // null = guess from the state (or the national average).
  propertyTaxRatePct: number | null;
  insuranceRatePct: number;
  hoaMonthly: number;
  creditTier: CreditTier;
  // null = guess from your credit score and down payment.
  pmiRatePct: number | null;
  extraMonthly: number;
  closingCostPct: number;
  // Optional, for the affordability check.
  income: number;
  otherMonthlyDebt: number;
};

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

export function estimateMortgage(raw: MortgageInputs) {
  const price = clamp(raw.price, 0, 1_000_000_000);
  const down = clamp(raw.downPayment, 0, price);
  const loan = price - down;
  const ratePct = clamp(raw.ratePct, 0, 30);
  const termYears = Math.round(clamp(raw.termYears, 1, 40));
  const months = termYears * 12;
  const extra = clamp(raw.extraMonthly, 0, 1_000_000_000);
  const ltv = price > 0 ? loan / price : 0;

  const base = amortize({ principal: loan, ratePct, months });
  const withExtra = amortize({ principal: loan, ratePct, months, extraMonthly: extra });

  // PMI: charged on the original loan every month until the balance reaches
  // 80% of the home's price.
  const guessedPmi = guessPmiRatePct(ltv, raw.creditTier);
  const pmiRate =
    raw.pmiRatePct === null ? guessedPmi : clamp(raw.pmiRatePct, 0, 10);
  const pmiApplies = loan > 0 && ltv > PMI_REMOVAL_LTV + 1e-9 && pmiRate > 0;
  const pmiMonthly = pmiApplies ? (loan * pmiRate) / 100 / 12 : 0;
  const threshold = price * PMI_REMOVAL_LTV;
  const pmiEndMonth = (schedule: number[]) => {
    if (!pmiApplies) return 0;
    const i = schedule.findIndex((b, m) => m > 0 && b <= threshold + 1e-6);
    return i === -1 ? schedule.length - 1 : i;
  };
  const pmiMonthsBase = pmiEndMonth(base.balanceByMonth);
  const pmiMonths = pmiEndMonth(withExtra.balanceByMonth);

  const propertyTaxRate =
    raw.propertyTaxRatePct === null
      ? propertyTaxRatePct(raw.stateCode)
      : clamp(raw.propertyTaxRatePct, 0, 10);
  const propertyTaxYear = (price * propertyTaxRate) / 100;
  const insuranceYear = (price * clamp(raw.insuranceRatePct, 0, 10)) / 100;
  const hoa = clamp(raw.hoaMonthly, 0, 1_000_000);

  const propertyTaxMonthly = propertyTaxYear / 12;
  const insuranceMonthly = insuranceYear / 12;
  const escrowMonthly = propertyTaxMonthly + insuranceMonthly;
  const principalAndInterest = base.payment;
  const totalMonthly = principalAndInterest + escrowMonthly + pmiMonthly + hoa;
  const totalAfterPmi = totalMonthly - pmiMonthly;

  const closingCosts = (price * clamp(raw.closingCostPct, 0, 20)) / 100;
  const income = clamp(raw.income, 0, 1_000_000_000);
  const monthlyIncome = income / 12;

  return {
    price,
    down,
    downPct: price > 0 ? (down / price) * 100 : 0,
    loan,
    ltv,
    termYears,
    principalAndInterest,
    propertyTaxRate,
    propertyTaxRateIsGuess: raw.propertyTaxRatePct === null,
    stateHasRate: hasPropertyTaxRate(raw.stateCode),
    propertyTaxMonthly,
    insuranceMonthly,
    escrowMonthly,
    hoa,
    pmi: {
      applies: pmiApplies,
      ratePct: pmiRate,
      rateIsGuess: raw.pmiRatePct === null,
      monthly: pmiMonthly,
      // Months of PMI on your current plan (with any extra payments).
      months: pmiMonths,
      monthsWithoutExtra: pmiMonthsBase,
      total: pmiMonthly * pmiMonths,
      // What 20% down would take, and what it would save.
      downFor20: price * 0.2,
      moreFor20: Math.max(price * 0.2 - down, 0),
    },
    totalMonthly,
    totalAfterPmi,
    closingCosts,
    cashToClose: down + closingCosts,
    schedule: base,
    withExtra,
    extra,
    interestSavedByExtra: base.totalInterest - withExtra.totalInterest,
    monthsSavedByExtra: base.months - withExtra.months,
    // Lenders like housing costs (mortgage, taxes, insurance, PMI, HOA) to be
    // no more than about 28% of gross income, and all debts about 36%.
    frontEndRatio: monthlyIncome > 0 ? totalMonthly / monthlyIncome : null,
    backEndRatio:
      monthlyIncome > 0
        ? (totalMonthly + clamp(raw.otherMonthlyDebt, 0, 1e9)) / monthlyIncome
        : null,
  };
}
