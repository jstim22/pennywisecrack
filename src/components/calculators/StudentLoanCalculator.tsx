"use client";

import { useRef, useState } from "react";
import NumberField from "./NumberField";
import Disclosure from "./Disclosure";
import DebtBalanceChart from "./DebtBalanceChart";
import useToday from "./useToday";
import { describeMonths } from "@/lib/debtPayoff";
import { dollars, rate1 } from "@/lib/format";
import {
  AUTOPAY_ENROLL_DEADLINE,
  AUTOPAY_STANDARD_DISCOUNT,
  AUTOPAY_TEMPORARY_DISCOUNT,
  FEDERAL_RATES_2026_27,
  PLANS,
  RAP_FORGIVENESS_MONTHS,
  autopayBoostMonths,
  estimateStudentLoans,
  type Loan,
  type PlanId,
} from "@/lib/studentLoans";

// One line color per plan, from the validated reference palette (blue,
// orange, aqua, yellow, magenta), stepped for light and dark.
const PLAN_COLORS: Record<PlanId, { stroke: string; key_bg: string }> = {
  standard: { stroke: "stroke-[#2a78d6] dark:stroke-[#3987e5]", key_bg: "bg-[#2a78d6] dark:bg-[#3987e5]" },
  tiered: { stroke: "stroke-[#eb6834] dark:stroke-[#d95926]", key_bg: "bg-[#eb6834] dark:bg-[#d95926]" },
  extended: { stroke: "stroke-[#1baf7a] dark:stroke-[#199e70]", key_bg: "bg-[#1baf7a] dark:bg-[#199e70]" },
  rap: { stroke: "stroke-[#eda100] dark:stroke-[#c98500]", key_bg: "bg-[#eda100] dark:bg-[#c98500]" },
  custom: { stroke: "stroke-[#e87ba4] dark:stroke-[#d55181]", key_bg: "bg-[#e87ba4] dark:bg-[#d55181]" },
};

const STARTER_LOANS: Loan[] = [
  { id: 1, name: "Federal loan", balance: 25_000, ratePct: 6.52, subsidized: false, federal: true },
];

function monthsFromNow(today: Date | null, months: number) {
  if (!today) return null;
  return new Date(today.getFullYear(), today.getMonth() + months, 1).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" },
  );
}

