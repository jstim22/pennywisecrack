import { describe, expect, it } from "vitest";
import { check } from "../helpers";
import {
  NATIONAL_VEHICLE_SALES_TAX_RATE,
  hasVehicleSalesTaxRate,
  isSpecialVehicleTaxState,
  vehicleSalesTaxRatePct,
} from "@/lib/vehicleSalesTax";
import { STATES } from "@/lib/stateTax";

describe("vehicle sales tax by state", () => {
  check("California", vehicleSalesTaxRatePct("CA"), 7.25);
  check("Illinois", vehicleSalesTaxRatePct("IL"), 6.25);
  check("no tax in Oregon", vehicleSalesTaxRatePct("OR"), 0);
  check("no tax in Montana", vehicleSalesTaxRatePct("MT"), 0);
  check("no tax in New Hampshire", vehicleSalesTaxRatePct("NH"), 0);
  check("no tax in Delaware", vehicleSalesTaxRatePct("DE"), 0);
  check("no tax in Alaska", vehicleSalesTaxRatePct("AK"), 0);
  it("uses the U.S. average with no state picked", () => {
    check("fallback", vehicleSalesTaxRatePct(""), NATIONAL_VEHICLE_SALES_TAX_RATE);
    expect(NATIONAL_VEHICLE_SALES_TAX_RATE).toBeGreaterThan(3);
    expect(NATIONAL_VEHICLE_SALES_TAX_RATE).toBeLessThan(7);
  });
  it("says which states have a rate", () => {
    expect(hasVehicleSalesTaxRate("CA")).toBe(true);
    expect(hasVehicleSalesTaxRate("OR")).toBe(true); // 0% is still a known rate
    expect(hasVehicleSalesTaxRate("")).toBe(false);
    expect(hasVehicleSalesTaxRate("ZZ")).toBe(false);
  });
  it("has a rate for every one of the 50 states", () => {
    for (const s of STATES) {
      if (s.code === "DC") continue;
      expect(hasVehicleSalesTaxRate(s.code), s.code).toBe(true);
      const r = vehicleSalesTaxRatePct(s.code);
      expect(r, s.code).toBeGreaterThanOrEqual(0);
      expect(r, s.code).toBeLessThan(10);
    }
  });
  it("flags DC as a special case instead of guessing a flat rate", () => {
    expect(isSpecialVehicleTaxState("DC")).toBe(true);
    expect(hasVehicleSalesTaxRate("DC")).toBe(false);
    // Still returns a usable placeholder number rather than nothing.
    check("DC placeholder", vehicleSalesTaxRatePct("DC"), NATIONAL_VEHICLE_SALES_TAX_RATE);
  });
  it("isn't a special case for ordinary states", () => {
    expect(isSpecialVehicleTaxState("CA")).toBe(false);
    expect(isSpecialVehicleTaxState("")).toBe(false);
  });
});
