"use client";

import { useRef, useState } from "react";
import NumberField from "./NumberField";
import DebtBalanceChart from "./DebtBalanceChart";
import useToday from "./useToday";
import { dollars } from "@/lib/format";
import {
  describeMonths,
  estimateDebtPayoff,
  type Debt,
  type Strategy,
} from "@/lib/debtPayoff";

const SERIES: Record<Strategy, { label: string; stroke: string; key_bg: string }> = {
  minimums: {
    label: "Minimums only",
    stroke: "stroke-foreground/45",
    key_bg: "bg-foreground/45",
  },
  snowball: {
    label: "Snowball",
    stroke: "stroke-[#eb6834] dark:stroke-[#d95926]",
    key_bg: "bg-[#eb6834] dark:bg-[#d95926]",
  },
  avalanche: {
    label: "Avalanche",
    stroke: "stroke-[#2a78d6] dark:stroke-[#3987e5]",
    key_bg: "bg-[#2a78d6] dark:bg-[#3987e5]",
  },
};

const STARTER_DEBTS: Debt[] = [
  { id: 1, name: "Credit card", balance: 6_000, aprPct: 24, minimum: 150 },
  { id: 2, name: "Personal loan", balance: 2_000, aprPct: 9, minimum: 80 },
  { id: 3, name: "Car loan", balance: 9_000, aprPct: 6.5, minimum: 220 },
];

function monthsFromNow(today: Date | null, months: number) {
  if (!today) return null;
  return new Date(today.getFullYear(), today.getMonth() + months, 1).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" },
  );
}

