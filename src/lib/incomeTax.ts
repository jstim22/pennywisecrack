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

// Self-employment (1099) rules for 2026, single filer. Self-employment tax is
// 12.4% Social Security (up to the wage base, shared with any W-2 pay) plus
// 2.9% Medicare on 92.35% of net profit. Half of it is deducted from income.
// The qualified business income (QBI) deduction is 20% of business profit,
// phasing out between $201,750 and $276,750 of taxable income for a business
// with no employees (Rev. Proc. 2025-32; OBBBA section 70105), with a $400
// minimum when business income is at least $1,000. A SEP-IRA takes up to 20%
// of net profit (after the deduction for half of self-employment tax) and is
// limited to $72,000 (IRS Notice 2025-67).
export const SE_SOCIAL_SECURITY_RATE = 0.124;
export const SE_MEDICARE_RATE = 0.029;
export const SE_EARNINGS_FACTOR = 0.9235;
export const QBI_THRESHOLD = 201_750;
export const QBI_PHASE_RANGE = 75_000;
export const QBI_MINIMUM_DEDUCTION = 400;
export const SEP_LIMIT = 72_000;

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
  // 1099 / self-employment, all yearly and all optional.
  selfEmployment?: number;
  businessExpenses?: number;
  selfEmployedHealthInsurance?: number;
  sepContribution?: number;
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
  const stateWagesOnly = Math.max(
    wages -
      cafeteria +
      (state?.taxesHsaContributions ? hsa : 0) -
      (state?.taxesRetirementDeferrals ? 0 : retirement),
    0,
  );

  // Self-employment: net profit, self-employment tax, and the deductions
  // that come with it.
  const netProfit = Math.max(
    clamp(raw.selfEmployment ?? 0, 0, 1e9) - clamp(raw.businessExpenses ?? 0, 0, 1e9),
    0,
  );
  const seEarnings = netProfit * SE_EARNINGS_FACTOR;
  const hasSeTax = seEarnings >= 400;
  const seSocialSecurity = hasSeTax
    ? SE_SOCIAL_SECURITY_RATE *
      Math.min(seEarnings, Math.max(SOCIAL_SECURITY_WAGE_BASE - ficaWages, 0))
    : 0;
  const seMedicare = hasSeTax ? SE_MEDICARE_RATE * seEarnings : 0;
  const selfEmploymentTax = seSocialSecurity + seMedicare;
  const halfSeTax = selfEmploymentTax / 2;
  const seHealth = Math.min(
    clamp(raw.selfEmployedHealthInsurance ?? 0, 0, 1e9),
    Math.max(netProfit - halfSeTax, 0),
  );
  const sep = Math.min(
    clamp(raw.sepContribution ?? 0, 0, 1e9),
    Math.max(netProfit - halfSeTax, 0) * 0.2,
    SEP_LIMIT,
  );
  const businessIncome = Math.max(netProfit - halfSeTax - seHealth - sep, 0);
  // These come off your income for federal and (in most states) state tax.
  const seAdjustments = halfSeTax + seHealth + sep;

  const stateIncome =
    stateWagesOnly + otherIncome + Math.max(netProfit - seAdjustments, 0);

  const itemized = clamp(raw.itemizedDeductions, 0, 1e9);
  const deduction = Math.max(STANDARD_DEDUCTION, itemized);
  const incomeAfterAdjustments = Math.max(
    federalIncome + netProfit - seAdjustments,
    0,
  );
  const taxableBeforeQbi = Math.max(incomeAfterAdjustments - deduction, 0);
  // 20% of business income, capped at 20% of taxable income; a business with
  // no employees loses it across the phase-out range.
  const qbiPhaseIn = Math.min(
    Math.max((taxableBeforeQbi - QBI_THRESHOLD) / QBI_PHASE_RANGE, 0),
    1,
  );
  const qbiFull = Math.min(0.2 * businessIncome, 0.2 * taxableBeforeQbi);
  const qbiRaw = qbiFull * (1 - qbiPhaseIn);
  const qbiDeduction =
    businessIncome >= 1_000
      ? Math.min(Math.max(qbiRaw, QBI_MINIMUM_DEDUCTION), taxableBeforeQbi)
      : qbiRaw;
  const federalTaxable = Math.max(taxableBeforeQbi - qbiDeduction, 0);
  const brackets = federalBracketBreakdown(federalTaxable);
  const taxBeforeCredits = brackets.reduce((sum, b) => sum + b.tax, 0);
  const credits = clamp(raw.credits, 0, 1e9);
  const federal = Math.max(taxBeforeCredits - credits, 0);

  const socialSecurity =
    SOCIAL_SECURITY_RATE * Math.min(ficaWages, SOCIAL_SECURITY_WAGE_BASE);
  const medicare = MEDICARE_RATE * ficaWages;
  // The extra 0.9% Medicare tax counts wages and self-employment earnings together.
  const additionalMedicare =
    ADDITIONAL_MEDICARE_RATE *
    Math.max(ficaWages + (hasSeTax ? seEarnings : 0) - ADDITIONAL_MEDICARE_THRESHOLD, 0);

  const stateTax = stateIncomeTax(raw.stateCode, stateIncome);
  const local = localIncomeTax(
    raw.stateCode,
    raw.localId,
    raw.localCustomRatePct,
    wages,
    stateIncome,
  );

  const payroll = socialSecurity + medicare + additionalMedicare;
  const total = federal + payroll + selfEmploymentTax + stateTax + local.tax;
  const income = wages + otherIncome + netProfit;
  // Money set aside or spent before tax on health premiums, retirement, etc.
  const savings = retirement + hsa + otherPreTax + seHealth + sep;

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
    // Income after adjustments (like half of self-employment tax), before deductions.
    federalIncome: incomeAfterAdjustments,
    deduction,
    qbiDeduction,
    federalTaxable,
    selfEmployed: {
      grossReceipts: clamp(raw.selfEmployment ?? 0, 0, 1e9),
      expenses: Math.min(
        clamp(raw.businessExpenses ?? 0, 0, 1e9),
        clamp(raw.selfEmployment ?? 0, 0, 1e9),
      ),
      netProfit,
      socialSecurity: seSocialSecurity,
      medicare: seMedicare,
      tax: selfEmploymentTax,
      halfDeduction: halfSeTax,
      healthDeduction: seHealth,
      sepDeduction: sep,
      sepCapped: clamp(raw.sepContribution ?? 0, 0, 1e9) > sep + 0.005,
      qbiPhaseIn,
    },
    brackets,
    taxBeforeCredits,
    credits,
    federal,
    socialSecurity,
    medicare,
    additionalMedicare,
    payroll,
    selfEmploymentTax,
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

