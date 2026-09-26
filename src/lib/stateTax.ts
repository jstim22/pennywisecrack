// Approximate 2026 state income tax rules for a SINGLE filer, taken from
// Tax Foundation's "2026 State Income Tax Rates and Brackets" (retrieved
// September 2026). Intentionally simplified: it ignores income-based
// phase-outs of deductions/credits and separate state payroll programs
// (disability, paid leave). City/county income taxes are only modeled where
// a `local` rule exists (used by the bonus calculator). Good for an estimate.

// [taxable income over this amount, marginal rate in percent]
type Bracket = [over: number, ratePct: number];

export type StateTaxRule = {
  code: string;
  name: string;
  brackets: Bracket[];
  // Standard deduction plus any personal exemption that is a deduction.
  deduction: number;
  // Personal exemptions/credits that reduce the tax bill directly.
  credit: number;
  // True when employee 401(k)/403(b) contributions are still taxed by the
  // state (Pennsylvania).
  taxesRetirementDeferrals?: boolean;
  // True when the state gives HSA contributions no tax break (California and
  // New Jersey; every other state follows the federal treatment).
  taxesHsaContributions?: boolean;
  // Flat rate the state itself tells employers to withhold on bonuses. Only
  // set where confirmed in the state's own publications; otherwise the tool
  // estimates bonus withholding from the regular rates.
  bonusWithholdingRatePct?: number;
  // City/county income tax questions to ask once this state is picked.
  local?: LocalRule;
  note?: string;
};

export type LocalOption = {
  id: string;
  label: string;
  // Short name for result rows, e.g. "New York City". Defaults to the label.
  name?: string;
  // Rates on the base below. Empty for "none" or when pctOfStateTax is used.
  brackets: Bracket[];
  // "stateTaxable" = income after the state's deduction (Maryland counties,
  // NYC); "wages" = gross wages.
  base: "stateTaxable" | "wages";
  // A flat rate the locality tells employers to withhold on bonuses.
  bonusWithholdingRatePct?: number;
  // Yonkers residents pay a percentage of their New York State tax.
  pctOfStateTax?: number;
  // The person types their own rate.
  custom?: boolean;
};

export type LocalRule = {
  question: string;
  // Shown under the question, e.g. typical rates.
  hint?: string;
  options: LocalOption[];
};

const flat = (ratePct: number): Bracket[] => [[0, ratePct]];

const noLocalTax: LocalOption = {
  id: "none",
  label: "No, my city/county doesn't (or I'm not sure)",
  brackets: [],
  base: "wages",
};

const enterOwnRate = (label = "Yes, I'll enter the rate"): LocalOption => ({
  id: "custom",
  label,
  brackets: [],
  base: "wages",
  custom: true,
});

// Maryland: every county and Baltimore City charges a local income tax on
// Maryland taxable income. Source: Maryland Comptroller, "2026 Maryland State
// and Local Income Tax Withholding Information" (single filers).
const mdCounty = (id: string, label: string, brackets: Bracket[]): LocalOption => ({
  id,
  label,
  brackets,
  base: "stateTaxable",
});

const MARYLAND_LOCAL: LocalRule = {
  question: "Which county do you live in?",
  hint: "Every Maryland county and Baltimore City charges its own income tax, from 2.25% to 3.30%.",
  options: [
    mdCounty("allegany", "Allegany County", flat(3.2)),
    mdCounty("anne-arundel", "Anne Arundel County", [[0, 2.7], [50000, 2.94], [400000, 3.2]]),
    mdCounty("baltimore-city", "Baltimore City", flat(3.2)),
    mdCounty("baltimore-county", "Baltimore County", flat(3.2)),
    mdCounty("calvert", "Calvert County", flat(3.2)),
    mdCounty("caroline", "Caroline County", flat(3.2)),
    mdCounty("carroll", "Carroll County", flat(3.03)),
    mdCounty("cecil", "Cecil County", flat(2.74)),
    mdCounty("charles", "Charles County", flat(3.03)),
    mdCounty("dorchester", "Dorchester County", flat(3.3)),
    mdCounty("frederick", "Frederick County", [[0, 2.25], [25000, 2.75], [50000, 2.96], [150000, 3.2]]),
    mdCounty("garrett", "Garrett County", flat(2.65)),
    mdCounty("harford", "Harford County", flat(3.06)),
    mdCounty("howard", "Howard County", flat(3.2)),
    mdCounty("kent", "Kent County", flat(3.3)),
    mdCounty("montgomery", "Montgomery County", flat(3.2)),
    mdCounty("prince-georges", "Prince George's County", flat(3.2)),
    mdCounty("queen-annes", "Queen Anne's County", flat(3.2)),
    mdCounty("st-marys", "St. Mary's County", flat(3.2)),
    mdCounty("somerset", "Somerset County", flat(3.2)),
    mdCounty("talbot", "Talbot County", flat(2.4)),
    mdCounty("washington", "Washington County", flat(2.95)),
    mdCounty("wicomico", "Wicomico County", flat(3.2)),
    mdCounty("worcester", "Worcester County", flat(2.25)),
  ],
};

