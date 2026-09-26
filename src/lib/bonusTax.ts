import {
  MEDICARE_RATE,
  PERIODS_PER_YEAR,
  RETIREMENT_DEFERRAL_LIMIT,
  SOCIAL_SECURITY_RATE,
  SOCIAL_SECURITY_WAGE_BASE,
  federalIncomeTax,
  type PayFrequency,
  type RetirementType,
} from "./paycheckTax";
import { bracketTax, getState, stateIncomeTax } from "./stateTax";

// IRS Publication 15 (2026): employers may withhold a flat 22% on supplemental
// wages like bonuses (37% on the part of a year's supplemental wages over $1
// million), or use the "aggregate" method.
export const SUPPLEMENTAL_RATE = 0.22;
export const SUPPLEMENTAL_RATE_OVER_THRESHOLD = 0.37;
export const SUPPLEMENTAL_THRESHOLD = 1_000_000;

// Extra 0.9% Medicare tax on wages above $200,000 (single filer).
export const ADDITIONAL_MEDICARE_RATE = 0.009;
export const ADDITIONAL_MEDICARE_THRESHOLD = 200_000;

export type WithholdingMethod = "flat" | "aggregate";

export type BonusInputs = {
  bonus: number;
  // Regular yearly pay before the bonus (gross).
  annualPay: number;
  stateCode: string;
  // The state withholding rate on the bonus. null means "use the automatic
  // rate": the state's own flat bonus rate where it publishes one, otherwise
  // an estimate from its regular rates.
  stateBonusRatePct: number | null;
  // City/county tax: the id of the chosen option ("" = not answered), and the
  // person's own rate for options where they enter it.
  localId: string;
  localCustomRatePct: number;
  method: WithholdingMethod;
  // Only used by the aggregate method.
  payFrequency: PayFrequency;
  bonusRetirementPct: number;
  retirementType: RetirementType;
};

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

