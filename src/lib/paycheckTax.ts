import { getState, stateIncomeTax } from "./stateTax";

// 2026 federal figures for a single filer. Sources: IRS Rev. Proc. 2025-32
// (standard deduction and brackets), SSA (Social Security wage base), and
// IRS Notice 2025-67 (401(k)/403(b) deferral limit).
export const TAX_YEAR = 2026;
export const STANDARD_DEDUCTION = 16_100;
export const SOCIAL_SECURITY_RATE = 0.062;
export const SOCIAL_SECURITY_WAGE_BASE = 184_500;
export const MEDICARE_RATE = 0.0145;
export const RETIREMENT_DEFERRAL_LIMIT = 24_500;
// IRS Rev. Proc. 2025-19. Which limit applies depends on the health plan
// (self-only vs family), which we don't ask about, so we cap at the higher one.
export const HSA_LIMIT_SELF_ONLY = 4_400;
export const HSA_LIMIT_FAMILY = 8_750;
export const OVERTIME_THRESHOLD_HOURS = 40;
export const OVERTIME_MULTIPLIER = 1.5;

const FEDERAL_BRACKETS = [
  { upTo: 12_400, rate: 0.1 },
  { upTo: 50_400, rate: 0.12 },
  { upTo: 105_700, rate: 0.22 },
  { upTo: 201_775, rate: 0.24 },
  { upTo: 256_225, rate: 0.32 },
  { upTo: 640_600, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 },
];

export type PayFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly";
export type PayType = "hourly" | "salary";
export type RetirementType = "traditional" | "roth";

export const PERIODS_PER_YEAR: Record<PayFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

export const PAY_FREQUENCIES: {
  value: PayFrequency;
  label: string;
  every: string;
}[] = [
  { value: "weekly", label: "Weekly", every: "every week" },
  { value: "biweekly", label: "Every 2 weeks", every: "every 2 weeks" },
  { value: "semimonthly", label: "Twice a month", every: "twice a month" },
  { value: "monthly", label: "Monthly", every: "once a month" },
];

export type PaycheckInputs = {
  payType: PayType;
  hourlyWage: number;
  hoursPerWeek: number;
  tipsPerWeek: number;
  annualSalary: number;
  payFrequency: PayFrequency;
  stateCode: string;
  retirementPct: number;
  retirementType: RetirementType;
  // Dollar amounts taken out of EACH paycheck.
  // Many people have both: e.g. medical/dental/vision pre-tax, and something
  // like supplemental life or accident coverage post-tax.
  insurancePreTaxPerPaycheck: number;
  insurancePostTaxPerPaycheck: number;
  hsaPerPaycheck: number;
  otherPreTaxPerPaycheck: number;
  otherPostTaxPerPaycheck: number;
  skipFica: boolean;
};

export function federalIncomeTax(annualTaxableWages: number) {
  const taxable = Math.max(annualTaxableWages - STANDARD_DEDUCTION, 0);
  let tax = 0;
  let lower = 0;
  for (const { upTo, rate } of FEDERAL_BRACKETS) {
    if (taxable > lower) tax += (Math.min(taxable, upTo) - lower) * rate;
    lower = upTo;
  }
  return tax;
}

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