// New York: NYC resident brackets are from the state's IT-201 instructions
// (single filer); bonus withholding rates are from NYS-50-T-NYC, NYS-50-T-Y.
const NEW_YORK_LOCAL: LocalRule = {
  question: "Do you live or work in New York City or Yonkers?",
  options: [
    { id: "none", label: "Neither", brackets: [], base: "wages" },
    {
      id: "nyc",
      label: "I live in New York City",
      name: "New York City",
      brackets: [[0, 3.078], [12000, 3.762], [25000, 3.819], [50000, 3.876]],
      base: "stateTaxable",
      bonusWithholdingRatePct: 4.25,
    },
    {
      id: "yonkers-resident",
      label: "I live in Yonkers",
      name: "Yonkers",
      brackets: [],
      base: "wages",
      pctOfStateTax: 16.75,
      bonusWithholdingRatePct: 1.95975,
    },
    {
      id: "yonkers-nonresident",
      label: "I work in Yonkers but live elsewhere",
      name: "Yonkers",
      brackets: flat(0.5),
      base: "wages",
      bonusWithholdingRatePct: 0.5,
    },
  ],
};

// Pennsylvania: Philadelphia rates effective July 1, 2026 (City of
// Philadelphia). Everywhere else varies by municipality and school district.
const PENNSYLVANIA_LOCAL: LocalRule = {
  question: "Do you live or work in Philadelphia?",
  hint: "Other Pennsylvania municipalities and school districts charge their own earned income tax, usually between 1% and 3.6% combined. Your pay stub shows yours.",
  options: [
    { id: "none", label: "No, and I'm not sure of my local tax", brackets: [], base: "wages" },
    { id: "phl-resident", label: "I live in Philadelphia", name: "Philadelphia", brackets: flat(3.735), base: "wages" },
    { id: "phl-nonresident", label: "I work in Philadelphia but live elsewhere", name: "Philadelphia", brackets: flat(3.425), base: "wages" },
    enterOwnRate("No, but I know my local rate (enter it)"),
  ],
};

const customLocal = (hint: string): LocalRule => ({
  question: "Does your city or county charge its own income tax?",
  hint,
  options: [noLocalTax, enterOwnRate()],
});

const none = (code: string, name: string): StateTaxRule => ({
  code,
  name,
  brackets: [],
  deduction: 0,
  credit: 0,
});

