// Effective property tax rate by state: property taxes paid as a percentage
// of home value. Source: Tax Foundation, "Property Taxes by State and County,
// 2026" (based on 2024 American Community Survey data). These are statewide
// averages, so a particular county or town can be much higher or lower.
const RATES: Record<string, number> = {
  AL: 0.37, AK: 0.94, AZ: 0.48, AR: 0.56, CA: 0.7, CO: 0.5, CT: 1.54,
  DE: 0.54, DC: 0.56, FL: 0.78, GA: 0.79, HI: 0.29, ID: 0.5, IL: 1.88,
  IN: 0.76, IA: 1.33, KS: 1.21, KY: 0.74, LA: 0.55, ME: 0.98, MD: 0.92,
  MA: 1.0, MI: 1.19, MN: 1.0, MS: 0.58, MO: 0.89, MT: 0.61, NE: 1.44,
  NV: 0.5, NH: 1.5, NJ: 1.88, NM: 0.63, NY: 1.3, NC: 0.66, ND: 0.92,
  OH: 1.36, OK: 0.79, OR: 0.81, PA: 1.26, RI: 1.12, SC: 0.49, SD: 1.0,
  TN: 0.52, TX: 1.4, UT: 0.48, VT: 1.51, VA: 0.78, WA: 0.75, WV: 0.51,
  WI: 1.32, WY: 0.53,
};

// The national average, used when no state is picked.
export const NATIONAL_PROPERTY_TAX_RATE = 0.9;

export function propertyTaxRatePct(stateCode: string) {
  return RATES[stateCode] ?? NATIONAL_PROPERTY_TAX_RATE;
}

export function hasPropertyTaxRate(stateCode: string) {
  return stateCode in RATES;
}
