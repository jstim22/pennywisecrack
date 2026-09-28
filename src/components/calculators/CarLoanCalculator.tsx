"use client";

import { useState } from "react";
import NumberField from "./NumberField";
import Disclosure from "./Disclosure";
import Segmented from "./Segmented";
import StateSelect from "./StateSelect";
import BreakdownList from "./BreakdownList";
import DebtBalanceChart from "./DebtBalanceChart";
import { describeMonths } from "@/lib/debtPayoff";
import { dollars, rate1 } from "@/lib/format";
import {
  RECOMMENDED_MAX_TERM_MONTHS,
  SHORT_TERM_PRESETS,
  estimateCarLoan,
  type CarCondition,
} from "@/lib/carLoan";
import { isSpecialVehicleTaxState } from "@/lib/vehicleSalesTax";
import { getState } from "@/lib/stateTax";

const SWATCH = {
  car: "bg-navy dark:bg-baby-blue",
  tax: "bg-[#eb6834] dark:bg-[#d95926]",
  fees: "bg-[#e87ba4] dark:bg-[#d55181]",
  interest: "bg-[#eda100] dark:bg-[#c98500]",
};

// Quick-pick loan lengths, all under 36 months, plus a free-form option for
// anything else — including the longer, suboptimal terms.
const TERM_MODES: { value: string; label: string }[] = [
  ...SHORT_TERM_PRESETS.map((t) => ({ value: String(t), label: `${t} mo` })),
  { value: "custom", label: "Custom" },
];
const CONDITIONS: { value: CarCondition; label: string }[] = [
  { value: "new", label: "New" },
  { value: "used", label: "Used" },
];

function pctString(n: number) {
  return `${Number(n.toFixed(2))}%`;
}

function Check({ ok, children }: { ok: boolean | null; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span
        aria-hidden="true"
        className={
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold " +
          (ok === null
            ? "bg-foreground/10 text-foreground/50"
            : ok
              ? "bg-[#1baf7a] text-white dark:bg-[#199e70]"
              : "bg-[#eb6834] text-white dark:bg-[#d95926]")
        }
      >
        {ok === null ? "–" : ok ? "✓" : "!"}
      </span>
      <span className="text-foreground/70">
        <span className="sr-only">
          {ok === null ? "Not checked: " : ok ? "Meets it: " : "Doesn't meet it: "}
        </span>
        {children}
      </span>
    </li>
  );
}