const RULES: StateTaxRule[] = [
  {
    code: "AL",
    name: "Alabama",
    brackets: [[0, 2], [500, 4], [3000, 5]],
    deduction: 3000 + 1500,
    credit: 0,
    local: customLocal("A few Alabama cities charge about 1%–2% on wages."),
  },
  none("AK", "Alaska"),
  {
    code: "AZ",
    name: "Arizona",
    brackets: [[0, 2.5]],
    deduction: 8350,
    credit: 100,
  },
  {
    code: "AR",
    name: "Arkansas",
    brackets: [[0, 2], [4600, 3.9]],
    deduction: 2470,
    credit: 29,
  },
  {
    code: "CA",
    name: "California",
    brackets: [
      [0, 1],
      [11079, 2],
      [26264, 4],
      [41452, 6],
      [57542, 8],
      [72724, 9.3],
      [371479, 10.3],
      [445771, 11.3],
      [742953, 12.3],
      [1000000, 13.3],
    ],
    deduction: 5540,
    credit: 153,
    taxesHsaContributions: true,
    bonusWithholdingRatePct: 10.23,
  },
  {
    code: "CO",
    name: "Colorado",
    brackets: [[0, 4.4]],
    deduction: 16100,
    credit: 0,
  },
  {
    code: "CT",
    name: "Connecticut",
    brackets: [
      [0, 2],
      [10000, 4.5],
      [50000, 5.5],
      [100000, 6],
      [200000, 6.5],
      [250000, 6.9],
      [500000, 6.99],
    ],
    deduction: 15000,
    credit: 0,
  },
  {
    code: "DE",
    name: "Delaware",
    brackets: [
      [2000, 2.2],
      [5000, 3.9],
      [10000, 4.8],
      [20000, 5.2],
      [25000, 5.55],
      [60000, 6.6],
    ],
    deduction: 3250,
    credit: 110,
    local: customLocal("Wilmington charges 1.25% on wages, and the rest of Delaware has no city tax."),
  },
  {
    code: "DC",
    name: "District of Columbia",
    brackets: [
      [0, 4],
      [10000, 6],
      [40000, 6.5],
      [60000, 8.5],
      [250000, 9.25],
      [500000, 9.75],
      [1000000, 10.75],
    ],
    deduction: 16100,
    credit: 0,
  },
  none("FL", "Florida"),
  {
    code: "GA",
    name: "Georgia",
    brackets: [[0, 5.19]],
    deduction: 12000,
    credit: 0,
  },
  {
    code: "HI",
    name: "Hawaii",
    brackets: [
      [0, 1.4],
      [9600, 3.2],
      [14400, 5.5],
      [19200, 6.4],
      [24000, 6.8],
      [36000, 7.2],
      [48000, 7.6],
      [125000, 7.9],
      [175000, 8.25],
      [225000, 9],
      [275000, 10],
      [325000, 11],
    ],
    deduction: 4400 + 1144,
    credit: 0,
  },
  {
    code: "ID",
    name: "Idaho",
    brackets: [[4811, 5.3]],
    deduction: 16100,
    credit: 0,
  },
  {
    code: "IL",
    name: "Illinois",
    brackets: [[0, 4.95]],
    deduction: 2925,
    credit: 0,
  },
  {
    code: "IN",
    name: "Indiana",
    brackets: [[0, 2.95]],
    deduction: 1000,
    credit: 0,
    local: customLocal("Every Indiana county charges a local income tax, and the rate depends on your county. Your pay stub shows it."),
  },
  {
    code: "IA",
    name: "Iowa",
    brackets: [[0, 3.8]],
    deduction: 16100,
    credit: 40,
  },
  {
    code: "KS",
    name: "Kansas",
    brackets: [[0, 5.2], [23000, 5.58]],
    deduction: 3605 + 9160,
    credit: 0,
  },
  {
    code: "KY",
    name: "Kentucky",
    brackets: [[0, 3.5]],
    deduction: 3360,
    credit: 0,
    local: customLocal("Many Kentucky cities and counties charge an occupational or income tax, and rates vary a lot. Your pay stub shows it."),
  },
  {
    code: "LA",
    name: "Louisiana",
    brackets: [[0, 3]],
    deduction: 12875,
    credit: 0,
  },
  {
    code: "ME",
    name: "Maine",
    brackets: [[0, 5.8], [27399, 6.75], [64849, 7.15]],
    deduction: 8350 + 5300,
    credit: 0,
  },
  {
    code: "MD",
    name: "Maryland",
    brackets: [
      [0, 2],
      [1000, 3],
      [2000, 4],
      [3000, 4.75],
      [100000, 5],
      [125000, 5.25],
      [150000, 5.5],
      [250000, 5.75],
      [500000, 6.25],
      [1000000, 6.5],
    ],
    deduction: 3350 + 3200,
    credit: 0,
    local: MARYLAND_LOCAL,
    note: "Maryland counties also charge their own income tax (roughly 2–3%), which isn't included here.",
  },
  {
    code: "MA",
    name: "Massachusetts",
    brackets: [[0, 5], [1083150, 9]],
    deduction: 4400,
    credit: 0,
  },
  {
    code: "MI",
    name: "Michigan",
    brackets: [[0, 4.25]],
    deduction: 5900,
    credit: 0,
    local: customLocal("About 22 Michigan cities, like Detroit, charge roughly 1%–2.5% (usually half that if you work there but live elsewhere)."),
  },
  {
    code: "MN",
    name: "Minnesota",
    brackets: [[0, 5.35], [33310, 6.8], [109430, 7.85], [203150, 9.85]],
    deduction: 15300,
    credit: 0,
    bonusWithholdingRatePct: 6.25,
  },
  {
    code: "MS",
    name: "Mississippi",
    brackets: [[10000, 4]],
    deduction: 2300 + 6000,
    credit: 0,
  },
  {
    code: "MO",
    name: "Missouri",
    brackets: [
      [1348, 2],
      [2696, 2.5],
      [4044, 3],
      [5392, 3.5],
      [6740, 4],
      [8088, 4.5],
      [9436, 4.7],
    ],
    deduction: 16100,
    credit: 0,
    local: customLocal("Kansas City and St. Louis each charge 1% on wages."),
  },
  {
    code: "MT",
    name: "Montana",
    brackets: [[0, 4.7], [47500, 5.65]],
    deduction: 16100,
    credit: 0,
  },
  {
    code: "NE",
    name: "Nebraska",
    brackets: [[0, 2.46], [4130, 3.51], [24760, 4.55]],
    deduction: 8850,
    credit: 176,
  },
  none("NV", "Nevada"),
  none("NH", "New Hampshire"),
  {
    code: "NJ",
    name: "New Jersey",
    brackets: [
      [0, 1.4],
      [20000, 1.75],
      [35000, 3.5],
      [40000, 5.53],
      [75000, 6.37],
      [500000, 8.97],
      [1000000, 10.75],
    ],
    deduction: 1000,
    credit: 0,
    taxesHsaContributions: true,
    note: "New Jersey excludes 401(k) contributions from taxable pay but not 403(b) contributions, so a 403(b) would make your state tax a bit higher than shown.",
  },
  {
    code: "NM",
    name: "New Mexico",
    brackets: [
      [0, 1.5],
      [5500, 3.2],
      [16500, 4.3],
      [33500, 4.7],
      [66500, 4.9],
      [210000, 5.9],
    ],
    deduction: 16100,
    credit: 0,
  },
  {
    code: "NY",
    name: "New York",
    brackets: [
      [0, 3.9],
      [8500, 4.4],
      [11700, 5.15],
      [13900, 5.4],
      [80650, 5.9],
      [215400, 6.85],
      [1077550, 9.65],
      [5000000, 10.3],
      [25000000, 10.9],
    ],
    deduction: 8000,
    credit: 0,
    bonusWithholdingRatePct: 11.7,
    local: NEW_YORK_LOCAL,
    note: "New York City and Yonkers add their own local income tax, which isn't included here.",
  },
  {
    code: "NC",
    name: "North Carolina",
    brackets: [[0, 3.99]],
    deduction: 12750,
    credit: 0,
  },
  {
    code: "ND",
    name: "North Dakota",
    brackets: [[48475, 1.95], [244825, 2.5]],
    deduction: 16100,
    credit: 0,
  },
  {
    code: "OH",
    name: "Ohio",
    brackets: [[26050, 2.75]],
    deduction: 2400,
    credit: 0,
    local: customLocal("Most Ohio cities charge around 2%–2.75% on wages. Your pay stub shows yours."),
    note: "Many Ohio cities charge their own income tax (often around 2%), which isn't included here.",
  },
  {
    code: "OK",
    name: "Oklahoma",
    brackets: [[3750, 2.5], [4900, 3.5], [7200, 4.5]],
    deduction: 6350 + 1000,
    credit: 0,
  },
  {
    code: "OR",
    name: "Oregon",
    brackets: [[0, 4.75], [4550, 6.75], [11400, 8.75], [125000, 9.9]],
    deduction: 2910,
    credit: 256,
  },
  {
    code: "PA",
    name: "Pennsylvania",
    brackets: [[0, 3.07]],
    deduction: 0,
    credit: 0,
    taxesRetirementDeferrals: true,
    local: PENNSYLVANIA_LOCAL,
    note: "Pennsylvania still taxes your 401(k)/403(b) contributions at the state level, and most Pennsylvania towns add a local earned income tax (often 1% or more) that isn't included here.",
  },
  {
    code: "RI",
    name: "Rhode Island",
    brackets: [[0, 3.75], [82050, 4.75], [186450, 5.99]],
    deduction: 11200 + 5250,
    credit: 0,
  },
  {
    code: "SC",
    name: "South Carolina",
    brackets: [[3640, 3], [18230, 6]],
    deduction: 8350,
    credit: 0,
  },
  none("SD", "South Dakota"),
  none("TN", "Tennessee"),
  none("TX", "Texas"),
  {
    code: "UT",
    name: "Utah",
    brackets: [[0, 4.5]],
    deduction: 0,
    credit: 966,
  },
  {
    code: "VT",
    name: "Vermont",
    brackets: [[0, 3.35], [49400, 6.6], [119700, 7.6], [249700, 8.75]],
    deduction: 7650 + 5300,
    credit: 0,
  },
  {
    code: "VA",
    name: "Virginia",
    brackets: [[0, 2], [3000, 3], [5000, 5], [17000, 5.75]],
    deduction: 8750 + 930,
    credit: 0,
  },
  // Washington only taxes capital gains, not wages.
  none("WA", "Washington"),
  {
    code: "WV",
    name: "West Virginia",
    brackets: [
      [0, 2.22],
      [10000, 2.96],
      [25000, 3.33],
      [40000, 4.44],
      [60000, 4.82],
    ],
    deduction: 2000,
    credit: 0,
  },
  {
    code: "WI",
    name: "Wisconsin",
    brackets: [[0, 3.5], [15110, 4.4], [51950, 5.3], [332720, 7.65]],
    deduction: 13960 + 700,
    credit: 0,
  },
  none("WY", "Wyoming"),
];

