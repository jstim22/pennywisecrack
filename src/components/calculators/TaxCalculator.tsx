"use client";

import { useMemo, useState } from "react";
import NumberField from "./NumberField";
import Disclosure from "./Disclosure";
import Segmented from "./Segmented";
import StateSelect from "./StateSelect";
import LocalSelect from "./LocalSelect";
import TaxRateChart from "./TaxRateChart";
import { dollars, pct, rate1 } from "@/lib/format";
import {
  ADDITIONAL_MEDICARE_THRESHOLD,
  SE_EARNINGS_FACTOR,
  SEP_LIMIT,
  estimateIncomeTax,
  taxRateCurve,
} from "@/lib/incomeTax";
import {
  HSA_LIMIT_FAMILY,
  RETIREMENT_DEFERRAL_LIMIT,
  SOCIAL_SECURITY_WAGE_BASE,
  STANDARD_DEDUCTION,
  TAX_YEAR,
} from "@/lib/paycheckTax";
import { getState } from "@/lib/stateTax";

// Slices of "where your income goes". Taxes use the validated reference
// palette (orange, aqua, yellow, magenta, stepped for light and dark);
// what you keep uses the site's own navy / baby blue.
const SWATCH = {
  keep: "bg-navy dark:bg-baby-blue",
  savings: "bg-foreground/35",
  federal: "bg-[#eb6834] dark:bg-[#d95926]",
  payroll: "bg-[#1baf7a] dark:bg-[#199e70]",
  state: "bg-[#eda100] dark:bg-[#c98500]",
  local: "bg-[#e87ba4] dark:bg-[#d55181]",
  selfEmployment: "bg-[#4a3aa7] dark:bg-[#9085e9]",
};

const CHART_RANGES = [
  { value: "100000", label: "$100k" },
  { value: "250000", label: "$250k" },
  { value: "500000", label: "$500k" },
  { value: "1000000", label: "$1M" },
];

