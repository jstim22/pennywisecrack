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
| `lib/sinkingFund.test.ts` | Time to goal for each saving frequency, high-yield savings compounding (APY, monthly), equivalents, duration wording |
| `lib/growth.test.ts` | The shared growth engine behind Retirement and Compound Interest: pinned numbers for both calculators' defaults and each advanced setting, lump sums, glide path, Monte Carlo ordering |
| `components/calculators.test.tsx` | Each calculator rendered like a visitor sees it: default numbers, key interactions (state and county pickers, frequency switch, lump sums, customize by year), and messages for edge cases |
| `site.test.ts` | Every calculator route has a page and a tile on the calculators page |

The `check("name", actual, expected)` helper in `helpers.ts` compares numbers to within half a cent unless a looser tolerance is passed.

## When a test fails

1. **You changed a rule on purpose** (a new tax year, a new bracket, a new default). Work out the right number by hand or from the official source, then update the expected value. Don't just paste in the new output.
2. **You didn't mean to change any numbers.** The failing test names the check and prints both values. Something drifted.

Yearly update checklist: `TAX_YEAR`, standard deduction, brackets, Social Security wage base, and the 401(k)/HSA limits in `src/lib/paycheckTax.ts`; state tables in `src/lib/stateTax.ts`; the flat bonus rates (CA, NY, MN). Then update the expected values in the tax tests.

## Not automated (check by hand after big changes)

- Layout at phone width (375px): no sideways scrolling, controls not cut off.
- Dark mode and the accessibility widget (text size, contrast, motion settings).
- The retirement chart's labels and milestones, and the compound-interest bars.
- The blog and the homepage "recent posts" ribbon.
- Target dates ("around <date>") on the Sinking Fund page, since they depend on today's date.

## Notes

- Monte Carlo results are random, so those tests only check ordering and a wide range, never exact values.
- The tax engines are estimates for a single filer with no other income. The tests confirm the code does what the rules say, not that the rules match your own tax situation.
