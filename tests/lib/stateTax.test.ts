import { describe, expect, it } from "vitest";
import { STATES, stateIncomeTax } from "@/lib/stateTax";
import { estimateBonus } from "@/lib/bonusTax";

const INCOMES = [0, 5_000, 12_000, 25_000, 40_000, 75_000, 150_000, 500_000];

describe("every state's tax rules", () => {
  it("never charges negative tax, and tax never falls as income rises", () => {
    for (const s of STATES) {
      let last = 0;
      for (const income of INCOMES) {
        const tax = stateIncomeTax(s.code, income);
        expect(tax, `${s.code} at $${income}`).toBeGreaterThanOrEqual(0);
        expect(tax, `${s.code} at $${income}`).toBeGreaterThanOrEqual(last - 1e-9);
        last = tax;
      }
    }
  });

  it("charges nothing in states with no wage income tax", () => {
    for (const code of ["AK", "FL", "NV", "NH", "SD", "TN", "TX", "WA", "WY"]) {
      expect(stateIncomeTax(code, 100_000), code).toBe(0);
    }
  });

  it("never takes more than half of a $75,000 income", () => {
    for (const s of STATES) {
      expect(stateIncomeTax(s.code, 75_000), s.code).toBeLessThan(37_500);
    }
  });
});

describe("city and county tax questions", () => {
  const withLocal = STATES.filter((s) => s.local);

  it("exist for the states we expect", () => {
    expect(withLocal.map((s) => s.code).sort()).toEqual(
      ["AL", "DE", "IN", "KY", "MD", "MI", "MO", "NY", "OH", "PA"].sort(),
    );
  });

  it("have unique option ids, and rates for every option that isn't 'enter your own'", () => {
    for (const s of withLocal) {
      const ids = s.local!.options.map((o) => o.id);
      expect(new Set(ids).size, s.code).toBe(ids.length);
      for (const o of s.local!.options) {
        if (o.custom || o.id === "none") continue;
        const hasRate = o.brackets.length > 0 || o.pctOfStateTax !== undefined;
        expect(hasRate, `${s.code}/${o.id}`).toBe(true);
      }
    }
  });

  it("give the bonus estimator finite numbers for every state and local option", () => {
    for (const s of STATES) {
      const localIds = s.local ? s.local.options.map((o) => o.id) : [""];
      for (const localId of localIds) {
        const r = estimateBonus({
          bonus: 5_000,
          annualPay: 60_000,
          stateCode: s.code,
          stateBonusRatePct: null,
          localId,
          localCustomRatePct: 2,
          method: "flat",
          payFrequency: "biweekly",
          bonusRetirementPct: 10,
          retirementType: "traditional",
        });
        expect(Number.isFinite(r.takeHome), `${s.code}/${localId}`).toBe(true);
        expect(r.takeHome, `${s.code}/${localId}`).toBeGreaterThan(0);
        expect(r.takeHome, `${s.code}/${localId}`).toBeLessThan(5_000);
      }
    }
  });
});