export default function TaxCalculator() {
  const [wages, setWages] = useState(60_000);
  const [stateCode, setStateCode] = useState("");
  const [localId, setLocalId] = useState("");
  const [localCustomRate, setLocalCustomRate] = useState(0);
  const [otherIncome, setOtherIncome] = useState(0);
  const [retirement, setRetirement] = useState(0);
  const [hsa, setHsa] = useState(0);
  const [otherPreTax, setOtherPreTax] = useState(0);
  const [itemized, setItemized] = useState(0);
  const [credits, setCredits] = useState(0);
  const [selfEmployment, setSelfEmployment] = useState(0);
  const [businessExpenses, setBusinessExpenses] = useState(0);
  const [seHealth, setSeHealth] = useState(0);
  const [sep, setSep] = useState(0);
  const [chartRange, setChartRange] = useState<string | null>(null);

  function handleStateChange(code: string) {
    setStateCode(code);
    setLocalId("");
    setLocalCustomRate(0);
  }

  const inputs = {
    wages,
    otherIncome,
    stateCode,
    localId,
    localCustomRatePct: localCustomRate,
    traditionalRetirement: retirement,
    hsa,
    otherPreTax,
    itemizedDeductions: itemized,
    credits,
    selfEmployment,
    businessExpenses,
    selfEmployedHealthInsurance: seHealth,
    sepContribution: sep,
  };
  const e = estimateIncomeTax(inputs);
  const isSe = e.basis === "selfEmployment";
  const hasSe = e.selfEmployed.netProfit > 0;
  const payNoun = isSe ? "1099 income" : "pay";
  // The pay level where Social Security tax stops: $184,500 of wages, or the
  // profit that produces $184,500 of self-employment earnings.
  const capPay = isSe
    ? Math.max(SOCIAL_SECURITY_WAGE_BASE - wages, 0) / SE_EARNINGS_FACTOR
    : SOCIAL_SECURITY_WAGE_BASE;
  const stateRule = getState(stateCode);

  // Pick a chart range that shows about 25% more pay than yours, unless the
  // person chose one.
  const chartPay = isSe ? selfEmployment : wages;
  const autoRange =
    CHART_RANGES.find((r) => Number(r.value) >= chartPay * 1.25) ??
    CHART_RANGES[CHART_RANGES.length - 1];
  const rangeValue = chartRange ?? autoRange.value;
  const maxWages = Number(rangeValue);

  const curve = useMemo(
    () => taxRateCurve(inputs, maxWages, 100),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [maxWages, wages, selfEmployment, businessExpenses, seHealth, sep, otherIncome, stateCode, localId, localCustomRate, retirement, hsa, otherPreTax, itemized, credits],
  );

  const parts = [
    { key: "keep", label: "You keep", amount: e.takeHome, swatch: SWATCH.keep },
    {
      key: "savings",
      label: "Savings & benefits",
      detail: "401(k), HSA, and other pre-tax deductions",
      amount: e.savings,
      swatch: SWATCH.savings,
    },
    {
      key: "federal",
      label: "Federal income tax",
      amount: e.federal,
      swatch: SWATCH.federal,
    },
    {
      key: "payroll",
      label: "Social Security & Medicare",
      detail: [
        `Social Security ${dollars(e.socialSecurity)}`,
        `Medicare ${dollars(e.medicare + e.additionalMedicare)}`,
      ].join(" · "),
      amount: e.payroll,
      swatch: SWATCH.payroll,
    },
    {
      key: "selfEmployment",
      label: "Self-employment tax (1099)",
      detail: `Social Security ${dollars(e.selfEmployed.socialSecurity)} · Medicare ${dollars(e.selfEmployed.medicare)}`,
      amount: e.selfEmploymentTax,
      swatch: SWATCH.selfEmployment,
    },
    {
      key: "state",
      label: stateRule ? `State income tax (${stateRule.code})` : "State income tax",
      detail: !stateRule ? "Pick your state to include it" : undefined,
      amount: e.state,
      swatch: SWATCH.state,
    },
    {
      key: "local",
      label: e.localName ? `Local income tax (${e.localName})` : "Local income tax",
      amount: e.local,
      swatch: SWATCH.local,
      optional: true,
    },
  ].filter(
    (p) =>
      p.amount > 0.5 ||
      ["keep", "federal", "state"].includes(p.key) ||
      (p.key === "payroll" && !isSe),
  );

  const barParts = parts.filter((p) => p.amount > 0.5);
  const share = (amount: number) => (e.income > 0 ? (amount / e.income) * 100 : 0);

  const notes: string[] = [];
  if (e.hasIncome && e.federalTaxable === 0) {
    notes.push(
      `Your income is under your deduction (${dollars(e.deduction)}), so you likely owe no federal income tax. Social Security and Medicare still apply to your pay.`,
    );
  }
  if (e.usedItemized) {
    notes.push(
      `Your itemized deductions (${dollars(itemized)}) are bigger than the standard deduction (${dollars(STANDARD_DEDUCTION)}), so we used them for federal tax.`,
    );
  }
  if (e.creditsUnused > 0.5) {
    notes.push(
      `Your credits are more than your federal tax, so ${dollars(e.creditsUnused)} of them goes unused here. Some credits are refundable, so a tax preparer can tell you if you'd get that back.`,
    );
  }
  if (e.retirementCapped) {
    notes.push(
      `The ${TAX_YEAR} limit for 401(k)/403(b) contributions is ${dollars(RETIREMENT_DEFERRAL_LIMIT)}, so we counted that much.`,
    );
  }
  if (e.hsaCapped) {
    notes.push(
      `The ${TAX_YEAR} HSA limit is ${dollars(HSA_LIMIT_FAMILY)} (family coverage), so we counted that much.`,
    );
  }
  if (hasSe) {
    notes.push(
      `Half of your self-employment tax (${dollars(e.selfEmployed.halfDeduction)}) comes off your income before income tax.` +
        (e.qbiDeduction > 0.5
          ? ` The 20% business income (QBI) deduction takes another ${dollars(e.qbiDeduction)} off your taxable income.`
          : ""),
    );
  }
  if (e.selfEmployed.sepCapped) {
    notes.push(
      `A SEP-IRA can take up to 20% of your profit (after half of self-employment tax), and no more than ${dollars(SEP_LIMIT)}, so we counted ${dollars(e.selfEmployed.sepDeduction)}. A solo 401(k) can allow more.`,
    );
  }
  if (e.wages > SOCIAL_SECURITY_WAGE_BASE) {
    notes.push(
      `Social Security tax stops at ${dollars(SOCIAL_SECURITY_WAGE_BASE)} of pay, so your next dollar is taxed less than the ones before it.`,
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <NumberField
            id="wages"
            label="Your yearly pay from a job (W-2, before taxes)"
            value={wages}
            onChange={setWages}
            prefix="$"
          />

          <div>
            <NumberField
              id="selfEmployment"
              label="Your 1099 income (per year, before expenses)"
              value={selfEmployment}
              onChange={setSelfEmployment}
              prefix="$"
            />
            <p className="mt-1.5 text-xs text-foreground/50">
              Freelance, gig, or contract work. You pay both halves of Social
              Security and Medicare on it (self-employment tax), and no tax is
              taken out for you.
            </p>
          </div>

          <StateSelect value={stateCode} onChange={handleStateChange} hideNote />
          <LocalSelect
            stateCode={stateCode}
            localId={localId}
            onLocalChange={setLocalId}
            customRate={localCustomRate}
            onCustomRateChange={setLocalCustomRate}
          />

          <Disclosure title="Advanced settings">
            {selfEmployment > 0 && (
              <>
                <NumberField
                  id="businessExpenses"
                  label="Business expenses (per year)"
                  value={businessExpenses}
                  onChange={setBusinessExpenses}
                  prefix="$"
                />
                <p className="-mt-2 text-xs text-foreground/50">
                  Supplies, software, mileage, a home office — costs of doing
                  the work. Only your profit is taxed.
                </p>

                <NumberField
                  id="seHealth"
                  label="Health insurance you pay for yourself (per year)"
                  value={seHealth}
                  onChange={setSeHealth}
                  prefix="$"
                />
                <p className="-mt-2 text-xs text-foreground/50">
                  If you&apos;re self-employed and not covered by a job&apos;s
                  plan, premiums can come off your income.
                </p>

                <NumberField
                  id="sep"
                  label="SEP-IRA contribution (per year)"
                  value={sep}
                  onChange={setSep}
                  prefix="$"
                />
                <p className="-mt-2 text-xs text-foreground/50">
                  A retirement account for the self-employed. It lowers your
                  income tax today.
                </p>
              </>
            )}
            <NumberField
              id="otherIncome"
              label="Other taxable income (per year)"
              value={otherIncome}
              onChange={setOtherIncome}
              prefix="$"
            />
            <p className="-mt-2 text-xs text-foreground/50">
              Like interest or dividends. It&apos;s taxed like pay, but without
              Social Security and Medicare.
            </p>

            <NumberField
              id="retirement"
              label="Traditional 401(k)/403(b) contributions (per year)"
              value={retirement}
              onChange={setRetirement}
              prefix="$"
            />
            <p className="-mt-2 text-xs text-foreground/50">
              Comes out before income tax, so it lowers your bill today. The{" "}
              {TAX_YEAR} limit is {dollars(RETIREMENT_DEFERRAL_LIMIT)}.
            </p>

            <NumberField
              id="hsa"
              label="HSA contributions (per year)"
              value={hsa}
              onChange={setHsa}
              prefix="$"
            />
            <p className="-mt-2 text-xs text-foreground/50">
              Comes out before income tax and Social Security and Medicare tax.
              The {TAX_YEAR} limits are $4,400 (self) and{" "}
              {dollars(HSA_LIMIT_FAMILY)} (family).
            </p>

            <NumberField
              id="otherPreTax"
              label="Other pre-tax deductions (per year)"
              value={otherPreTax}
              onChange={setOtherPreTax}
              prefix="$"
            />
            <p className="-mt-2 text-xs text-foreground/50">
              Like health insurance premiums from your paycheck, an FSA, or
              commuter benefits.
            </p>

            <NumberField
              id="itemized"
              label="Itemized deductions (per year)"
              value={itemized}
              onChange={setItemized}
              prefix="$"
            />
            <p className="-mt-2 text-xs text-foreground/50">
              Leave at $0 to use the standard deduction (
              {dollars(STANDARD_DEDUCTION)}). If yours add up to more, we&apos;ll
              use them for federal tax.
            </p>

            <NumberField
              id="credits"
              label="Tax credits you expect (per year)"
              value={credits}
              onChange={setCredits}
              prefix="$"
            />
            <p className="-mt-2 text-xs text-foreground/50">
              Credits like the education or child tax credit come straight off
              your federal tax bill.
            </p>
          </Disclosure>
        </div>

        <div className="min-w-0 rounded-lg border border-border bg-surface-hover p-6">
          {!e.hasIncome ? (
            <p className="text-sm text-foreground/60">
              Enter your yearly pay or 1099 income to see what you might owe in taxes.
            </p>
          ) : (
            <>
              <p className="text-sm text-foreground/60">
                For {TAX_YEAR}, you could pay about
              </p>
              <p className="mt-1 text-3xl font-semibold text-navy dark:text-baby-blue">
                {dollars(e.total)}
              </p>
              <p className="mt-1 text-sm text-foreground/60">
                in taxes — {rate1(e.totalRate)} of your{" "}
                {dollars(e.income)} income. You&apos;d keep about{" "}
                {dollars(e.takeHome)} ({dollars(e.takeHome / 12)} a month).
              </p>

              <div
                role="img"
                aria-label={`Where your income goes: ${barParts
                  .map((p) => `${p.label} ${rate1(share(p.amount) / 100)}`)
                  .join(", ")}`}
                className="mt-5 flex h-3 gap-0.5 overflow-hidden rounded-full"
              >
                {barParts.map((p) => (
                  <div
                    key={p.key}
                    title={`${p.label}: ${dollars(p.amount)}`}
                    className={`${p.swatch} min-w-0.5`}
                    style={{ flexGrow: p.amount, flexBasis: 0 }}
                  />
                ))}
              </div>

              <ul className="mt-4 flex flex-col gap-2.5 text-sm">
                {parts.map((p) => (
                  <li key={p.key} className="flex items-start gap-3">
                    <span
                      className={`mt-1 h-3 w-3 shrink-0 rounded-sm ${p.swatch}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      {p.label}
                      {p.detail && (
                        <span className="block text-xs text-foreground/50">
                          {p.detail}
                        </span>
                      )}
                    </span>
                    <span className="text-right">
                      <span className="font-medium">{dollars(p.amount)}</span>
                      <span className="block text-xs text-foreground/50">
                        {rate1(share(p.amount) / 100)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border border-border p-3">
                  <p className="text-foreground/50">Average tax rate</p>
                  <p className="font-medium">{rate1(e.totalRate)}</p>
                  <p className="mt-0.5 text-xs text-foreground/50">
                    All taxes, on all your income
                  </p>
                </div>
                <div className="rounded-md border border-navy/40 bg-navy/5 p-3 dark:border-baby-blue/40 dark:bg-baby-blue/10">
                  <p className="text-foreground/50">Next dollar</p>
                  <p className="font-medium text-navy dark:text-baby-blue">
                    {rate1(e.marginal.total)}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground/50">
                    Of each extra dollar you earn, this much goes to tax
                  </p>
                </div>
              </div>

              {hasSe && (
                <div className="mt-4 rounded-md border border-navy/40 bg-navy/5 p-3 text-sm dark:border-baby-blue/40 dark:bg-baby-blue/10">
                  <p>
                    Your 1099 income adds about{" "}
                    <span className="font-semibold">
                      {dollars(e.taxFromSelfEmployment)}
                    </span>{" "}
                    in tax a year. Nothing is withheld from it, so set aside
                    about{" "}
                    <span className="font-semibold text-navy dark:text-baby-blue">
                      {dollars(e.quarterlyEstimate)} every quarter
                    </span>{" "}
                    and pay estimated taxes in April, June, September, and
                    January.
                  </p>
                  <p className="mt-2 text-xs text-foreground/60">
                    To avoid an underpayment penalty, most people need to have
                    paid at least 90% of this year&apos;s tax, or 100% of last
                    year&apos;s (110% if last year&apos;s income was over
                    $150,000), through withholding and estimated payments.
                  </p>
                </div>
              )}

              {notes.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {notes.map((n) => (
                    <div
                      key={n}
                      className="rounded-md border border-yellow/50 bg-yellow/10 p-3 text-sm"
                    >
                      {n}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {e.hasIncome && (
        <>
          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-baby-blue">
              How your federal income tax adds up
            </h2>
            <p className="mt-1 text-sm text-foreground/60">
              Federal tax has brackets: each slice of your income is taxed at
              its own rate, not all of it at your top rate.{" "}
              {e.federalIncome > 0 && (
                <>
                  Your {dollars(e.federalIncome)} of income, minus a{" "}
                  {dollars(e.deduction)}{" "}
                  {e.usedItemized ? "itemized" : "standard"} deduction
                  {e.qbiDeduction > 0.5
                    ? ` and a ${dollars(e.qbiDeduction)} business income (QBI) deduction`
                    : ""}
                  , leaves{" "}
                  <span className="font-medium text-foreground">
                    {dollars(e.federalTaxable)}
                  </span>{" "}
                  to be taxed.
                </>
              )}
            </p>

            <div className="mt-4 overflow-hidden rounded-md border border-border text-sm">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-border px-3 py-2 text-xs font-medium text-foreground/50">
                <span>Bracket</span>
                <span className="w-24 text-right">Your income in it</span>
                <span className="w-16 text-right">Tax</span>
              </div>
              {e.brackets.map((b) => {
                const active = b.inBracket > 0;
                return (
                  <div
                    key={b.rate}
                    className={
                      "grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border px-3 py-2 last:border-b-0 " +
                      (active ? "" : "text-foreground/40")
                    }
                  >
                    <span>
                      <span className="font-medium">{pct(b.rate * 100)}</span>
                      <span className="ml-2 text-xs">
                        {b.upTo === Infinity
                          ? `over ${dollars(b.from)}`
                          : `${dollars(b.from)} – ${dollars(b.upTo)}`}
                      </span>
                    </span>
                    <span className="w-24 text-right">{dollars(b.inBracket)}</span>
                    <span className="w-16 text-right">{dollars(b.tax)}</span>
                  </div>
                );
              })}
              {e.creditsUsed > 0.5 && (
                <div className="grid grid-cols-[1fr_auto] gap-3 border-t border-border px-3 py-2">
                  <span>Tax credits</span>
                  <span className="w-16 text-right">−{dollars(e.creditsUsed)}</span>
                </div>
              )}
              <div className="grid grid-cols-[1fr_auto] gap-3 border-t border-border bg-surface-hover px-3 py-2 font-medium">
                <span>Federal income tax</span>
                <span className="text-right">{dollars(e.federal)}</span>
              </div>
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-navy dark:text-baby-blue">
                  How your rate changes as you earn more
                </h2>
                <p className="mt-1 max-w-xl text-sm text-foreground/60">
                  The dots show where you are now. Hover (or use the arrow
                  keys) to explore other {isSe ? "1099 income" : "pay"} levels,
                  holding your other settings the same.
                </p>
              </div>
              <div className="w-full sm:w-64">
                <span className="text-xs font-medium text-foreground/50">
                  Show income up to
                </span>
                <Segmented
                  options={CHART_RANGES}
                  value={rangeValue}
                  onChange={setChartRange}
                  columns={4}
                />
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-border p-4">
              <TaxRateChart
                curve={curve}
                maxWages={maxWages}
                capWages={capPay}
                payNoun={payNoun}
                current={{
                  wages: isSe ? e.selfEmployed.grossReceipts : e.wages,
                  average: e.totalRate,
                  marginal: e.marginal.total,
                }}
              />
              <div className="mt-4 rounded-md border border-yellow/50 bg-yellow/10 p-3 text-sm">
                <span className="font-medium">
                  Why the next-dollar rate drops near {dollars(capPay)}:
                </span>{" "}
                {isSe ? (
                  <>
                    Social Security tax (12.4% for the self-employed)
                    only applies to the first{" "}
                    {dollars(SOCIAL_SECURITY_WAGE_BASE)} of earnings, while
                    Medicare (2.9%) keeps going. Past that point, each extra
                    dollar of profit is taxed about 11 percentage points less
                    in self-employment tax. It steps back up when an extra 0.9%
                    Medicare tax starts at{" "}
                    {dollars(ADDITIONAL_MEDICARE_THRESHOLD)} of earnings.
                  </>
                ) : (
                  <>
                    Social Security tax (6.2%) only applies to the first{" "}
                    {dollars(SOCIAL_SECURITY_WAGE_BASE)} of pay, while Medicare
                    (1.45%) keeps going. Once you pass that point, each extra
                    dollar is taxed about 6 percentage points less. It steps
                    back up at {dollars(ADDITIONAL_MEDICARE_THRESHOLD)}, when an
                    extra 0.9% Medicare tax starts.
                  </>
                )}
                {maxWages < capPay &&
                  " Choose a bigger range above to see it on the chart."}
              </div>
            </div>
          </section>

          <p className="text-xs text-foreground/50">
            An estimate, not tax advice. Federal figures use {TAX_YEAR} rules
            for a single filer with wages, simple other income, and 1099
            income with no employees. State
            figures use {TAX_YEAR} rates and standard deductions for a single
            filer, and treat 1099 profit like other income. This doesn&apos;t
            include capital gains, the alternative minimum tax, most
            income-based phase-outs, or
            state payroll programs like disability insurance. City and county
            tax is included only where you answer the question above. Your real
            bill depends on your whole situation, so check with a tax preparer
            or the IRS.
          </p>
        </>
      )}
    </div>
  );
}