// Which kind of pay the "next dollar" and the rate curve follow: your W-2
// wages, or your 1099 income if that's the bigger part of what you earn.
export function payBasis(raw: IncomeTaxInputs): "wages" | "selfEmployment" {
  return clamp(raw.selfEmployment ?? 0, 0, 1e9) > clamp(raw.wages, 0, 1e9)
    ? "selfEmployment"
    : "wages";
}

function withMorePay(raw: IncomeTaxInputs, amount: number): IncomeTaxInputs {
  return payBasis(raw) === "selfEmployment"
    ? { ...raw, selfEmployment: (raw.selfEmployment ?? 0) + amount }
    : { ...raw, wages: raw.wages + amount };
}

export function estimateIncomeTax(raw: IncomeTaxInputs) {
  const now = compute(raw);
  const next = compute(withMorePay(raw, MARGINAL_STEP));
  // Tax that exists only because of the 1099 income. That's what quarterly
  // estimated payments need to cover (W-2 pay already has tax withheld).
  const withoutSe = compute({ ...raw, selfEmployment: 0 });
  const taxFromSelfEmployment = Math.max(now.total - withoutSe.total, 0);
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
    basis: payBasis(raw),
    taxFromSelfEmployment,
    // Set this aside each quarter (April, June, September, and January).
    quarterlyEstimate: taxFromSelfEmployment / 4,
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
    const basis = payBasis(raw);
    const at = (amount: number): IncomeTaxInputs =>
      basis === "selfEmployment"
        ? { ...raw, selfEmployment: amount }
        : { ...raw, wages: amount };
    const here = compute(at(wages));
    const next = compute(at(wages + 250));
    return {
      wages,
      total: here.total,
      average: here.income > 0 ? here.total / here.income : 0,
      marginal: Math.round(((next.total - here.total) / 250) * 1e6) / 1e6,
    };
  });
}
