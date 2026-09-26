import { describe } from "vitest";
import { check } from "../helpers";
import { estimateBonus, type BonusInputs } from "@/lib/bonusTax";
import { STATES } from "@/lib/stateTax";

const base: BonusInputs = {
  bonus: 2_000,
  annualPay: 40_000,
  stateCode: "",
  stateBonusRatePct: null,
  localId: "",
  localCustomRatePct: 0,
  method: "flat",
  payFrequency: "biweekly",
  bonusRetirementPct: 0,
  retirementType: "traditional",
};
const est = (o: Partial<BonusInputs>) => estimateBonus({ ...base, ...o });

const a = est({});
const t = est({ bonusRetirementPct: 10 });
const r = est({ bonusRetirementPct: 10, retirementType: "roth" });
const g = est({ method: "aggregate" });
const gw = est({ method: "aggregate", payFrequency: "weekly" });
const m = est({ annualPay: 0, bonus: 1_200_000 });
const sb = est({ annualPay: 180_000, bonus: 10_000 });
const hi = est({ annualPay: 195_000, bonus: 20_000 });
const already = est({ annualPay: 250_000, bonus: 10_000 });
const cap = est({ annualPay: 50_000, bonus: 100_000, bonusRetirementPct: 50 });
const under = est({ bonus: 100_000, bonusRetirementPct: 20 });
const il = est({ stateCode: "IL" });
const ca = est({ stateCode: "CA" });
const ny = est({ stateCode: "NY" });
const mn = est({ stateCode: "MN" });
const bal = est({ stateCode: "MD", localId: "baltimore-city" });
const aa = est({ stateCode: "MD", localId: "anne-arundel", annualPay: 55_000, bonus: 3_000 });
const fr = est({ stateCode: "MD", localId: "frederick", annualPay: 31_000, bonus: 1_000 });
const tal = est({ stateCode: "MD", localId: "talbot" });
const nyc = est({ stateCode: "NY", localId: "nyc" });
const yr = est({ stateCode: "NY", localId: "yonkers-resident" });
const yn = est({ stateCode: "NY", localId: "yonkers-nonresident" });
const phl = est({ stateCode: "PA", localId: "phl-resident" });
const oh = est({ stateCode: "OH", localId: "custom", localCustomRatePct: 2.5 });
const ohT = est({ stateCode: "OH", localId: "custom", localCustomRatePct: 2, bonusRetirementPct: 10 });
const junk = est({ bonus: NaN, annualPay: -5, bonusRetirementPct: 999, stateBonusRatePct: NaN, localCustomRatePct: -3, stateCode: "ZZ" });
const zero = est({ bonus: 0, stateCode: "NY", localId: "nyc" });

describe("flat 22% method, $40k pay + $2k bonus", () => {
  check("federal withheld = 22%", a.federalWithheld, 440);
  check("federal really owed = 12% bracket", a.federalOwed, 240);
  check("effective federal rate on bonus", a.federalEffectiveRate, 0.12);
  check("Social Security 6.2%", a.socialSecurity, 124);
  check("Medicare 1.45%", a.medicare, 29);
  check("additional Medicare", a.additionalMedicare, 0);
  check("take-home", a.takeHome, 1407);
  check("withheld more than owed -> refund", a.settleUp, 200);
});

describe("traditional 401(k) on the bonus (10%)", () => {
  check("deferral", t.bonusDeferral, 200);
  check("federal withheld on reduced wages", t.federalWithheld, 396);
  check("federal owed on reduced wages", t.federalOwed, 216);
  check("FICA NOT reduced (SS)", t.socialSecurity, 124);
  check("FICA NOT reduced (Medicare)", t.medicare, 29);
  check("take-home", t.takeHome, 1251);
});

describe("Roth 401(k) on the bonus (10%)", () => {
  check("federal withheld unchanged", r.federalWithheld, 440);
  check("take-home", r.takeHome, 1207);
});

describe("aggregate method (biweekly)", () => {
  check("aggregate federal withheld", g.federalWithheld, 8790 / 26);
  check("aggregate: real tax unchanged", g.federalOwed, 240);
  check("aggregate weekly differs from biweekly", gw.federalWithheld > g.federalWithheld ? 1 : 0, 1);
});

describe("over $1 million", () => {
  check("22% up to $1M, 37% above", m.federalWithheld, 220_000 + 74_000);
  check("over-million flag", m.overMillion ? 1 : 0, 1);
  check("no flag below", a.overMillion ? 1 : 0, 0);
});

describe("Social Security wage base & Additional Medicare", () => {
  check("SS only on the part below $184,500", sb.socialSecurity, 0.062 * 4_500);
  check("Medicare on all of it", sb.medicare, 145);
  check("no additional Medicare under $200k", sb.additionalMedicare, 0);
  check("SS already maxed out", hi.socialSecurity, 0);
  check("additional Medicare 0.9% on the part over $200k", hi.additionalMedicare, 0.009 * 15_000);
  check("all of bonus over $200k", already.additionalMedicare, 90);
});

describe("401(k) yearly limit (bonus only)", () => {
  check("50% of $100k would be $50k; capped at $24,500", cap.bonusDeferral, 24_500);
  check("capped flag", cap.retirementCapped ? 1 : 0, 1);
  check("uncapped flag off", a.retirementCapped ? 1 : 0, 0);
  check("20% of $100k = $20k fits", under.bonusDeferral, 20_000);
});