export const STATES = [...RULES].sort((a, b) => a.name.localeCompare(b.name));

const BY_CODE = new Map(STATES.map((s) => [s.code, s]));

export function getState(code: string) {
  return BY_CODE.get(code);
}

export function stateIncomeTax(code: string, taxableWages: number) {
  const rule = BY_CODE.get(code);
  if (!rule || rule.brackets.length === 0) return 0;

  const taxable = Math.max(taxableWages - rule.deduction, 0);
  return Math.max(bracketTax(rule.brackets, taxable) - rule.credit, 0);
}

// Yearly city/county income tax for the person's answer to the state's local
// question ("" = not answered). `wages` is gross pay (what wage-based local
// taxes use); `stateWages` is pay after the deductions the state allows (what
// Maryland counties and NYC start from).
export function localIncomeTax(
  stateCode: string,
  localId: string,
  customRatePct: number,
  wages: number,
  stateWages: number,
) {
  const state = BY_CODE.get(stateCode);
  const option = state?.local?.options.find((o) => o.id === localId);
  if (!state || !option) return { tax: 0, name: undefined };

  const rate = Number.isFinite(customRatePct)
    ? Math.min(Math.max(customRatePct, 0), 20)
    : 0;
  const brackets: Bracket[] = option.custom ? [[0, rate]] : option.brackets;
  const base =
    option.base === "stateTaxable"
      ? Math.max(stateWages - state.deduction, 0)
      : wages;
  const tax =
    bracketTax(brackets, base) +
    ((option.pctOfStateTax ?? 0) / 100) * stateIncomeTax(stateCode, stateWages);
  return {
    tax,
    // Short name for result rows; undefined when the person typed their own rate.
    name: option.custom ? undefined : (option.name ?? option.label),
  };
}

// Tax on `taxable` using [income over, marginal rate %] brackets.
export function bracketTax(brackets: Bracket[], taxable: number) {
  let tax = 0;
  brackets.forEach(([over, ratePct], i) => {
    const next = brackets[i + 1]?.[0] ?? Infinity;
    if (taxable > over) tax += (Math.min(taxable, next) - over) * (ratePct / 100);
  });
  return tax;
}

export function describeState(rule: StateTaxRule) {
  if (rule.brackets.length === 0) return "doesn't tax wages";
  const rates = rule.brackets.map(([, r]) => r).filter((r) => r > 0);
  if (rule.brackets.length === 1) return `charges a flat ${rates[0]}% rate`;
  return `uses graduated rates from ${rates[0]}% up to ${rates[rates.length - 1]}%`;
}
