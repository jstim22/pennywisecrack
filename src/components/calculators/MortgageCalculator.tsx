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
  CREDIT_TIERS,
  DEFAULT_CLOSING_COST_PCT,
  DEFAULT_INSURANCE_RATE_PCT,
  PMI_REMOVAL_LTV,
  estimateMortgage,
  type CreditTier,
} from "@/lib/mortgage";
import { getState } from "@/lib/stateTax";

const SWATCH = {
  principal: "bg-navy dark:bg-baby-blue",
  tax: "bg-[#eb6834] dark:bg-[#d95926]",
  insurance: "bg-[#1baf7a] dark:bg-[#199e70]",
  pmi: "bg-[#eda100] dark:bg-[#c98500]",
  hoa: "bg-[#e87ba4] dark:bg-[#d55181]",
};

const TERMS = [
  { value: "15", label: "15 years" },
  { value: "20", label: "20 years" },
  { value: "30", label: "30 years" },
];

const DOWN_MODES: { value: "percent" | "dollars"; label: string }[] = [
  { value: "percent", label: "Percent (%)" },
  { value: "dollars", label: "Dollars ($)" },
];

function pctString(n: number) {
  return `${Number(n.toFixed(2))}%`;
}

export default function MortgageCalculator() {
  const [price, setPrice] = useState(400_000);
  const [downMode, setDownMode] = useState<"percent" | "dollars">("percent");
  const [downValue, setDownValue] = useState(10);
  const [ratePct, setRatePct] = useState(6.5);
  const [termYears, setTermYears] = useState("30");
  const [stateCode, setStateCode] = useState("");
  const [creditTier, setCreditTier] = useState<CreditTier>("720");
  const [pmiOverride, setPmiOverride] = useState<number | null>(null);
  const [taxOverride, setTaxOverride] = useState<number | null>(null);
  const [insuranceRate, setInsuranceRate] = useState(DEFAULT_INSURANCE_RATE_PCT);
  const [hoa, setHoa] = useState(0);
  const [closingPct, setClosingPct] = useState(DEFAULT_CLOSING_COST_PCT);
  const [extra, setExtra] = useState(0);
  const [income, setIncome] = useState(0);
  const [otherDebt, setOtherDebt] = useState(0);

  const downDollars =
    downMode === "percent" ? (price * downValue) / 100 : downValue;

  function changeDownMode(mode: "percent" | "dollars") {
    if (mode === downMode) return;
    // Keep the same down payment, just shown the other way.
    setDownValue(
      mode === "percent"
        ? price > 0
          ? Number(((downDollars / price) * 100).toFixed(2))
          : 0
        : Math.round(downDollars),
    );
    setDownMode(mode);
  }

  const inputs = {
    price,
    downPayment: downDollars,
    ratePct,
    termYears: Number(termYears),
    stateCode,
    propertyTaxRatePct: taxOverride,
    insuranceRatePct: insuranceRate,
    hoaMonthly: hoa,
    creditTier,
    pmiRatePct: pmiOverride,
    extraMonthly: extra,
    closingCostPct: closingPct,
    income,
    otherMonthlyDebt: otherDebt,
  };
  const m = estimateMortgage(inputs);
  const guess = estimateMortgage({ ...inputs, pmiRatePct: null, propertyTaxRatePct: null });
  const stateRule = getState(stateCode);

  const parts = [
    { key: "principal", label: "Principal & interest", amount: m.principalAndInterest, swatch: SWATCH.principal },
    {
      key: "tax",
      label: "Property tax",
      detail: `${pctString(m.propertyTaxRate)} of the price a year${m.propertyTaxRateIsGuess ? (m.stateHasRate ? ` (${stateRule?.name} average)` : " (national average)") : ""}`,
      amount: m.propertyTaxMonthly,
      swatch: SWATCH.tax,
    },
    {
      key: "insurance",
      label: "Homeowners insurance",
      detail: `${pctString(insuranceRate)} of the price a year`,
      amount: m.insuranceMonthly,
      swatch: SWATCH.insurance,
    },
    {
      key: "pmi",
      label: "Mortgage insurance (PMI)",
      detail: m.pmi.applies
        ? `${pctString(m.pmi.ratePct)} of the loan a year${m.pmi.rateIsGuess ? " (a guess)" : ""}`
        : undefined,
      amount: m.pmi.monthly,
      swatch: SWATCH.pmi,
    },
    { key: "hoa", label: "HOA dues", amount: m.hoa, swatch: SWATCH.hoa },
  ];

  const empty = m.price <= 0;
  const showPmiRate = pmiOverride ?? guess.pmi.ratePct;
  const showTaxRate = taxOverride ?? guess.propertyTaxRate;
  const chartMonths = Math.max(m.schedule.months, 12);

  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <NumberField
            id="price"
            label="Home price"
            value={price}
            onChange={setPrice}
            prefix="$"
          />

          <div>
            <span className="text-sm font-medium text-foreground/80">
              Down payment
            </span>
            <Segmented
              options={DOWN_MODES}
              value={downMode}
              onChange={changeDownMode}
            />
            <div className="mt-2">
              <NumberField
                id="down"
                label={downMode === "percent" ? "Percent of the price" : "Amount"}
                value={downValue}
                onChange={setDownValue}
                prefix={downMode === "dollars" ? "$" : undefined}
                suffix={downMode === "percent" ? "%" : undefined}
                step={downMode === "percent" ? 0.5 : undefined}
              />
            </div>
            <p className="mt-1.5 text-xs text-foreground/50">
              {downMode === "percent"
                ? `That's ${dollars(downDollars)}.`
                : `That's ${rate1(price > 0 ? downDollars / price : 0)} of the price.`}{" "}
              Less than 20% down usually means paying mortgage insurance (PMI).
            </p>
          </div>

          <NumberField
            id="rate"
            label="Interest rate"
            value={ratePct}
            onChange={setRatePct}
            suffix="%"
            step={0.125}
          />

          <div>
            <span className="text-sm font-medium text-foreground/80">
              Loan length
            </span>
            <Segmented options={TERMS} value={termYears} onChange={setTermYears} columns={3} />
          </div>

          <StateSelect
            value={stateCode}
            onChange={setStateCode}
            hideNote
            helper="Used to guess property taxes. You can change the guess in the advanced settings."
          />

          <Disclosure title="Advanced settings">
            <div>
              <p className="text-sm font-semibold text-foreground/80">
                Mortgage insurance (PMI)
              </p>
              <p className="mt-1 text-xs text-foreground/50">
                Required on most loans with less than 20% down. It goes away
                once you owe {Math.round(PMI_REMOVAL_LTV * 100)}% of the
                home&apos;s price (you have to ask; it ends on its own at 78%).
              </p>
            </div>
            <label htmlFor="credit" className="block">
              <span className="text-sm font-medium text-foreground/80">
                Your credit score
              </span>
              <select
                id="credit"
                value={creditTier}
                onChange={(e) => {
                  setCreditTier(e.target.value as CreditTier);
                  setPmiOverride(null);
                }}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-navy dark:focus:border-baby-blue"
              >
                {CREDIT_TIERS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <NumberField
                id="pmiRate"
                label="PMI rate (per year, % of the loan)"
                value={showPmiRate}
                onChange={setPmiOverride}
                suffix="%"
                step={0.05}
              />
              <p className="mt-1.5 text-xs text-foreground/50">
                {guess.pmi.applies || pmiOverride !== null
                  ? pmiOverride === null
                    ? "A typical rate for your credit score and down payment. Your lender's quote will differ."
                    : "You changed this."
                  : "With 20% or more down, there's no PMI."}
                {pmiOverride !== null && (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={() => setPmiOverride(null)}
                      className="underline hover:text-foreground"
                    >
                      Reset to the guess ({pctString(guess.pmi.ratePct)})
                    </button>
                  </>
                )}
              </p>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-sm font-semibold text-foreground/80">
                Escrow: taxes and insurance
              </p>
              <p className="mt-1 text-xs text-foreground/50">
                Most lenders collect property tax and homeowners insurance with
                your payment and pay those bills for you from an escrow
                account. These are guesses — check the real numbers for the
                home.
              </p>
            </div>
            <div>
              <NumberField
                id="taxRate"
                label="Property tax rate (per year, % of the price)"
                value={showTaxRate}
                onChange={setTaxOverride}
                suffix="%"
                step={0.05}
              />
              <p className="mt-1.5 text-xs text-foreground/50">
                {taxOverride === null
                  ? guess.stateHasRate
                    ? `The average for ${stateRule?.name}. Your county or town could be well above or below.`
                    : "The U.S. average. Pick your state above to use its average."
                  : "You changed this."}
                {taxOverride !== null && (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={() => setTaxOverride(null)}
                      className="underline hover:text-foreground"
                    >
                      Reset to the guess ({pctString(guess.propertyTaxRate)})
                    </button>
                  </>
                )}
              </p>
            </div>
            <div>
              <NumberField
                id="insuranceRate"
                label="Homeowners insurance (per year, % of the price)"
                value={insuranceRate}
                onChange={setInsuranceRate}
                suffix="%"
                step={0.05}
              />
              <p className="mt-1.5 text-xs text-foreground/50">
                Usually about 0.5%–1% of the price, and much more in areas
                with hurricanes or wildfires. That&apos;s about{" "}
                {dollars(m.insuranceMonthly * 12)} a year here.
              </p>
            </div>
            <NumberField
              id="hoa"
              label="HOA dues (per month)"
              value={hoa}
              onChange={setHoa}
              prefix="$"
            />

            <div className="border-t border-border pt-4">
              <p className="text-sm font-semibold text-foreground/80">
                Other
              </p>
            </div>
            <NumberField
              id="closing"
              label="Closing costs (% of the price)"
              value={closingPct}
              onChange={setClosingPct}
              suffix="%"
              step={0.25}
            />
            <NumberField
              id="extra"
              label="Extra you'll pay toward the loan each month"
              value={extra}
              onChange={setExtra}
              prefix="$"
            />
            <NumberField
              id="income"
              label="Your yearly income (optional)"
              value={income}
              onChange={setIncome}
              prefix="$"
            />
            {income > 0 && (
              <NumberField
                id="otherDebt"
                label="Your other monthly debt payments"
                value={otherDebt}
                onChange={setOtherDebt}
                prefix="$"
              />
            )}
          </Disclosure>
        </div>

        <div className="min-w-0 rounded-lg border border-border bg-surface-hover p-6 sm:sticky sm:top-6 sm:self-start">
          {empty ? (
            <p className="text-sm text-foreground/60">
              Enter a home price to see your monthly payment.
            </p>
          ) : (
            <>
              <p className="text-sm text-foreground/60">
                Your estimated monthly payment
              </p>
              <p className="mt-1 text-3xl font-semibold text-navy dark:text-baby-blue">
                {dollars(m.totalMonthly)}
              </p>
              {m.pmi.applies && (
                <p className="mt-1 text-sm text-foreground/60">
                  drops to {dollars(m.totalAfterPmi)} when PMI ends
                </p>
              )}

              <div className="mt-5">
                <BreakdownList
                  parts={parts}
                  summary="Where your monthly payment goes"
                />
              </div>

              <p className="mt-4 text-xs text-foreground/60">
                Your lender would likely collect about{" "}
                <span className="font-medium text-foreground">
                  {dollars(m.escrowMonthly)}
                </span>{" "}
                a month into escrow for property tax and insurance
                {m.pmi.applies ? ", plus PMI on top" : ""}.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border border-border p-3">
                  <p className="text-foreground/50">You borrow</p>
                  <p className="font-medium">{dollars(m.loan)}</p>
                  <p className="mt-0.5 text-xs text-foreground/50">
                    {rate1(m.ltv)} of the price
                  </p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-foreground/50">Cash to close</p>
                  <p className="font-medium">{dollars(m.cashToClose)}</p>
                  <p className="mt-0.5 text-xs text-foreground/50">
                    down payment + {dollars(m.closingCosts)} closing
                  </p>
                </div>
                <div className="col-span-2 rounded-md border border-border p-3">
                  <p className="text-foreground/50">Interest over the loan</p>
                  <p className="font-medium text-navy dark:text-baby-blue">
                    {dollars(m.schedule.totalInterest)}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground/50">
                    You&apos;d pay {dollars(m.schedule.totalPaid)} in principal
                    and interest for a {dollars(m.loan)} loan.
                  </p>
                </div>
              </div>

              {m.pmi.applies && (
                <div className="mt-3 rounded-md border border-yellow/50 bg-yellow/10 p-3 text-sm">
                  PMI costs {dollars(m.pmi.monthly)} a month for about{" "}
                  <span className="font-semibold">
                    {describeMonths(m.pmi.months)}
                  </span>
                  , around {dollars(m.pmi.total)} in all, until you owe{" "}
                  {Math.round(PMI_REMOVAL_LTV * 100)}% of the price. Putting
                  another{" "}
                  <span className="font-semibold">
                    {dollars(m.pmi.moreFor20)}
                  </span>{" "}
                  down (20%) would avoid it.
                </div>
              )}

              {extra > 0 && m.monthsSavedByExtra > 0 && (
                <div className="mt-3 rounded-md border border-navy/40 bg-navy/5 p-3 text-sm dark:border-baby-blue/40 dark:bg-baby-blue/10">
                  Your {dollars(extra)} extra a month pays the loan off{" "}
                  <span className="font-semibold">
                    {describeMonths(m.monthsSavedByExtra)}
                  </span>{" "}
                  sooner and saves about{" "}
                  <span className="font-semibold">
                    {dollars(m.interestSavedByExtra)}
                  </span>{" "}
                  in interest.
                </div>
              )}

              {m.frontEndRatio !== null && (
                <p className="mt-4 text-sm text-foreground/70">
                  Your housing payment is about{" "}
                  <span className="font-medium text-foreground">
                    {rate1(m.frontEndRatio)}
                  </span>{" "}
                  of your monthly income
                  {m.backEndRatio !== null && otherDebt > 0
                    ? `, and about ${rate1(m.backEndRatio)} with your other debts`
                    : ""}
                  . Lenders often like housing costs under about 28% and all
                  debts under about 36%.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {!empty && m.loan > 0 && (
        <>
          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-baby-blue">
              How your loan balance shrinks
            </h2>
            <p className="mt-1 max-w-xl text-sm text-foreground/60">
              Early payments are mostly interest; later ones are mostly
              principal. Hover (or use the arrow keys) to explore.
            </p>
            <div className="mt-4 rounded-lg border border-border p-4">
              <DebtBalanceChart
                maxMonths={chartMonths}
                startLabel="Start"
                description="Mortgage balance left"
                series={[
                  {
                    key: "plain",
                    label: "Regular payments",
                    values: m.schedule.balanceByMonth,
                    stroke: "stroke-[#2a78d6] dark:stroke-[#3987e5]",
                    key_bg: "bg-[#2a78d6] dark:bg-[#3987e5]",
                  },
                  ...(extra > 0
                    ? [
                        {
                          key: "extra",
                          label: "With your extra",
                          values: m.withExtra.balanceByMonth,
                          stroke: "stroke-[#eb6834] dark:stroke-[#d95926]",
                          key_bg: "bg-[#eb6834] dark:bg-[#d95926]",
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-baby-blue">
              Year by year
            </h2>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-foreground/70">
                Show the yearly breakdown of principal and interest
              </summary>
              <div className="overflow-x-auto">
                <table className="mt-2 w-full text-left text-xs">
                  <thead className="text-foreground/50">
                    <tr>
                      <th className="py-1 font-medium">Year</th>
                      <th className="py-1 text-right font-medium">Interest</th>
                      <th className="py-1 text-right font-medium">Principal</th>
                      <th className="py-1 text-right font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(extra > 0 ? m.withExtra : m.schedule).years.map((y) => (
                      <tr key={y.year} className="border-t border-border">
                        <td className="py-1">{y.year}</td>
                        <td className="py-1 text-right">{dollars(y.interest)}</td>
                        <td className="py-1 text-right">{dollars(y.principal)}</td>
                        <td className="py-1 text-right">{dollars(y.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>

          <p className="text-xs text-foreground/50">
            An estimate, not a loan offer. This assumes a fixed-rate loan, and
            that property tax, insurance, and HOA dues stay the same (in real
            life they usually rise). Property tax guesses are statewide
            averages from the Tax Foundation; insurance and PMI are typical
            ranges, not quotes. It doesn&apos;t include FHA, VA, or USDA loan
            insurance, points, or lender fees beyond the closing-cost guess.
            Your lender&apos;s Loan Estimate has the real numbers.
          </p>
        </>
      )}
    </div>
  );
}
