// State sales tax rates on buying a car, for a rough guess. Sources:
// World Population Review, "Car Sales Tax by State" and
// FindTheBestCarPrice.com, "What's the Car Sales Tax in Each State?"
// (both retrieved September 2026; the two agreed on every state). These are
// state-level rates only — many places add a county or city tax on top,
// and a few states (Georgia, South Carolina) use a separate title/registration
// tax instead of an ordinary sales tax, which is folded in here as a single
// rate for simplicity.
const RATES: Record<string, number> = {
  AL: 2, AK: 0, AZ: 5.6, AR: 6.5, CA: 7.25, CO: 2.9, CT: 6.35,
  DE: 0, FL: 6, GA: 7, HI: 4, ID: 6, IL: 6.25, IN: 7, IA: 5,
  KS: 7.5, KY: 6, LA: 5, ME: 5.5, MD: 6, MA: 6.25, MI: 6, MN: 6.875,
  MS: 5, MO: 4.23, MT: 0, NE: 5.5, NV: 6.85, NH: 0, NJ: 6.625, NM: 4,
  NY: 4, NC: 3, ND: 5, OH: 5.75, OK: 4.5, OR: 0, PA: 6, RI: 7, SC: 5,
  SD: 4, TN: 7, TX: 6.25, UT: 6.96, VT: 6, VA: 4.15, WA: 6.8, WV: 6,
  WI: 5, WY: 4,
};

// The plain average of the state rates above, used as a placeholder before a
// state is picked (or for DC — see below).
export const NATIONAL_VEHICLE_SALES_TAX_RATE =
  Math.round(
    (Object.values(RATES).reduce((sum, r) => sum + r, 0) / Object.values(RATES).length) * 100,
  ) / 100;

export function vehicleSalesTaxRatePct(stateCode: string) {
  return RATES[stateCode] ?? NATIONAL_VEHICLE_SALES_TAX_RATE;
}

export function hasVehicleSalesTaxRate(stateCode: string) {
  return stateCode in RATES;
}

// DC doesn't charge an ordinary sales tax on cars — it charges an excise tax
// based on the vehicle's weight and fuel economy, so a single percentage
// can't represent it.
export function isSpecialVehicleTaxState(stateCode: string) {
  return stateCode === "DC";
}