export default function DebtPayoffCalculator() {
  const [debts, setDebts] = useState<Debt[]>(STARTER_DEBTS);
  const nextId = useRef(STARTER_DEBTS.length + 1);
  const [extra, setExtra] = useState(200);
  const [horizonYears, setHorizonYears] = useState(3);
  const today = useToday();

  function updateDebt(id: number, changes: Partial<Debt>) {
    setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, ...changes } : d)));
  }

  const plan = estimateDebtPayoff({
    debts,
    extraPerMonth: extra,
    horizonMonths: horizonYears * 12,
  });
  const { results, atHorizon } = plan;
  const horizonLabel = describeMonths(plan.horizonMonths);

  const ava = results.avalanche;
  const snow = results.snowball;
  const finishMonths = [ava.months, snow.months].filter((m): m is number => m !== null);
  const chartMonths = Math.min(
    Math.max(plan.horizonMonths, ...finishMonths, 12),
    600,
  );

  const strategies: Strategy[] = ["minimums", "snowball", "avalanche"];

  let verdict: string;
  if (plan.interestSavedByAvalanche > 0.5) {
    verdict = `Avalanche saves you about ${dollars(plan.interestSavedByAvalanche)} in interest${
      plan.monthsSavedByAvalanche > 0
        ? ` and gets you debt-free ${describeMonths(plan.monthsSavedByAvalanche)} sooner`
        : ""
    } than snowball.`;
  } else {
    verdict = "For these debts, snowball and avalanche cost about the same.";
  }
  if (plan.firstWinMonthsSoonerWithSnowball > 0) {
    verdict += ` Snowball clears your first debt (${snow.payoffOrder[0]?.name}) ${describeMonths(plan.firstWinMonthsSoonerWithSnowball)} sooner, which can help you stay motivated.`;
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-foreground/80">
              Your debts
            </p>
            <div className="mt-2 flex flex-col gap-3">
              {debts.map((d, i) => (
                <div key={d.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      aria-label={`Name of debt ${i + 1}`}
                      value={d.name}
                      placeholder={`Debt ${i + 1}`}
                      onChange={(e) => updateDebt(d.id, { name: e.target.value })}
                      className="min-w-0 flex-1 rounded-md border border-border bg-transparent px-3 py-1.5 text-sm font-medium outline-none focus:border-navy dark:focus:border-baby-blue"
                    />
                    <button
                      type="button"
                      onClick={() => setDebts((prev) => prev.filter((x) => x.id !== d.id))}
                      aria-label={`Remove ${d.name.trim() || `debt ${i + 1}`}`}
                      className="rounded-md border border-border px-2 py-1.5 text-sm text-foreground/60 transition-colors hover:bg-surface-hover"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <NumberField
                      id={`debt-${d.id}-balance`}
                      label="Balance"
                      value={d.balance}
                      onChange={(v) => updateDebt(d.id, { balance: v })}
                      prefix="$"
                    />
                    <NumberField
                      id={`debt-${d.id}-apr`}
                      label="Interest rate (APR)"
                      value={d.aprPct}
                      onChange={(v) => updateDebt(d.id, { aprPct: v })}
                      suffix="%"
                      step={0.1}
                    />
                    <div className="col-span-2">
                      <NumberField
                        id={`debt-${d.id}-minimum`}
                        label="Minimum payment (per month)"
                        value={d.minimum}
                        onChange={(v) => updateDebt(d.id, { minimum: v })}
                        prefix="$"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setDebts((prev) => [
                  ...prev,
                  { id: nextId.current++, name: "", balance: 1_000, aprPct: 15, minimum: 35 },
                ])
              }
              disabled={debts.length >= 12}
              className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Add a debt
            </button>
          </div>

          <NumberField
            id="extra"
            label="Extra you can put toward debt each month"
            value={extra}
            onChange={setExtra}
            prefix="$"
          />
          <p className="-mt-2 text-xs text-foreground/50">
            On top of all your minimums. Snowball and avalanche both keep paying
            the same total each month, so when a debt is paid off its minimum
            rolls into the next one.
          </p>

          <NumberField
            id="horizon"
            label="Time horizon: how soon do you want to be debt-free?"
            value={horizonYears}
            onChange={setHorizonYears}
            suffix="yrs"
            step={0.5}
          />
        </div>

        <div className="min-w-0 rounded-lg border border-border bg-surface-hover p-6 sm:sticky sm:top-6 sm:self-start">
          {plan.empty ? (
            <p className="text-sm text-foreground/60">
              Add a debt with a balance to compare ways of paying it off.
            </p>
          ) : (
            <>
              {ava.months === null ? (
                <p className="text-sm text-foreground/70">
                  With {dollars(plan.monthlyBudget)} a month, your payments
                  don&apos;t keep up with the interest, so these debts would
                  take more than 100 years to pay off. Try adding more each
                  month.
                </p>
              ) : (
                <>
                  <p className="text-sm text-foreground/60">
                    Using the avalanche method, you could be debt-free in
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-navy dark:text-baby-blue">
                    {describeMonths(ava.months)}
                  </p>
                  {monthsFromNow(today, ava.months) && (
                    <p className="mt-1 text-sm text-foreground/60">
                      around {monthsFromNow(today, ava.months)}
                    </p>
                  )}
                </>
              )}

              <ul className="mt-5 flex flex-col gap-2.5 text-sm">
                {strategies.map((s) => {
                  const r = results[s];
                  return (
                    <li key={s} className="flex items-start gap-3">
                      <span
                        className={`mt-1.5 h-0.5 w-4 shrink-0 rounded ${SERIES[s].key_bg}`}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        {SERIES[s].label}
                        <span className="block text-xs text-foreground/50">
                          {r.months === null
                            ? "More than 100 years"
                            : `Debt-free in ${describeMonths(r.months)}`}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="font-medium">
                          {r.months === null ? "—" : dollars(r.totalInterest)}
                        </span>
                        <span className="block text-xs text-foreground/50">
                          interest
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>

              {ava.months !== null && snow.months !== null && (
                <div className="mt-4 rounded-md border border-navy/40 bg-navy/5 p-3 text-sm dark:border-baby-blue/40 dark:bg-baby-blue/10">
                  {verdict}
                </div>
              )}

              <div className="mt-5 border-t border-border pt-4">
                <p className="text-sm font-medium">
                  In {horizonLabel}
                  {monthsFromNow(today, plan.horizonMonths)
                    ? ` (${monthsFromNow(today, plan.horizonMonths)})`
                    : ""}
                  , you&apos;d still owe
                </p>
                <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                  {strategies.map((s) => (
                    <li key={s} className="flex items-baseline justify-between gap-3">
                      <span className="text-foreground/70">{SERIES[s].label}</span>
                      <span className="font-medium">
                        {atHorizon[s].debtFree
                          ? "Debt-free ✓"
                          : dollars(atHorizon[s].balance)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 rounded-md border border-yellow/50 bg-yellow/10 p-3 text-sm">
                  {plan.onTrack ? (
                    <>
                      You&apos;re on track: with {dollars(plan.extra)} extra a
                      month and the avalanche method, you&apos;d be debt-free
                      within {horizonLabel}.
                    </>
                  ) : (
                    <>
                      To be debt-free in {horizonLabel}, you&apos;d need about{" "}
                      <span className="font-semibold text-navy dark:text-baby-blue">
                        {dollars(plan.extraNeeded)} extra a month
                      </span>{" "}
                      ({dollars(plan.extraNeeded - plan.extra)} more than now),
                      using the avalanche method.
                    </>
                  )}
                </div>
              </div>

              {plan.minimumsBelowInterest && (
                <div className="mt-3 rounded-md border border-yellow/50 bg-yellow/10 p-3 text-sm">
                  Your minimums ({dollars(plan.totalMinimum)}) are less than
                  one month of interest, so paying only the minimums barely
                  touches what you owe.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {!plan.empty && (
        <>
          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-baby-blue">
              How your total debt shrinks
            </h2>
            <p className="mt-1 max-w-xl text-sm text-foreground/60">
              Hover (or use the arrow keys) to compare methods at any point in
              time.
            </p>
            <div className="mt-4 rounded-lg border border-border p-4">
              <DebtBalanceChart
                maxMonths={chartMonths}
                horizonMonths={plan.horizonMonths}
                series={strategies.map((s) => ({
                  key: s,
                  label: SERIES[s].label,
                  values: results[s].balanceByMonth,
                  stroke: SERIES[s].stroke,
                  key_bg: SERIES[s].key_bg,
                }))}
              />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy dark:text-baby-blue">
              The order each method pays your debts off
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(["snowball", "avalanche"] as const).map((s) => (
                <div key={s} className="rounded-lg border border-border p-4">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <span className={`h-0.5 w-4 rounded ${SERIES[s].key_bg}`} />
                    {SERIES[s].label}
                    <span className="text-xs font-normal text-foreground/50">
                      {s === "snowball"
                        ? "smallest balance first"
                        : "highest interest rate first"}
                    </span>
                  </p>
                  <ol className="mt-3 flex flex-col gap-2 text-sm">
                    {results[s].payoffOrder.map((d, i) => (
                      <li key={`${d.name}-${i}`} className="flex items-baseline gap-3">
                        <span className="w-5 text-foreground/50">{i + 1}.</span>
                        <span className="min-w-0 flex-1">{d.name}</span>
                        <span className="text-right">
                          {d.month === null ? (
                            "never"
                          ) : (
                            <>
                              <span className="font-medium">
                                month {d.month}
                              </span>
                              {monthsFromNow(today, d.month) && (
                                <span className="block text-xs text-foreground/50">
                                  {monthsFromNow(today, d.month)}
                                </span>
                              )}
                            </>
                          )}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <h3 className="font-medium">Snowball</h3>
              <p className="mt-1 text-foreground/60">
                Pay the minimum on everything, then throw every extra dollar at
                your <em>smallest balance</em>. You knock out debts quickly,
                which feels great and keeps many people going.
              </p>
            </div>
            <div>
              <h3 className="font-medium">Avalanche</h3>
              <p className="mt-1 text-foreground/60">
                Pay the minimum on everything, then throw every extra dollar at
                your <em>highest interest rate</em>. It costs the least in
                interest, but the first win can take longer.
              </p>
            </div>
          </section>

          <p className="text-xs text-foreground/50">
            An estimate, not financial advice. This assumes fixed minimum
            payments, interest that compounds monthly at each debt&apos;s APR,
            and no new charges or fees. Credit card minimums usually shrink as
            your balance does, and loans may have their own rules for extra
            payments, so check your statements. If you&apos;re struggling with
            debt, a nonprofit credit counselor can help for free or at low cost.
          </p>
        </>
      )}
    </div>
  );
}