export default function CarLoanCalculator() {
  const [price, setPrice] = useState(30_000);
  const [down, setDown] = useState(4_000);
  const [tradeIn, setTradeIn] = useState(0);
  const [apr, setApr] = useState(7);
  // "6" | "12" | "24" | "custom" — the quick-pick buttons plus a free-form term.
  const [termMode, setTermMode] = useState("custom");
  const [customTerm, setCustomTerm] = useState(60);
  const [condition, setCondition] = useState<CarCondition>("new");
  const [stateCode, setStateCode] = useState("");
  const [taxOverride, setTaxOverride] = useState<number | null>(null);
  const [taxMinusTrade, setTaxMinusTrade] = useState(true);
  const [fees, setFees] = useState(500);
  const [extra, setExtra] = useState(0);
  const [insurance, setInsurance] = useState(0);
  const [upkeep, setUpkeep] = useState(0);
  const [income, setIncome] = useState(0);

  const termMonths = termMode === "custom" ? customTerm : Number(termMode);

  function selectTermMode(mode: string) {
    // Keep the same length when switching into "Custom" without editing it.
    if (mode === "custom" && termMode !== "custom") setCustomTerm(termMonths);
    setTermMode(mode);
  }
  function selectTerm(months: number) {
    if ((SHORT_TERM_PRESETS as number[]).includes(months)) {
      setTermMode(String(months));
    } else {
      setCustomTerm(months);
      setTermMode("custom");
    }
  }

  const inputs = {
    price,
    downPayment: down,
    tradeIn,
    stateCode,
    salesTaxRatePct: taxOverride,
    taxOnPriceMinusTrade: taxMinusTrade,
    fees,
    aprPct: apr,
    termMonths,
    extraMonthly: extra,
    condition,
    monthlyInsurance: insurance,
    monthlyUpkeep: upkeep,
    income,
  };
  const c = estimateCarLoan(inputs);
  const guess = estimateCarLoan({ ...inputs, salesTaxRatePct: null });
  const stateRule = getState(stateCode);
  const empty = c.price <= 0;
  const r = c.rule;

  const parts = [
    { key: "car", label: "The car", amount: c.price, swatch: SWATCH.car },
    {
      key: "tax",
      label: "Sales tax",
      detail: `${pctString(c.salesTaxRatePct)}${
        c.salesTaxRateIsGuess
          ? c.stateHasSalesTaxRate
            ? ` (${stateRule?.name} average)`
            : " (national average)"
          : ""
      }`,
      amount: c.salesTax,
      swatch: SWATCH.tax,
    },
    { key: "fees", label: "Title, registration & dealer fees", amount: c.fees, swatch: SWATCH.fees },
    { key: "interest", label: "Interest", amount: c.totalInterest, swatch: SWATCH.interest },
  ];

  const chartMonths = Math.max(c.payoffMonths, 12);

  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <NumberField id="price" label="Price of the car" value={price} onChange={setPrice} prefix="$" />
          <NumberField id="down" label="Down payment" value={down} onChange={setDown} prefix="$" />
          <NumberField id="tradeIn" label="Trade-in value" value={tradeIn} onChange={setTradeIn} prefix="$" />
          <NumberField id="apr" label="Interest rate (APR)" value={apr} onChange={setApr} suffix="%" step={0.1} />

          <div>
            <span className="text-sm font-medium text-foreground/80">
              Loan length
            </span>
            <Segmented options={TERM_MODES} value={termMode} onChange={selectTermMode} columns={4} />
            {termMode === "custom" && (
              <div className="mt-2">
                <NumberField
                  id="customTerm"
                  label="Length in months"
                  value={customTerm}
                  onChange={setCustomTerm}
                  suffix="mo"
                />
              </div>
            )}
            <p className="mt-1.5 text-xs text-foreground/50">
              Shorter loans usually cost less overall.{" "}
              {termMonths > RECOMMENDED_MAX_TERM_MONTHS
                ? "Yours is longer than the 20/4/10 guideline's 4 years — see why that's worth a second look below."
                : "4 years or less keeps you in good shape, per the 20/4/10 guideline below."}
            </p>
          </div>

          <div>
            <span className="text-sm font-medium text-foreground/80">
              New or used?
            </span>
            <Segmented options={CONDITIONS} value={condition} onChange={setCondition} />
            <p className="mt-1.5 text-xs text-foreground/50">
              Used to estimate how fast the car loses value.
            </p>
          </div>

          <StateSelect
            value={stateCode}
            onChange={setStateCode}
            hideNote
            helper="Used to guess your sales tax rate. You can change the guess in the advanced settings."
          />

          <Disclosure title="Advanced settings">
            <div>
              <NumberField
                id="taxPct"
                label="Sales tax rate (%)"
                value={taxOverride ?? guess.salesTaxRatePct}
                onChange={setTaxOverride}
                suffix="%"
                step={0.05}
              />
              <p className="mt-1.5 text-xs text-foreground/50">
                {taxOverride === null
                  ? guess.stateHasSalesTaxRate
                    ? `The average rate for ${stateRule?.name}. Your county or city may add more.`
                    : stateCode
                      ? `We don't have a simple rate for ${stateRule?.name} (see below), so this is the national average.`
                      : "Pick your state above to guess this, or type your own rate."
                  : "You changed this."}
                {taxOverride !== null && (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={() => setTaxOverride(null)}
                      className="underline hover:text-foreground"
                    >
                      Reset to the guess ({pctString(guess.salesTaxRatePct)})
                    </button>
                  </>
                )}
              </p>
              {isSpecialVehicleTaxState(stateCode) && (
                <p className="mt-1.5 text-xs text-foreground/50">
                  {stateRule?.name} doesn&apos;t charge an ordinary sales tax
                  on cars — it charges an excise tax based on the
                  vehicle&apos;s weight and fuel economy, so this is just a
                  placeholder. Check dmv.dc.gov for the real rate.
                </p>
              )}
            </div>
            <label className="flex items-start gap-2 text-xs text-foreground/70">
              <input
                type="checkbox"
                checked={taxMinusTrade}
                onChange={(e) => setTaxMinusTrade(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-navy dark:accent-baby-blue"
              />
              <span>
                Sales tax is charged on the price minus my trade-in (most
                states do this)
              </span>
            </label>
            <NumberField
              id="fees"
              label="Title, registration, and dealer fees"
              value={fees}
              onChange={setFees}
              prefix="$"
            />
            <NumberField
              id="extra"
              label="Extra you'll pay toward the loan each month"
              value={extra}
              onChange={setExtra}
              prefix="$"
            />
            <div className="border-t border-border pt-4">
              <p className="text-sm font-semibold text-foreground/80">
                Costs beyond the loan
              </p>
              <p className="mt-1 text-xs text-foreground/50">
                Used for the &ldquo;10% of income&rdquo; check below.
              </p>
            </div>
            <NumberField
              id="insurance"
              label="Car insurance (per month)"
              value={insurance}
              onChange={setInsurance}
              prefix="$"
            />
            <NumberField
              id="upkeep"
              label="Gas and maintenance (per month)"
              value={upkeep}
              onChange={setUpkeep}
              prefix="$"
            />
            <NumberField
              id="income"
              label="Your yearly income (optional)"
              value={income}
              onChange={setIncome}
              prefix="$"
            />
          </Disclosure>
        </div>

        <div className="min-w-0 rounded-lg border border-border bg-surface-hover p-6 sm:sticky sm:top-6 sm:self-start">
          {empty ? (
            <p className="text-sm text-foreground/60">
              Enter the price of the car to see your payment.
            </p>
          ) : c.financed <= 0 ? (
            <>
              <p className="text-lg font-medium">You wouldn&apos;t need a loan.</p>
              <p className="mt-1 text-sm text-foreground/60">
                Your down payment and trade-in cover the {dollars(c.outTheDoor)}{" "}
                out-the-door price (price, tax, and fees).
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-foreground/60">Your monthly payment</p>
              <p className="mt-1 text-3xl font-semibold text-navy dark:text-baby-blue">
                {dollars(c.payment)}
              </p>
              <p className="mt-1 text-sm text-foreground/60">
                for {describeMonths(c.termMonths)}
                {extra > 0 ? `, plus your ${dollars(extra)} extra` : ""}
              </p>

              <div className="mt-5">
                <p className="mb-2 text-xs font-medium text-foreground/50">
                  What the car really costs you
                </p>
                <BreakdownList parts={parts} summary="What the car really costs" />
                <p className="mt-3 flex items-baseline justify-between text-sm">
                  <span className="text-foreground/60">Total cost</span>
                  <span className="text-lg font-semibold">{dollars(c.totalCost)}</span>
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border border-border p-3">
                  <p className="text-foreground/50">You borrow</p>
                  <p className="font-medium">{dollars(c.financed)}</p>
                  <p className="mt-0.5 text-xs text-foreground/50">
                    {rate1(c.financedShareOfPrice)} of the price
                  </p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-foreground/50">Interest</p>
                  <p className="font-medium text-navy dark:text-baby-blue">
                    {dollars(c.totalInterest)}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground/50">
                    {rate1(c.interestShareOfPrice)} of the price
                  </p>
                </div>
              </div>

              {extra > 0 && c.monthsSavedByExtra > 0 && (
                <div className="mt-3 rounded-md border border-navy/40 bg-navy/5 p-3 text-sm dark:border-baby-blue/40 dark:bg-baby-blue/10">
                  Your {dollars(extra)} extra a month pays it off{" "}
                  <span className="font-semibold">{describeMonths(c.monthsSavedByExtra)}</span>{" "}
                  sooner and saves about{" "}
                  <span className="font-semibold">{dollars(c.interestSavedByExtra)}</span> in interest.
                </div>
              )}

              {c.underwaterUntil > 0 ? (
                <div className="mt-3 rounded-md border border-yellow/50 bg-yellow/10 p-3 text-sm">
                  You&apos;d owe more than the car is worth for about{" "}
                  <span className="font-semibold">{describeMonths(c.underwaterUntil)}</span>
                  {c.worstGap > 0 ? `, by as much as ${dollars(c.worstGap)}` : ""}
                  . If it&apos;s totaled or stolen in that time, insurance may
                  pay less than you owe, so ask about gap coverage.
                </div>
              ) : (
                <div className="mt-3 rounded-md border border-border p-3 text-sm text-foreground/70">
                  You&apos;d never owe more than the car is worth, so you have
                  equity from the start.
                </div>
              )}

              {c.overRecommendedTerm && (
                <div className="mt-3 rounded-md border border-yellow/50 bg-yellow/10 p-3 text-sm">
                  <span className="font-semibold">
                    A term of {describeMonths(c.termMonths)} is longer than
                    the 20/4/10 guideline&apos;s 4 years.
                  </span>{" "}
                  Loans past 4 years usually cost more interest overall and
                  leave you owing more than the car is worth for longer, since
                  cars lose value fastest in the first few years. Where you
                  can, a shorter term (or a smaller loan) tends to work out
                  better — see the full guideline below.
                </div>
              )}

              <div className="mt-4">
                <p className="text-xs font-medium text-foreground/50">
                  The 20/4/10 rule of thumb
                </p>
                <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                  <Check ok={r.downOk}>
                    20% down (including a trade-in): you have{" "}
                    {rate1(r.downShare)}
                  </Check>
                  <Check ok={r.termOk}>
                    Loan of 4 years or less: yours is {describeMonths(c.termMonths)}
                  </Check>
                  <Check ok={r.incomeOk}>
                    {r.incomeShare === null
                      ? "Total car costs under 10% of your income: add your income in the advanced settings"
                      : `Total car costs under 10% of your income: yours is ${rate1(r.incomeShare)}`}
                  </Check>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {!empty && c.financed > 0 && (
        <>
          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-baby-blue">
              What you owe vs. what the car is worth
            </h2>
            <p className="mt-1 max-w-xl text-sm text-foreground/60">
              Cars lose value quickly, especially in the first year. When the
              loan balance is above the car&apos;s value, you&apos;re
              &ldquo;underwater.&rdquo; Hover (or use the arrow keys) to explore.
            </p>
            <div className="mt-4 rounded-lg border border-border p-4">
              <DebtBalanceChart
                maxMonths={chartMonths}
                startLabel="Buy"
                description="Loan balance compared with the car's estimated value"
                series={[
                  {
                    key: "owe",
                    label: "What you owe",
                    values: c.owe,
                    stroke: "stroke-[#eb6834] dark:stroke-[#d95926]",
                    key_bg: "bg-[#eb6834] dark:bg-[#d95926]",
                  },
                  {
                    key: "worth",
                    label: "What the car is worth (estimate)",
                    values: c.worth,
                    stroke: "stroke-[#2a78d6] dark:stroke-[#3987e5]",
                    key_bg: "bg-[#2a78d6] dark:bg-[#3987e5]",
                  },
                ]}
              />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-baby-blue">
              Compare loan lengths
            </h2>
            <p className="mt-1 max-w-xl text-sm text-foreground/60">
              A longer loan lowers your payment, but you pay more interest.
            </p>
            <div className="mt-4 overflow-hidden rounded-md border border-border text-sm">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b border-border px-3 py-2 text-xs font-medium text-foreground/50">
                <span>Length</span>
                <span className="w-16 text-right">Monthly</span>
                <span className="w-16 text-right">Interest</span>
                <span className="w-20 text-right">Total cost</span>
              </div>
              {c.compare.map((row) => (
                <button
                  key={row.term}
                  type="button"
                  onClick={() => selectTerm(row.term)}
                  aria-pressed={row.term === c.termMonths}
                  className={
                    "grid w-full grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-surface-hover " +
                    (row.term === c.termMonths ? "bg-navy/5 font-medium dark:bg-baby-blue/10" : "")
                  }
                >
                  <span>
                    {describeMonths(row.term)}
                    {row.overRecommendedTerm && (
                      <span className="ml-1.5 text-xs font-normal text-[#c0410f] dark:text-[#f0916b]">
                        over 4 yrs
                      </span>
                    )}
                  </span>
                  <span className="w-16 text-right">{dollars(row.payment)}</span>
                  <span className="w-16 text-right">{dollars(row.totalInterest)}</span>
                  <span className="w-20 text-right">{dollars(row.totalCost)}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-foreground/50">
              Total cost is your down payment and trade-in plus every payment.
              Terms marked &ldquo;over 4 yrs&rdquo; tend to cost more
              altogether — see why above.
            </p>
          </section>

          <p className="text-xs text-foreground/50">
            An estimate, not a loan offer. Value estimates are a rough guide (a
            new car is often said to lose about 20% in its first year and about
            15% a year after; a used car about 10% a year) — real values
            depend on the make, model, and mileage. Sales tax is a
            state-level guess (Georgia and South Carolina use a separate
            title tax folded in here as one rate) and doesn&apos;t include
            county or city tax, which many places add on top. Fees vary by
            dealer, and interest rates depend on your credit. Check the
            buyer&apos;s order and loan agreement for the real numbers.
          </p>
        </>
      )}
    </div>
  );
}
