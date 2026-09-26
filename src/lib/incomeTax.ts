import {
  HSA_LIMIT_FAMILY,
  MEDICARE_RATE,
  RETIREMENT_DEFERRAL_LIMIT,
  SOCIAL_SECURITY_RATE,
  SOCIAL_SECURITY_WAGE_BASE,
  STANDARD_DEDUCTION,
  federalBracketBreakdown,
} from "./paycheckTax";
import { getState, localIncomeTax, stateIncomeTax } from "./stateTax";

// Extra 0.9% Medicare tax on wages above $200,000 (single filer).
const ADDITIONAL_MEDICARE_RATE = 0.009;
export const ADDITIONAL_MEDICARE_THRESHOLD = 200_000;

export type IncomeTaxInputs = {
  // Yearly pay from a job, before anything is taken out.
  wages: number;
  // Other taxable income with no Social Security/Medicare, like interest.
  otherIncome: number;
  stateCode: string;
  localId: string;
  localCustomRatePct: number;
  // Yearly amounts.
  traditionalRetirement: number;
  hsa: number;
  // Other pre-tax deductions taken from pay: health premiums, FSA, commuter.
  otherPreTax: number;
  // Used instead of the standard deduction when it's bigger (federal only).
  itemizedDeductions: number;
  // Tax credits you expect (they reduce federal income tax, down to zero).
  credits: number;
};

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function compute(raw: IncomeTaxInputs) {
  const wages = clamp(raw.wages, 0, 1_000_000_000);
  const otherIncome = clamp(raw.otherIncome, 0, 1_000_000_000);
  const state = getState(raw.stateCode);

  const wantedRetirement = clamp(raw.traditionalRetirement, 0, 1e9);
  const retirement = Math.min(wantedRetirement, RETIREMENT_DEFERRAL_LIMIT);
  const wantedHsa = clamp(raw.hsa, 0, 1e9);
  const hsa = Math.min(wantedHsa, HSA_LIMIT_FAMILY);
  const otherPreTax = clamp(raw.otherPreTax, 0, 1e9);

  // Same treatment as the paycheck estimator: premiums, HSA and similar come
  // out before income tax AND Social Security/Medicare; a traditional
  // 401(k)/403(b) only before income tax. Pennsylvania still taxes 401(k)
  // deferrals, and California/New Jersey still tax HSA contributions.
  const cafeteria = otherPreTax + hsa;
  const ficaWages = Math.max(wages - cafeteria, 0);
  const federalIncome =
    Math.max(wages - cafeteria - retirement, 0) + otherIncome;
  const stateIncome =
    Math.max(
      wages -
        cafeteria +
        (state?.taxesHsaContributions ? hsa : 0) -
        (state?.taxesRetirementDeferrals ? 0 : retirement),
      0,
    ) + otherIncome;

  const itemized = clamp(raw.itemizedDeductions, 0, 1e9);
  const deduction = Math.max(STANDARD_DEDUCTION, itemized);
  const federalTaxable = Math.max(federalIncome - deduction, 0);
  const brackets = federalBracketBreakdown(federalTaxable);
  const taxBeforeCredits = brackets.reduce((sum, b) => sum + b.tax, 0);
  const credits = clamp(raw.credits, 0, 1e9);
  const federal = Math.max(taxBeforeCredits - credits, 0);

  const socialSecurity =
    SOCIAL_SECURITY_RATE * Math.min(ficaWages, SOCIAL_SECURITY_WAGE_BASE);
  const medicare = MEDICARE_RATE * ficaWages;
  const additionalMedicare =
    ADDITIONAL_MEDICARE_RATE *
    Math.max(ficaWages - ADDITIONAL_MEDICARE_THRESHOLD, 0);

  const stateTax = stateIncomeTax(raw.stateCode, stateIncome);
  const local = localIncomeTax(
    raw.stateCode,
    raw.localId,
    raw.localCustomRatePct,
    wages,
    stateIncome,
  );

  const payroll = socialSecurity + medicare + additionalMedicare;
  const total = federal + payroll + stateTax + local.tax;
  const income = wages + otherIncome;
  const savings = retirement + hsa + otherPreTax;

  return {
    wages,
    otherIncome,
    income,
    retirement,
    hsa,
    otherPreTax,
    savings,
    wantedRetirement,
    wantedHsa,
    federalIncome,
    deduction,
    federalTaxable,
    brackets,
    taxBeforeCredits,
    credits,
    federal,
    socialSecurity,
    medicare,
    additionalMedicare,
    payroll,
    state: stateTax,
    local: local.tax,
    localName: local.name,
    total,
    takeHome: income - savings - total,
  };
}

// Small enough to sit inside one bracket almost everywhere, big enough to
// avoid rounding noise.
const MARGINAL_STEP = 100;

export function estimateIncomeTax(raw: IncomeTaxInputs) {
  const now = compute(raw);
  const next = compute({ ...raw, wages: raw.wages + MARGINAL_STEP });
  // Rounded so floating-point noise can't tip a rate like 19.65% the wrong way.
  const slope = (a: number, b: number) =>
    Math.round(((b - a) / MARGINAL_STEP) * 1e6) / 1e6;

  return {
    ...now,
    usedItemized: clamp(raw.itemizedDeductions, 0, 1e9) > STANDARD_DEDUCTION,
    retirementCapped: now.wantedRetirement > RETIREMENT_DEFERRAL_LIMIT,
    hsaCapped: now.wantedHsa > HSA_LIMIT_FAMILY,
    creditsUsed: Math.min(now.credits, now.taxBeforeCredits),
    creditsUnused: Math.max(now.credits - now.taxBeforeCredits, 0),
    // Share of all your income, and share of your federal-taxable income.
    totalRate: now.income > 0 ? now.total / now.income : 0,
    federalRate: now.income > 0 ? now.federal / now.income : 0,
    // The tax on your next dollar of pay, by kind.
    marginal: {
      federal: slope(now.federal, next.federal),
      payroll: slope(now.payroll, next.payroll),
      state: slope(now.state, next.state),
      local: slope(now.local, next.local),
      total: slope(now.total, next.total),
    },
    // The federal bracket your last dollar falls in (null if none is taxed).
    topBracket:
      [...now.brackets].reverse().find((b) => b.inBracket > 0)?.rate ?? null,
    hasIncome: now.income > 0,
  };
}

// The same person's tax picture at different pay levels, for the "how your
// rate changes as you earn more" chart.
export function taxRateCurve(
  raw: IncomeTaxInputs,
  maxWages: number,
  points: number,
) {
  const step = maxWages / points;
  return Array.from({ length: points + 1 }, (_, i) => {
    const wages = step * i;
    const here = compute({ ...raw, wages });
    const next = compute({ ...raw, wages: wages + 250 });
    return {
      wages,
      total: here.total,
      average: here.income > 0 ? here.total / here.income : 0,
      marginal: Math.round(((next.total - here.total) / 250) * 1e6) / 1e6,
    };
  });
}
