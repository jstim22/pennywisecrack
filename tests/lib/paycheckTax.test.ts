import { describe } from "vitest";
import { check } from "../helpers";
import {
  estimatePaycheck,
  federalIncomeTax,
  type PaycheckInputs,
} from "@/lib/paycheckTax";
import {
  stateIncomeTax,
  STATES,
  getState,
} from "@/lib/stateTax";

const base: PaycheckInputs = {
  payType: "salary",
  hourlyWage: 0,
  hoursPerWeek: 0,
  tipsPerWeek: 0,
  annualSalary: 41_600,
  payFrequency: "biweekly",
  stateCode: "TX",
  retirementPct: 0,
  retirementType: "traditional",
  insurancePreTaxPerPaycheck: 0,
  insurancePostTaxPerPaycheck: 0,
  hsaPerPaycheck: 0,
  otherPreTaxPerPaycheck: 0,
  otherPostTaxPerPaycheck: 0,
  skipFica: false,
};
const est = (o: Partial<PaycheckInputs>) => estimatePaycheck({ ...base, ...o });

const s = est({});
const trad = est({ retirementPct: 10 });
const roth = est({ retirementPct: 10, retirementType: "roth" });
const capped = est({ annualSalary: 200_000, retirementPct: 20, payFrequency: "monthly" });
const insPre = est({ insurancePreTaxPerPaycheck: 50 });
const insPost = est({ insurancePostTaxPerPaycheck: 50 });
const mixed = est({ insurancePreTaxPerPaycheck: 30, insurancePostTaxPerPaycheck: 20 });
const stub = est({ annualSalary: 78_000, insurancePreTaxPerPaycheck: 289 });
const stubSplit = est({ annualSalary: 78_000, insurancePreTaxPerPaycheck: 189, insurancePostTaxPerPaycheck: 100 });
const otherPre = est({ otherPreTaxPerPaycheck: 20 });
const otherPost = est({ otherPostTaxPerPaycheck: 10 });
const hsa = est({ hsaPerPaycheck: 50 });
const hsaIL = est({ stateCode: "IL", hsaPerPaycheck: 50 });
const caNoHsa = est({ stateCode: "CA" });
const caHsa = est({ stateCode: "CA", hsaPerPaycheck: 50 });
const njHsa = est({ stateCode: "NJ", hsaPerPaycheck: 50 });
const hsaCap = est({ hsaPerPaycheck: 400 });
const hsaAndK = est({ hsaPerPaycheck: 50, retirementPct: 10 });
const pa = est({ stateCode: "PA", retirementPct: 10 });
const il = est({ stateCode: "IL", retirementPct: 10 });
const h = est({ payType: "hourly", hourlyWage: 20, hoursPerWeek: 45, tipsPerWeek: 100, payFrequency: "weekly" });
const sal = est({ hoursPerWeek: 60, tipsPerWeek: 500 });
const partTime = est({ payType: "hourly", hourlyWage: 15, hoursPerWeek: 10, payFrequency: "weekly" });
const noFica = est({ skipFica: true });
const broke = est({ annualSalary: 10_000, insurancePostTaxPerPaycheck: 500 });
const junk = est({ annualSalary: NaN, retirementPct: 999, insurancePreTaxPerPaycheck: -5, stateCode: "ZZ" });

describe("federal", () => {
  check("tax on $7,800", federalIncomeTax(7_800), 0);
  check("tax on $28,080", federalIncomeTax(28_080), 1_198);
  check("tax on $100,000", federalIncomeTax(100_000), 13_170);
});

describe("states (hand computed)", () => {
  check("CA $40,000", stateIncomeTax("CA", 40_000), 589.33);
  check("IL $40,000", stateIncomeTax("IL", 40_000), 1_835.2125);
  check("NY $30,000", stateIncomeTax("NY", 30_000), 1_023.0);
  check("PA $40,000 (flat, no deduction)", stateIncomeTax("PA", 40_000), 1_228);
  check("TX is 0", stateIncomeTax("TX", 90_000), 0);
  check("WA is 0", stateIncomeTax("WA", 90_000), 0);
  check("unknown/blank state is 0", stateIncomeTax("", 90_000), 0);
  check("CA below deduction is 0", stateIncomeTax("CA", 5_000), 0);
  check("51 jurisdictions (50 states + DC)", STATES.length, 51);
  check("state codes are unique", new Set(STATES.map((s) => s.code)).size, 51);
});

describe("salary basics", () => {
  check("gross/paycheck", s.perPaycheck.gross, 1600);
  check("federal/paycheck", s.perPaycheck.federal, 2812 / 26);
  check("SS/paycheck", s.perPaycheck.socialSecurity, 99.2);
  check("Medicare/paycheck", s.perPaycheck.medicare, 23.2);
  check("take-home/paycheck", s.perPaycheck.takeHome, 1369.4462);
});

describe("401(k)", () => {
  check("traditional: deferral/paycheck", trad.perPaycheck.retirement, 160);
  check("traditional: federal drops", trad.perPaycheck.federal, 2312.8 / 26);
  check("traditional: FICA unchanged (SS)", trad.perPaycheck.socialSecurity, 99.2);
  check("traditional: take-home", trad.perPaycheck.takeHome, 1228.6462);
  check("traditional: costs less than the 160 saved", s.perPaycheck.takeHome - trad.perPaycheck.takeHome, 140.8);
  check("roth: federal unchanged", roth.perPaycheck.federal, 2812 / 26);
  check("roth: take-home", roth.perPaycheck.takeHome, 1209.4462);
  check("cap at $24,500/yr", capped.perPaycheck.retirement, 24_500 / 12);
  check("capped flag", capped.retirementCapped ? 1 : 0, 1);
  check("uncapped flag off", trad.retirementCapped ? 1 : 0, 0);
});

