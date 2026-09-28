# Tests

Run everything with:

```bash
npm test          # one run
npm run test:watch  # re-runs as you edit
```

The suite uses [Vitest](https://vitest.dev) with React Testing Library (see `vitest.config.mts`). It takes a couple of seconds.

## What's covered

| File | What it protects |
| --- | --- |
| `lib/paycheckTax.test.ts` | Federal brackets, FICA, 401(k)/HSA/insurance treatment, hourly/overtime/tips, and a **real pay stub** (OASDI $168.08, Medicare $39.31, federal $256.80) |
| `lib/bonusTax.test.ts` | Flat 22% and combined-paycheck withholding, the $1M rule, Social Security cap, Additional Medicare, 401(k) on a bonus, state override, Maryland counties, NYC / Yonkers, Philadelphia, enter-your-own local rates |
| `lib/stateTax.test.ts` | Sanity checks across **all 51 states**: tax never negative or falling as income rises, no-tax states are zero, every city/county option has a rate, and the bonus estimator stays finite for every state + local option |
| `lib/incomeTax.test.ts` | The yearly income-tax engine, including **1099 / self-employment** (SE tax, half-deduction, the shared Social Security base, QBI with its phase-out and $400 minimum, SEP-IRA and health-insurance deductions, quarterly estimates): hand-computed federal/FICA/state/local tax, bracket breakdown, 401(k)/HSA/itemized/credits, the Social Security cap and Additional Medicare, marginal rates and the rate curve, and that it **matches the paycheck estimator** (including the real pay stub) across six scenarios |
| `lib/debtPayoff.test.ts` | Snowball vs avalanche vs minimums-only, month by month: a hand-worked single debt, which debt gets the extra, the time horizon (balance/interest at N months, the extra needed to finish in time), rolling over freed-up minimums, and 100 random setups checking avalanche never pays more interest than snowball |
| `lib/studentLoans.test.ts` | Loan payment formula, the Tiered Standard terms by balance, every Repayment Assistance Plan income band ($10 minimum, $50 per dependent), interest building up before repayment, RAP's interest waiver and 30-year forgiveness, income raises, extra payments, the federal **autopay discount** (checked against a step-by-step loan, incl. the date window and private loans), and comparing plans |
| `lib/mortgage.test.ts` | The loan payment formula and amortization schedule, state property-tax guesses, the PMI guess grid (never cheaper with worse credit or less down), when PMI ends, escrow (tax + insurance), extra payments, and affordability ratios |
| `lib/carLoan.test.ts` | Amount financed (tax, fees, trade-in), the state sales-tax guess and override, payment and terms (6 to 84 months), the over-4-years flag (matches the 20/4/10 guideline's own 48-month cap exactly), depreciation, months underwater (checked step by step), and the 20/4/10 rule |
| `lib/vehicleSalesTax.test.ts` | Car sales tax rate by state (all 50 states have a rate, including the 0% ones), the national-average fallback, and DC as a special case (excise tax, not a flat rate) |
| `lib/opportunityCost.test.ts` | What money spent now grows to by retirement (closed-form checks), recurring costs, today's-dollars, hours of work, and the "is it worth it" break-even |
| `lib/budget.test.ts` | The bucket budget (25/25/25/25 and 50/30/20): dollars per month, week and day, what you can spend vs. save, custom splits that don't add to 100%, tracking what's left, and the example sub-splits |
| `lib/netWorth.test.ts` | Net worth math and the age comparison, **plus the spreadsheet export**: our own zip and .xlsx writers, read back by an independent reader in the tests (CRCs, sheet XML, live SUM formulas, cached values, escaping, CSV formula-safety) |
| `lib/sinkingFund.test.ts` | Time to goal for each saving frequency, high-yield savings compounding (APY, monthly), equivalents, duration wording |
| `lib/growth.test.ts` | The shared growth engine behind Retirement and Compound Interest: pinned numbers for both calculators' defaults and each advanced setting, lump sums, glide path, Monte Carlo ordering |
| `components/calculators.test.tsx` | Each calculator rendered like a visitor sees it (all thirteen): default numbers, key interactions (state and county pickers, frequency switch, lump sums, customize by year), and messages for edge cases |
| `site.test.ts` | Every calculator route has a page and a tile on the calculators page |

The `check("name", actual, expected)` helper in `helpers.ts` compares numbers to within half a cent unless a looser tolerance is passed.

## When a test fails

1. **You changed a rule on purpose** (a new tax year, a new bracket, a new default). Work out the right number by hand or from the official source, then update the expected value. Don't just paste in the new output.
2. **You didn't mean to change any numbers.** The failing test names the check and prints both values. Something drifted.

Yearly update checklist: `TAX_YEAR`, standard deduction, brackets, Social Security wage base, and the 401(k)/HSA limits in `src/lib/paycheckTax.ts`; state tables in `src/lib/stateTax.ts`; the flat bonus rates (CA, NY, MN). Then update the expected values in the tax tests.

## Spreadsheet export

The .xlsx file is built by hand (`src/lib/xlsx.ts`, `zip.ts`) so the site needs no extra packages. It was also opened with Python's `openpyxl`, an independent reader, to confirm the formulas, cached values, number formats, and column widths. It has **not** been opened in Excel itself, so after changing the writer, open a downloaded file in Excel and Numbers or Google Sheets and look for a "repair" prompt.

## Not automated (check by hand after big changes)

- Layout at phone width (375px): no sideways scrolling, controls not cut off.
- Dark mode and the accessibility widget (text size, contrast, motion settings).
- The retirement chart's labels and milestones, the compound-interest bars, and the income-tax, debt-payoff, student-loan, mortgage, and car-loan charts (hover tooltip, colors in light and dark).
- The blog and the homepage "recent posts" ribbon.
- Target dates ("around <date>") on the Sinking Fund page, since they depend on today's date. (The student-loan autopay tests pin the date themselves.)

## Notes

- Monte Carlo results are random, so those tests only check ordering and a wide range, never exact values.
- The tax engines are estimates for a single filer with no other income. The tests confirm the code does what the rules say, not that the rules match your own tax situation.