export default function StudentLoanCalculator() {
  const [loans, setLoans] = useState<Loan[]>(STARTER_LOANS);
  const nextId = useRef(2);
  const [monthsUntil, setMonthsUntil] = useState(0);
  const [plan, setPlan] = useState<PlanId>("standard");
  const [customYears, setCustomYears] = useState(15);
  const [extra, setExtra] = useState(50);
  const [income, setIncome] = useState(50_000);
  const [dependents, setDependents] = useState(0);
  const [raise, setRaise] = useState(3);
  const [autopay, setAutopay] = useState(false);
  const [enrolledByDeadline, setEnrolledByDeadline] = useState(true);
  const today = useToday();

  // The bigger 1% autopay discount was for people enrolled by Sept 30, 2026.
  const deadline = new Date(
    AUTOPAY_ENROLL_DEADLINE.year,
    AUTOPAY_ENROLL_DEADLINE.month,
    AUTOPAY_ENROLL_DEADLINE.day,
  );
  const pastDeadline = today !== null && today > deadline;
  const daysToDeadline =
    today !== null && !pastDeadline
      ? Math.round((deadline.getTime() - today.getTime()) / 86_400_000)
      : null;
  const boostMonths =
    today !== null && (!pastDeadline || enrolledByDeadline)
      ? autopayBoostMonths(
          { year: today.getFullYear(), month: today.getMonth() },
          monthsUntil,
        )
      : 0;

  function updateLoan(id: number, changes: Partial<Loan>) {
    setLoans((prev) => prev.map((l) => (l.id === id ? { ...l, ...changes } : l)));
  }

  const e = estimateStudentLoans({
    loans,
    monthsUntilRepayment: monthsUntil,
    plan,
    customYears,
    extraPerMonth: extra,
    income,
    dependents,
    raisePct: raise,
    autopay,
    autopayBoostMonths: boostMonths,
  });
  const c = e.chosen;
  const planInfo = PLANS.find((p) => p.value === plan)!;
  const isRap = plan === "rap";

  // Plans shown in the comparison: the usual ones, plus your own term if picked.
  const shown = PLANS.filter((p) => p.value !== "custom" || plan === "custom");
  const chartMonths = Math.min(
    Math.max(...shown.map((p) => e.compared[p.value].months ?? 0), 12),
    RAP_FORGIVENESS_MONTHS + 1,
  );
  const startDate = (months: number) => monthsFromNow(today, e.monthsUntil + months);

  const share = e.paymentShareOfIncome;
  const payoffText =
    c.months === null
      ? "More than 100 years"
      : isRap && c.forgiven > 0.5
        ? `${describeMonths(c.months)}, then the rest is forgiven`
        : `Paid off in ${describeMonths(c.months)}`;

  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-foreground/80">Your student loans</p>
            <div className="mt-2 flex flex-col gap-3">
              {loans.map((l, i) => (
                <div key={l.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      aria-label={`Name of loan ${i + 1}`}
                      value={l.name}
                      placeholder={`Loan ${i + 1}`}
                      onChange={(ev) => updateLoan(l.id, { name: ev.target.value })}
                      className="min-w-0 flex-1 rounded-md border border-border bg-transparent px-3 py-1.5 text-sm font-medium outline-none focus:border-navy dark:focus:border-baby-blue"
                    />
                    <button
                      type="button"
                      onClick={() => setLoans((prev) => prev.filter((x) => x.id !== l.id))}
                      aria-label={`Remove ${l.name.trim() || `loan ${i + 1}`}`}
                      className="rounded-md border border-border px-2 py-1.5 text-sm text-foreground/60 transition-colors hover:bg-surface-hover"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <NumberField
                      id={`loan-${l.id}-balance`}
                      label="Balance"
                      value={l.balance}
                      onChange={(v) => updateLoan(l.id, { balance: v })}
                      prefix="$"
                    />
                    <NumberField
                      id={`loan-${l.id}-rate`}
                      label="Interest rate"
                      value={l.ratePct}
                      onChange={(v) => updateLoan(l.id, { ratePct: v })}
                      suffix="%"
                      step={0.01}
                    />
                  </div>
                  <label className="mt-3 flex items-start gap-2 text-xs text-foreground/70">
                    <input
                      type="checkbox"
                      checked={l.federal !== false}
                      onChange={(ev) => updateLoan(l.id, { federal: ev.target.checked })}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-navy dark:accent-baby-blue"
                    />
                    <span>Federal Direct Loan (not a private loan)</span>
                  </label>
                  {l.federal !== false && (
                    <label className="mt-2 flex items-start gap-2 text-xs text-foreground/70">
                      <input
                        type="checkbox"
                        checked={l.subsidized}
                        onChange={(ev) => updateLoan(l.id, { subsidized: ev.target.checked })}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-navy dark:accent-baby-blue"
                      />
                      <span>
                        Subsidized — the government pays the interest while I&apos;m
                        in school
                      </span>
                    </label>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setLoans((prev) => [
                  ...prev,
                  {
                    id: nextId.current++,
                    name: "",
                    balance: 10_000,
                    ratePct: FEDERAL_RATES_2026_27.undergraduate,
                    subsidized: false,
                    federal: true,
                  },
                ])
              }
              disabled={loans.length >= 10}
              className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Add a loan
            </button>
            <p className="mt-2 text-xs text-foreground/50">
              Federal loans first paid out July 2026 – June 2027 have fixed
              rates of {FEDERAL_RATES_2026_27.undergraduate}% (undergraduate),{" "}
              {FEDERAL_RATES_2026_27.graduate}% (graduate), and{" "}
              {FEDERAL_RATES_2026_27.plus}% (PLUS). Older loans have their own
              rates, so check your servicer.
            </p>
          </div>

          <div>
            <NumberField
              id="monthsUntil"
              label="Months until you start repaying"
              value={monthsUntil}
              onChange={setMonthsUntil}
              suffix="mo"
            />
            <p className="mt-1.5 text-xs text-foreground/50">
              Use 0 if you&apos;re already repaying. Still in school? Count the
              months until you leave school, plus about 6 for the grace period.
              Interest keeps building on loans that aren&apos;t subsidized.
            </p>
          </div>

          <div>
            <label htmlFor="plan" className="block">
              <span className="text-sm font-medium text-foreground/80">
                Repayment plan
              </span>
              <select
                id="plan"
                value={plan}
                onChange={(ev) => setPlan(ev.target.value as PlanId)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-navy dark:focus:border-baby-blue"
              >
                {PLANS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-1.5 text-xs text-foreground/50">{planInfo.note}</p>
          </div>

          {plan === "custom" && (
            <NumberField
              id="customYears"
              label="Length of your loan"
              value={customYears}
              onChange={setCustomYears}
              suffix="yrs"
            />
          )}

          <div>
            <NumberField
              id="income"
              label="Your yearly income (before taxes)"
              value={income}
              onChange={setIncome}
              prefix="$"
            />
            <p className="mt-1.5 text-xs text-foreground/50">
              Used to compare your payment to your pay, and by the Repayment
              Assistance Plan (which uses your adjusted gross income, so your
              pay before taxes is a close estimate).
            </p>
          </div>

          <NumberField
            id="extra"
            label="Extra you'll pay each month"
            value={extra}
            onChange={setExtra}
            prefix="$"
          />

          <div className="rounded-md border border-border p-3">
            <label className="flex items-start justify-between gap-3 text-sm font-medium text-foreground/80">
              <span>
                Pay by autopay
                <span className="mt-0.5 block text-xs font-normal text-foreground/50">
                  Federal Direct Loans come with a lower interest rate when
                  your payment is taken from your bank account automatically.
                  It&apos;s normally {AUTOPAY_STANDARD_DISCOUNT}%, but the
                  Department of Education raised it to{" "}
                  {AUTOPAY_TEMPORARY_DISCOUNT}% for people enrolled by
                  September 30, 2026, through June 30, 2028. Your required
                  payment stays the same, so more of it goes to your balance.
                </span>
              </span>
              <input
                type="checkbox"
                checked={autopay}
                onChange={(ev) => setAutopay(ev.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-navy dark:accent-baby-blue"
              />
            </label>
            {daysToDeadline !== null && (
              <p className="mt-2 rounded-md border border-yellow/50 bg-yellow/10 p-2 text-xs">
                {daysToDeadline === 0
                  ? "Today is the last day to enroll for the 1% discount."
                  : `You have ${daysToDeadline} ${daysToDeadline === 1 ? "day" : "days"} left (through September 30, 2026) to enroll for the 1% discount.`}{" "}
                Sign up with your loan servicer.
              </p>
            )}
            {autopay && pastDeadline && (
              <label className="mt-2 flex items-start gap-2 text-xs text-foreground/70">
                <input
                  type="checkbox"
                  checked={enrolledByDeadline}
                  onChange={(ev) => setEnrolledByDeadline(ev.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-navy dark:accent-baby-blue"
                />
                <span>
                  I enrolled by September 30, 2026 (if not, you&apos;ll get the
                  regular {AUTOPAY_STANDARD_DISCOUNT}%)
                </span>
              </label>
            )}
            {autopay && !e.hasFederal && !e.empty && (
              <p className="mt-2 text-xs text-foreground/60">
                None of your loans are marked as federal, so there&apos;s no
                autopay discount to apply.
              </p>
            )}
          </div>

          <Disclosure title="Advanced settings">
            <NumberField
              id="dependents"
              label="Dependents you claim (RAP)"
              value={dependents}
              onChange={setDependents}
            />
            <p className="-mt-2 text-xs text-foreground/50">
              RAP takes $50 off your monthly payment for each dependent.
            </p>
            <NumberField
              id="raise"
              label="Expected yearly raise (RAP)"
              value={raise}
              onChange={setRaise}
              suffix="%"
              step={0.5}
            />
            <p className="-mt-2 text-xs text-foreground/50">
              As your income grows, your RAP payment moves up with it.
            </p>
          </Disclosure>
        </div>

        <div className="min-w-0 rounded-lg border border-border bg-surface-hover p-6 sm:sticky sm:top-6 sm:self-start">
          {e.empty ? (
            <p className="text-sm text-foreground/60">
              Add a loan with a balance to see your payment.
            </p>
          ) : (
            <>
              <p className="text-sm text-foreground/60">
                On the {planInfo.short} plan, your monthly payment is
              </p>
              <p className="mt-1 text-3xl font-semibold text-navy dark:text-baby-blue">
                {dollars(c.monthlyPayment)}
              </p>
              <p className="mt-1 text-sm text-foreground/60">
                {isRap && c.peakPayment > c.monthlyPayment + 0.5
                  ? `rising to about ${dollars(c.peakPayment)} as your income grows`
                  : extra > 0
                    ? `plus your ${dollars(extra)} extra`
                    : "every month"}
                {isRap && c.peakPayment > c.monthlyPayment + 0.5 && extra > 0
                  ? `, plus your ${dollars(extra)} extra`
                  : ""}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border border-border p-3">
                  <p className="text-foreground/50">You&apos;ll pay in total</p>
                  <p className="font-medium">{dollars(c.totalPaid)}</p>
                  <p className="mt-0.5 text-xs text-foreground/50">
                    on {dollars(e.balanceAtStart)} owed
                  </p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-foreground/50">Interest you pay</p>
                  <p className="font-medium text-navy dark:text-baby-blue">
                    {dollars(c.totalInterest)}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground/50">
                    {rate1(e.balanceAtStart > 0 ? c.totalInterest / e.balanceAtStart : 0)} of what you owe
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-md border border-border p-3 text-sm">
                <p className="text-foreground/50">Debt-free</p>
                <p className="font-medium">{payoffText}</p>
                {c.months !== null && startDate(c.months) && (
                  <p className="mt-0.5 text-xs text-foreground/50">
                    around {startDate(c.months)}
                  </p>
                )}
              </div>

              {e.interestBuilt > 0.5 && (
                <div className="mt-3 rounded-md border border-yellow/50 bg-yellow/10 p-3 text-sm">
                  While you wait to start repaying, about{" "}
                  <span className="font-semibold">{dollars(e.interestBuilt)}</span>{" "}
                  of interest builds up, so you&apos;ll start repayment owing{" "}
                  {dollars(e.balanceAtStart)} instead of {dollars(e.totalBorrowed)}.
                  Paying the interest while you&apos;re in school keeps it from
                  growing.
                </div>
              )}

              {isRap && c.forgiven > 0.5 && (
                <div className="mt-3 rounded-md border border-yellow/50 bg-yellow/10 p-3 text-sm">
                  After {RAP_FORGIVENESS_MONTHS / 12} years of payments,{" "}
                  <span className="font-semibold">{dollars(c.forgiven)}</span> would
                  be forgiven. Forgiven loan balances may count as taxable
                  income, so don&apos;t assume it&apos;s free.
                </div>
              )}

              {extra > 0 && e.monthsSavedByExtra > 0 && (
                <div className="mt-3 rounded-md border border-navy/40 bg-navy/5 p-3 text-sm dark:border-baby-blue/40 dark:bg-baby-blue/10">
                  Your {dollars(extra)} extra a month gets you out{" "}
                  <span className="font-semibold">
                    {describeMonths(e.monthsSavedByExtra)}
                  </span>{" "}
                  sooner and saves about{" "}
                  <span className="font-semibold">
                    {dollars(e.interestSavedByExtra)}
                  </span>{" "}
                  in interest.
                </div>
              )}

              {autopay && e.hasFederal && (
                <div className="mt-3 rounded-md border border-navy/40 bg-navy/5 p-3 text-sm dark:border-baby-blue/40 dark:bg-baby-blue/10">
                  {e.interestSavedByAutopay > 0.5 ? (
                    <>
                      Autopay saves you about{" "}
                      <span className="font-semibold">
                        {dollars(e.interestSavedByAutopay)}
                      </span>{" "}
                      in interest
                      {e.monthsSavedByAutopay > 0
                        ? ` and gets you out ${describeMonths(e.monthsSavedByAutopay)} sooner`
                        : ""}
                      .
                    </>
                  ) : (
                    <>
                      Autopay doesn&apos;t change much here
                      {isRap
                        ? ": on RAP, interest your payment doesn't cover is waived either way."
                        : "."}
                    </>
                  )}{" "}
                  {boostMonths > 0
                    ? `That counts ${AUTOPAY_TEMPORARY_DISCOUNT}% off for your first ${describeMonths(boostMonths)} of payments, then ${AUTOPAY_STANDARD_DISCOUNT}% off.`
                    : `That counts ${AUTOPAY_STANDARD_DISCOUNT}% off, since the temporary ${AUTOPAY_TEMPORARY_DISCOUNT}% window doesn't cover your payments.`}
                </div>
              )}

              {share !== null && (
                <p className="mt-4 text-sm text-foreground/70">
                  Your required payment is about{" "}
                  <span className="font-medium text-foreground">
                    {rate1(share)}
                  </span>{" "}
                  of your monthly income. A common rule of thumb is to keep
                  student loan payments under about 10%.
                  {e.borrowedVsIncome !== null &&
                    ` You owe ${rate1(e.borrowedVsIncome)} of a year's income${
                      e.borrowedVsIncome > 1
                        ? " — more than the common advice to borrow no more than you'll earn in a year."
                        : "."
                    }`}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {!e.empty && (
        <>
          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-baby-blue">
              Compare repayment plans
            </h2>
            <p className="mt-1 max-w-xl text-sm text-foreground/60">
              Required payments only, without your extra. Pick one to see it
              above. Which plans you can choose depends on when your loans were
              made.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {shown.map((p) => {
                const r = e.compared[p.value];
                const selected = p.value === plan;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPlan(p.value)}
                    aria-pressed={selected}
                    className={
                      "rounded-lg border p-4 text-left transition-colors " +
                      (selected
                        ? "border-navy bg-navy/5 dark:border-baby-blue dark:bg-baby-blue/10"
                        : "border-border hover:bg-surface-hover")
                    }
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span className={`h-0.5 w-4 rounded ${PLAN_COLORS[p.value].key_bg}`} />
                      {p.short}
                      {p.value === "tiered" && (
                        <span className="text-xs font-normal text-foreground/50">
                          {describeMonths(e.tieredMonths)}
                        </span>
                      )}
                    </span>
                    <span className="mt-2 block text-2xl font-semibold">
                      {dollars(r.monthlyPayment)}
                      <span className="text-sm font-normal text-foreground/50">
                        {" "}/ month
                      </span>
                    </span>
                    {p.value === "rap" && r.peakPayment > r.monthlyPayment + 0.5 && (
                      <span className="block text-xs text-foreground/50">
                        rising to about {dollars(r.peakPayment)}
                      </span>
                    )}
                    <span className="mt-2 block text-xs text-foreground/60">
                      {r.months === null
                        ? "More than 100 years"
                        : p.value === "rap" && r.forgiven > 0.5
                          ? `${RAP_FORGIVENESS_MONTHS / 12} years, then ${dollars(r.forgiven)} forgiven`
                          : describeMonths(r.months)}
                      {" · "}
                      {dollars(r.totalPaid)} total · {dollars(r.totalInterest)} interest
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-baby-blue">
              How your balance shrinks under each plan
            </h2>
            <p className="mt-1 max-w-xl text-sm text-foreground/60">
              Hover (or use the arrow keys) to compare plans over time. Time
              starts when your payments do.
            </p>
            <div className="mt-4 rounded-lg border border-border p-4">
              <DebtBalanceChart
                maxMonths={chartMonths}
                startLabel="Start"
                description="Student loan balance left under each repayment plan"
                series={shown.map((p) => {
                  const values = e.compared[p.value].balanceByMonth;
                  return {
                    key: p.value,
                    label: p.short,
                    // RAP's forgiven balance drops to zero after the last payment.
                    values: p.value === "rap" && e.compared.rap.forgiven > 0.5 ? [...values, 0] : values,
                    stroke: PLAN_COLORS[p.value].stroke,
                    key_bg: PLAN_COLORS[p.value].key_bg,
                  };
                })}
              />
            </div>
          </section>

          <p className="text-xs text-foreground/50">
            An estimate, not financial advice. Rates and plans reflect federal
            rules for 2026, including the Repayment Assistance Plan and Tiered
            Standard plan created by Public Law 119-21. It assumes you never
            miss a payment and that interest builds up simply and is added to
            your balance when repayment starts. The autopay discount assumes
            Direct Loans, 1% off through June 30, 2028 for people enrolled by
            September 30, 2026 and 0.25% after that (unless the Department of
            Education extends it), and it isn&apos;t applied while you&apos;re
            in school, in grace, or in deferment or forbearance. It doesn&apos;t include RAP&apos;s
            principal match (up to $50 a month off your balance, so your real
            RAP balance may shrink faster), married-couple income rules, Public Service
            Loan Forgiveness, deferment or forbearance, refinancing, or
            origination fees. Private loans work differently — use &ldquo;Choose
            your own term&rdquo; for those. For your real numbers, use your
            loan servicer and the{" "}
            <a
              href="https://studentaid.gov/loan-simulator/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Loan Simulator at studentaid.gov
            </a>
            .
          </p>
        </>
      )}
    </div>
  );
}