export function estimatePaycheck(raw: PaycheckInputs) {
  const periods = PERIODS_PER_YEAR[raw.payFrequency];
  const isHourly = raw.payType === "hourly";

  const hourlyWage = clamp(raw.hourlyWage, 0, 10_000);
  const hoursPerWeek = clamp(raw.hoursPerWeek, 0, 168);
  const tipsPerWeek = isHourly ? clamp(raw.tipsPerWeek, 0, 1_000_000) : 0;
  const annualSalary = clamp(raw.annualSalary, 0, 1_000_000_000);
  const retirementPct = clamp(raw.retirementPct, 0, 100);

  // Pay for a year of steady work, split into its parts.
  const regularHours = Math.min(hoursPerWeek, OVERTIME_THRESHOLD_HOURS);
  const overtimeHours = isHourly
    ? Math.max(hoursPerWeek - OVERTIME_THRESHOLD_HOURS, 0)
    : 0;
  const annualRegular = isHourly ? hourlyWage * regularHours * 52 : annualSalary;
  const annualOvertime = isHourly
    ? hourlyWage * OVERTIME_MULTIPLIER * overtimeHours * 52
    : 0;
  const annualTips = tipsPerWeek * 52;
  const annualGross = annualRegular + annualOvertime + annualTips;

  // Payroll deductions, all worked out per year.
  const wantedDeferral = (retirementPct / 100) * annualGross;
  const retirement = Math.min(wantedDeferral, RETIREMENT_DEFERRAL_LIMIT);
  const insurancePre = clamp(raw.insurancePreTaxPerPaycheck, 0, 1e9) * periods;
  const insurancePost =
    clamp(raw.insurancePostTaxPerPaycheck, 0, 1e9) * periods;
  const insurance = insurancePre + insurancePost;
  const wantedHsa = clamp(raw.hsaPerPaycheck, 0, 1e9) * periods;
  const hsa = Math.min(wantedHsa, HSA_LIMIT_FAMILY);
  const otherPreTax = clamp(raw.otherPreTaxPerPaycheck, 0, 1e9) * periods;
  const otherPostTax = clamp(raw.otherPostTaxPerPaycheck, 0, 1e9) * periods;

  // Health premiums, payroll HSA contributions, and other "cafeteria plan"
  // style deductions come out before income tax AND before Social
  // Security/Medicare. A traditional 401(k)/403(b) comes out before income
  // tax only. Roth is after tax. States can differ: Pennsylvania still taxes
  // 401(k) deferrals, and California/New Jersey still tax HSA contributions.
  const cafeteria = insurancePre + otherPreTax + hsa;
  const traditional = raw.retirementType === "traditional" ? retirement : 0;
  const state = getState(raw.stateCode);

  const ficaWages = Math.max(annualGross - cafeteria, 0);
  const federalWages = Math.max(annualGross - cafeteria - traditional, 0);
  const stateWages = Math.max(
    annualGross -
      cafeteria +
      (state?.taxesHsaContributions ? hsa : 0) -
      (state?.taxesRetirementDeferrals ? 0 : traditional),
    0,
  );

  const federal = federalIncomeTax(federalWages);
  const socialSecurity = raw.skipFica
    ? 0
    : SOCIAL_SECURITY_RATE * Math.min(ficaWages, SOCIAL_SECURITY_WAGE_BASE);
  const medicare = raw.skipFica ? 0 : MEDICARE_RATE * ficaWages;
  const stateTax = stateIncomeTax(raw.stateCode, stateWages);

  const takeHomeYear =
    annualGross -
    retirement -
    insurance -
    hsa -
    otherPreTax -
    otherPostTax -
    federal -
    socialSecurity -
    medicare -
    stateTax;

  const perPaycheck = {
    regularPay: annualRegular / periods,
    overtimePay: annualOvertime / periods,
    tips: annualTips / periods,
    gross: annualGross / periods,
    retirement: retirement / periods,
    insurance: insurance / periods,
    insurancePreTax: insurancePre / periods,
    insurancePostTax: insurancePost / periods,
    hsa: hsa / periods,
    otherPreTax: otherPreTax / periods,
    otherPostTax: otherPostTax / periods,
    federal: federal / periods,
    socialSecurity: socialSecurity / periods,
    medicare: medicare / periods,
    state: stateTax / periods,
    takeHome: takeHomeYear / periods,
  };

  return {
    periods,
    overtimeHours,
    annualGross,
    federalWages,
    perPaycheck,
    takeHomeWeekly: takeHomeYear / 52,
    takeHomeMonthly: takeHomeYear / 12,
    takeHomeYear,
    retirementCapped: wantedDeferral > RETIREMENT_DEFERRAL_LIMIT,
    hsaCapped: wantedHsa > HSA_LIMIT_FAMILY,
    stateTaxesHsa: !!state?.taxesHsaContributions,
    underStandardDeduction:
      annualGross > 0 && federalWages <= STANDARD_DEDUCTION,
    deductionsExceedPay: takeHomeYear < 0,
  };
}