export function estimateBonus(raw: BonusInputs) {
  const bonus = clamp(raw.bonus, 0, 1_000_000_000);
  const annualPay = clamp(raw.annualPay, 0, 1_000_000_000);
  const periods = PERIODS_PER_YEAR[raw.payFrequency];
  const roth = raw.retirementType === "roth";
  const state = getState(raw.stateCode);
  const stateTaxes = !!state && state.brackets.length > 0;

  // 401(k)/403(b) contribution taken from the bonus, up to the yearly limit.
  const wantedBonusDeferral =
    (clamp(raw.bonusRetirementPct, 0, 100) / 100) * bonus;
  const bonusDeferral = Math.min(wantedBonusDeferral, RETIREMENT_DEFERRAL_LIMIT);
  const traditionalBonus = roth ? 0 : bonusDeferral;

  // Federal income tax. `withheld` is what comes out of the bonus check;
  // `owed` is the extra tax the bonus really adds to your year.
  const federalBonusWages = Math.max(bonus - traditionalBonus, 0);

  let federalWithheld: number;
  if (raw.method === "flat") {
    federalWithheld =
      Math.min(federalBonusWages, SUPPLEMENTAL_THRESHOLD) * SUPPLEMENTAL_RATE +
      Math.max(federalBonusWages - SUPPLEMENTAL_THRESHOLD, 0) *
        SUPPLEMENTAL_RATE_OVER_THRESHOLD;
  } else {
    // Aggregate: withhold on (regular check + bonus) as if it were one
    // regular paycheck, then subtract what the regular check already had.
    const withholdingOn = (periodWages: number) =>
      federalIncomeTax(periodWages * periods) / periods;
    const regularPeriod = annualPay / periods;
    federalWithheld =
      withholdingOn(regularPeriod + federalBonusWages) -
      withholdingOn(regularPeriod);
  }
  const federalOwed =
    federalIncomeTax(annualPay + federalBonusWages) -
    federalIncomeTax(annualPay);

  // Social Security and Medicare apply to bonuses just like regular pay.
  // Traditional and Roth 401(k) deferrals don't reduce them.
  const socialSecurity =
    SOCIAL_SECURITY_RATE *
    (Math.min(annualPay + bonus, SOCIAL_SECURITY_WAGE_BASE) -
      Math.min(annualPay, SOCIAL_SECURITY_WAGE_BASE));
  const medicare = MEDICARE_RATE * bonus;
  const additionalMedicare =
    ADDITIONAL_MEDICARE_RATE *
    (Math.max(annualPay + bonus - ADDITIONAL_MEDICARE_THRESHOLD, 0) -
      Math.max(annualPay - ADDITIONAL_MEDICARE_THRESHOLD, 0));

  // State income tax. Pennsylvania still taxes 401(k) deferrals.
  const stateBonusWages = Math.max(
    bonus - (state?.taxesRetirementDeferrals ? 0 : traditionalBonus),
    0,
  );
  const stateOwed = stateTaxes
    ? stateIncomeTax(raw.stateCode, annualPay + stateBonusWages) -
      stateIncomeTax(raw.stateCode, annualPay)
    : 0;

  // What the state would withhold with no override: its own flat bonus rate
  // where it publishes one, otherwise the tax the bonus really adds.
  const flatRatePct = state?.bonusWithholdingRatePct;
  const stateAutoWithheld = !stateTaxes
    ? 0
    : flatRatePct !== undefined
      ? (flatRatePct / 100) * stateBonusWages
      : stateOwed;
  const stateAutoRatePct =
    stateBonusWages > 0 ? (stateAutoWithheld / stateBonusWages) * 100 : 0;
  const stateWithheld = !stateTaxes
    ? 0
    : raw.stateBonusRatePct === null
      ? stateAutoWithheld
      : (clamp(raw.stateBonusRatePct, 0, 30) / 100) * stateBonusWages;

  // City/county income tax, if this state asks the question and one was chosen.
  const localOption = state?.local?.options.find((o) => o.id === raw.localId);
  let localOwed = 0;
  let localWithheld = 0;
  if (localOption) {
    const brackets = localOption.custom
      ? [[0, clamp(raw.localCustomRatePct, 0, 20)] as [number, number]]
      : localOption.brackets;
    // Maryland counties and NYC tax income after the state deduction; most
    // other local taxes apply to gross wages (including 401(k) deferrals).
    const before =
      localOption.base === "stateTaxable"
        ? Math.max(annualPay - (state?.deduction ?? 0), 0)
        : annualPay;
    const bonusBase =
      localOption.base === "stateTaxable" ? stateBonusWages : bonus;
    localOwed =
      bracketTax(brackets, before + bonusBase) -
      bracketTax(brackets, before) +
      ((localOption.pctOfStateTax ?? 0) / 100) * stateOwed;
    localWithheld =
      localOption.bonusWithholdingRatePct !== undefined
        ? (localOption.bonusWithholdingRatePct / 100) * bonusBase
        : localOwed;
  }

  const takeHome =
    bonus -
    bonusDeferral -
    federalWithheld -
    socialSecurity -
    medicare -
    additionalMedicare -
    stateWithheld -
    localWithheld;

  const incomeTaxWithheld = federalWithheld + stateWithheld + localWithheld;
  const incomeTaxOwed = federalOwed + stateOwed + localOwed;

  return {
    bonus,
    takeHome,
    bonusDeferral,
    retirementCapped: wantedBonusDeferral > RETIREMENT_DEFERRAL_LIMIT,
    federalBonusWages,
    federalWithheld,
    federalWithheldRate:
      federalBonusWages > 0 ? federalWithheld / federalBonusWages : 0,
    federalOwed,
    federalEffectiveRate:
      federalBonusWages > 0 ? federalOwed / federalBonusWages : 0,
    socialSecurity,
    medicare,
    additionalMedicare,
    stateWithheld,
    stateOwed,
    stateAutoRatePct,
    // True when the automatic rate is the state's own published flat rate.
    stateRateIsFlat: stateTaxes && flatRatePct !== undefined,
    // Short name for result rows; undefined when the person typed their own rate.
    localName: localOption && !localOption.custom
      ? (localOption.name ?? localOption.label)
      : undefined,
    localWithheld,
    localOwed,
    incomeTaxWithheld,
    incomeTaxOwed,
    // Positive: withholding was more than the real tax (a likely refund).
    // Negative: withholding fell short (you may owe at tax time).
    settleUp: incomeTaxWithheld - incomeTaxOwed,
    overMillion: federalBonusWages > SUPPLEMENTAL_THRESHOLD,
  };
}