describe("insurance & other deductions", () => {
  check("pre-tax insurance: federal", insPre.perPaycheck.federal, 2656 / 26);
  check("pre-tax insurance: SS drops too", insPre.perPaycheck.socialSecurity, 96.1);
  check("pre-tax insurance: Medicare drops too", insPre.perPaycheck.medicare, 22.475);
  check("pre-tax insurance: take-home", insPre.perPaycheck.takeHome, 1329.2712);
  check("post-tax insurance: federal unchanged", insPost.perPaycheck.federal, 2812 / 26);
  check("post-tax insurance: take-home", insPost.perPaycheck.takeHome, 1319.4462);
  check("mixed insurance: only the pre-tax part lowers federal", mixed.perPaycheck.federal, 2718.4 / 26);
  check("mixed insurance: only the pre-tax part lowers Social Security", mixed.perPaycheck.socialSecurity, 97.34);
  check("mixed insurance: only the pre-tax part lowers Medicare", mixed.perPaycheck.medicare, 22.765);
  check("mixed insurance: take-home", mixed.perPaycheck.takeHome, 1325.3412);
  check("mixed insurance: total insurance", mixed.perPaycheck.insurance, 50);
});

describe("REAL PAY STUB regression (biweekly: OASDI 168.08, Medicare 39.31, Federal 256.80)", () => {
  // $3,000 gross with $289 of pre-tax deductions => $2,711 taxable wages.
  check("stub OASDI", stub.perPaycheck.socialSecurity, 168.08, 0.005);
  check("stub Medicare", stub.perPaycheck.medicare, 39.31, 0.005);
  check("stub Federal withholding", stub.perPaycheck.federal, 256.80, 0.005);
  // Same $289 but split pre/post changes the answer — the case that motivated the split.
  check("splitting $100 to post-tax RAISES federal tax", stubSplit.perPaycheck.federal > stub.perPaycheck.federal ? 1 : 0, 1);
  check("other pre-tax: take-home", otherPre.perPaycheck.takeHome, 1353.3762);
  check("other post-tax: exactly $10 less", s.perPaycheck.takeHome - otherPost.perPaycheck.takeHome, 10);
});

describe("HSA", () => {
  check("HSA: per-paycheck amount", hsa.perPaycheck.hsa, 50);
  check("HSA: federal drops (like pre-tax insurance)", hsa.perPaycheck.federal, 2656 / 26);
  check("HSA: skips Social Security", hsa.perPaycheck.socialSecurity, 96.1);
  check("HSA: skips Medicare", hsa.perPaycheck.medicare, 22.475);
  check("HSA: take-home", hsa.perPaycheck.takeHome, 1329.2712);
  check("HSA in IL: state tax on reduced wages", hsaIL.perPaycheck.state, ((40_300 - 2_925) * 0.0495) / 26);
  check("HSA in CA: NO state break (state tax unchanged)", caHsa.perPaycheck.state, caNoHsa.perPaycheck.state);
  check("HSA in CA: federal still drops", caHsa.perPaycheck.federal, 2656 / 26);
  check("HSA in CA flag", caHsa.stateTaxesHsa ? 1 : 0, 1);
  check("HSA in NJ: NO state break", njHsa.perPaycheck.state, est({ stateCode: "NJ" }).perPaycheck.state);
  check("HSA in TX flag off", hsa.stateTaxesHsa ? 1 : 0, 0);
  check("HSA capped at family limit $8,750/yr", hsaCap.perPaycheck.hsa, 8_750 / 26);
  check("HSA capped flag", hsaCap.hsaCapped ? 1 : 0, 1);
  check("HSA uncapped flag off", hsa.hsaCapped ? 1 : 0, 0);
  check("HSA + 401(k): both deducted from take-home", hsaAndK.perPaycheck.hsa + hsaAndK.perPaycheck.retirement, 210);
});

describe("state interaction with 401(k)", () => {
  check("PA taxes deferrals (state on full wages)", pa.perPaycheck.state, (0.0307 * 41_600) / 26);
  check("IL excludes deferrals", il.perPaycheck.state, ((37_440 - 2_925) * 0.0495) / 26);
  check("PA flag set", getState("PA")?.taxesRetirementDeferrals ? 1 : 0, 1);
});

describe("hourly", () => {
  check("hourly gross w/ OT + tips", h.perPaycheck.gross, 1050);
  check("regular pay", h.perPaycheck.regularPay, 800);
  check("overtime pay", h.perPaycheck.overtimePay, 150);
  check("tips", h.perPaycheck.tips, 100);
  check("overtime hours", h.overtimeHours, 5);
  check("salary ignores hours/tips", sal.perPaycheck.gross, 1600);
  check("$15 x 10hrs a week: take-home", partTime.perPaycheck.takeHome, 138.525);
  check("$15 x 10hrs a week: under the standard deduction", partTime.underStandardDeduction ? 1 : 0, 1);
  check("$41,600 not under std deduction", s.underStandardDeduction ? 1 : 0, 0);
});

describe("FICA opt-out & guards", () => {
  check("skip FICA", noFica.perPaycheck.socialSecurity + noFica.perPaycheck.medicare, 0);
  check("deductions exceeding pay flagged", broke.deductionsExceedPay ? 1 : 0, 1);
  check("garbage inputs stay finite", Number.isFinite(junk.perPaycheck.takeHome) ? 0 : 1, 0);
});