describe("state: automatic (prepopulated) rate", () => {
  check("IL auto rate = its 4.95% flat", il.stateAutoRatePct, 4.95);
  check("IL state tax on the bonus", il.stateWithheld, 99);
  check("IL owed = withheld when estimated", il.stateOwed, 99);
  check("IL is an estimate, not a published flat bonus rate", il.stateRateIsFlat ? 1 : 0, 0);
  check("take-home includes state", il.takeHome, 1407 - 99);
  check("CA auto rate = 10.23% (EDD)", ca.stateAutoRatePct, 10.23);
  check("CA withheld at 10.23%", ca.stateWithheld, 204.6);
  check("CA really owes only 4% on the bonus", ca.stateOwed, 80);
  check("CA flat flag", ca.stateRateIsFlat ? 1 : 0, 1);
  check("NY auto rate = 11.7% (NYS-50-T)", ny.stateAutoRatePct, 11.7);
  check("NY withheld", ny.stateWithheld, 234);
  check("NY really owes 5.4% bracket", ny.stateOwed, 108);
  check("MN auto rate = 6.25% (MN DOR)", mn.stateAutoRatePct, 6.25);
  check("no-tax state auto rate", est({ stateCode: "TX" }).stateAutoRatePct, 0);
  check("no state selected auto rate", a.stateAutoRatePct, 0);
  check("low pay under the state deduction: estimate is 0%", est({ stateCode: "IL", annualPay: 1_000, bonus: 500 }).stateAutoRatePct, 0);
});

describe("state: override", () => {
  check("override 5% on IL", est({ stateCode: "IL", stateBonusRatePct: 5 }).stateWithheld, 100);
  check("override doesn't change what's really owed", est({ stateCode: "IL", stateBonusRatePct: 5 }).stateOwed, 99);
  check("override 0 is respected (not 'auto')", est({ stateCode: "IL", stateBonusRatePct: 0 }).stateWithheld, 0);
  check("override beats CA flat rate", est({ stateCode: "CA", stateBonusRatePct: 6.6 }).stateWithheld, 132);
  check("no-tax state ignores override", est({ stateCode: "TX", stateBonusRatePct: 8 }).stateWithheld, 0);
  check("PA still taxes the deferral", est({ stateCode: "PA", bonusRetirementPct: 10 }).stateWithheld, 0.0307 * 2_000);
  check("IL excludes the deferral", est({ stateCode: "IL", bonusRetirementPct: 10 }).stateWithheld, 0.0495 * 1_800);
});

describe("local: Maryland (official 2026 table)", () => {
  check("Baltimore City 3.20% of taxable income", bal.localOwed, 64);
  check("local withheld = owed", bal.localWithheld, 64);
  // MD taxable before = 55,000-6,550 = 48,450; 1,550 @2.70% + 1,450 @2.94%
  check("Anne Arundel brackets straddle $50k", aa.localOwed, 0.027 * 1_550 + 0.0294 * 1_450);
  check("Frederick brackets straddle $25k", fr.localOwed, 0.0225 * 550 + 0.0275 * 450);
  check("Talbot 2.40%", tal.localOwed, 48);
  check("all 24 MD jurisdictions present", (STATES.find(s => s.code === "MD")?.local?.options.length ?? 0), 24);
});

describe("local: New York City & Yonkers (official NYS publications)", () => {
  check("NYC withheld at 4.25% (NYS-50-T-NYC)", nyc.localWithheld, 85);
  check("NYC really owed: 3.819% bracket", nyc.localOwed, 2_000 * 0.03819);
  check("NYC take-home", nyc.takeHome, 2_000 - 440 - 124 - 29 - 234 - 85);
  check("NYC settle-up includes state + local", nyc.settleUp, (440 + 234 + 85) - (240 + 108 + 76.38));
  check("Yonkers resident withheld 1.95975%", yr.localWithheld, 39.195);
  check("Yonkers resident owed = 16.75% of NYS tax", yr.localOwed, 0.1675 * 108);
  check("Yonkers nonresident 0.50%", yn.localWithheld, 10);
  check("NY 'neither' has no local tax", est({ stateCode: "NY", localId: "none" }).localWithheld, 0);
});

describe("local: Pennsylvania / Philadelphia (rates from 7/1/2026)", () => {
  check("Philadelphia resident 3.735% of wages", phl.localWithheld, 74.7);
  check("Philadelphia nonresident 3.425%", est({ stateCode: "PA", localId: "phl-nonresident" }).localWithheld, 68.5);
  check("Philadelphia tax is on GROSS wages even with a 401(k)", est({ stateCode: "PA", localId: "phl-resident", bonusRetirementPct: 10 }).localWithheld, 74.7);
});

describe("local: enter-your-own rate", () => {
  check("Ohio city 2.5% on wages", oh.localWithheld, 50);
  check("Ohio state tax still separate", oh.stateOwed, 55);
  check("custom local is on GROSS wages (deferral doesn't reduce it)", ohT.localWithheld, 40);
  check("custom rate ignored until 'custom' chosen", est({ stateCode: "OH", localId: "none", localCustomRatePct: 2.5 }).localWithheld, 0);
});

describe("local: guards", () => {
  check("state without a local question ignores a stale localId", est({ stateCode: "TX", localId: "nyc" }).localWithheld, 0);
  check("unknown localId is ignored", est({ stateCode: "MD", localId: "narnia" }).localWithheld, 0);
  check("no answer yet = no local tax", est({ stateCode: "MD" }).localWithheld, 0);
  check("local name reported", est({ stateCode: "MD", localId: "talbot" }).localName === "Talbot County" ? 1 : 0, 1);
});

describe("guards", () => {
  check("garbage inputs stay finite", Number.isFinite(junk.takeHome) ? 0 : 1, 0);
  check("zero bonus", zero.takeHome, 0);
  check("zero bonus auto rate", zero.stateAutoRatePct, 0);
});
