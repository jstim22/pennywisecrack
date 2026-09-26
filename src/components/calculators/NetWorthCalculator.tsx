"use client";

import { useRef, useState } from "react";
import CurrencyInput from "./CurrencyInput";
import NumberField from "./NumberField";
import BreakdownList from "./BreakdownList";
import { dollars, rate1 } from "@/lib/format";
import {
  estimateNetWorth,
  groupsOf,
  type GroupId,
  type NetWorthItem,
} from "@/lib/netWorth";
import {
  buildNetWorthCsv,
  buildNetWorthWorkbook,
  netWorthFilename,
} from "@/lib/netWorthExport";

const SWATCH: Record<GroupId, string> = {
  cash: "bg-[#2a78d6] dark:bg-[#3987e5]",
  investments: "bg-[#eb6834] dark:bg-[#d95926]",
  retirement: "bg-[#1baf7a] dark:bg-[#199e70]",
  property: "bg-[#eda100] dark:bg-[#c98500]",
  otherAssets: "bg-[#e87ba4] dark:bg-[#d55181]",
  housingDebt: "bg-[#2a78d6] dark:bg-[#3987e5]",
  loans: "bg-[#eb6834] dark:bg-[#d95926]",
  cards: "bg-[#1baf7a] dark:bg-[#199e70]",
  otherDebt: "bg-[#eda100] dark:bg-[#c98500]",
};

// An example to start from, so there's something to see. "Clear it out" wipes it.
const STARTER: NetWorthItem[] = [
  { id: 1, group: "cash", name: "Checking account", amount: 3_000 },
  { id: 2, group: "cash", name: "Savings account", amount: 8_000 },
  { id: 3, group: "investments", name: "Brokerage account", amount: 5_000 },
  { id: 4, group: "retirement", name: "401(k)", amount: 25_000 },
  { id: 5, group: "property", name: "Car", amount: 12_000 },
  { id: 6, group: "loans", name: "Student loans", amount: 20_000 },
  { id: 7, group: "cards", name: "Credit card", amount: 1_500 },
];

const BLANK: Omit<NetWorthItem, "id">[] = [
  { group: "cash", name: "Checking account", amount: 0 },
  { group: "cash", name: "Savings account", amount: 0 },
  { group: "investments", name: "Brokerage account", amount: 0 },
  { group: "retirement", name: "Retirement account", amount: 0 },
  { group: "property", name: "Home", amount: 0 },
  { group: "property", name: "Car", amount: 0 },
  { group: "housingDebt", name: "Mortgage", amount: 0 },
  { group: "loans", name: "Student loans", amount: 0 },
  { group: "cards", name: "Credit card", amount: 0 },
];

function download(filename: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

const NEGATIVE = "text-[#c0410f] dark:text-[#f0916b]";

export default function NetWorthCalculator() {
  const nextId = useRef(STARTER.length + 1);
  const [items, setItems] = useState<NetWorthItem[]>(STARTER);
  const [age, setAge] = useState(0);

  function update(id: number, changes: Partial<NetWorthItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...changes } : i)));
  }
  function add(group: GroupId) {
    setItems((prev) => [...prev, { id: nextId.current++, group, name: "", amount: 0 }]);
  }

  const e = estimateNetWorth(items, age);
  const negative = e.netWorth < 0;

  const partsFor = (kind: "asset" | "liability") =>
    groupsOf(kind).map((g) => ({
      key: g.id,
      label: g.label,
      amount: e.byGroup[g.id],
      swatch: SWATCH[g.id],
    }));

  const today = () => new Date();
  const bigger = Math.max(e.totalAssets, e.totalLiabilities, 1);

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-8">
        <NumberField
          id="age"
          label="Your age (optional)"
          value={age}
          onChange={setAge}
          min={0}
        />

        {(["asset", "liability"] as const).map((kind) => (
          <section key={kind}>
            <h2 className="text-lg font-semibold text-navy dark:text-baby-blue">
              {kind === "asset" ? "What you own" : "What you owe"}
            </h2>
            <div className="mt-3 flex flex-col gap-5">
              {groupsOf(kind).map((g) => {
                const rows = items.filter((i) => i.group === g.id);
                return (
                  <div key={g.id}>
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span
                        className={`h-3 w-3 rounded-sm ${SWATCH[g.id]}`}
                        aria-hidden="true"
                      />
                      {g.label}
                    </p>
                    <p className="ml-5 text-xs text-foreground/50">{g.hint}</p>
                    <div className="mt-2 flex flex-col gap-2">
                      {rows.map((i) => (
                        <div key={i.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                          <input
                            type="text"
                            aria-label={`Name of this ${kind === "asset" ? "asset" : "debt"} in ${g.label}`}
                            value={i.name}
                            placeholder={g.label}
                            onChange={(ev) => update(i.id, { name: ev.target.value })}
                            className="min-w-0 rounded-md border border-border bg-transparent px-3 py-1.5 text-sm outline-none focus:border-navy dark:focus:border-baby-blue"
                          />
                          <div className="flex w-32 items-center rounded-md border border-border px-2 focus-within:border-navy dark:focus-within:border-baby-blue">
                            <span className="text-sm text-foreground/50">$</span>
                            <CurrencyInput
                              ariaLabel={`Amount for ${i.name.trim() || g.label}`}
                              value={i.amount}
                              onChange={(v) => update(i.id, { amount: v })}
                              className="min-w-0 flex-1 bg-transparent px-1.5 py-1.5 text-right text-sm outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setItems((prev) => prev.filter((x) => x.id !== i.id))}
                            aria-label={`Remove ${i.name.trim() || g.label}`}
                            className="rounded-md border border-border px-2 py-1.5 text-sm text-foreground/60 transition-colors hover:bg-surface-hover"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => add(g.id)}
                      className="mt-2 rounded-md border border-border px-3 py-1 text-xs font-medium transition-colors hover:bg-surface-hover"
                    >
                      + Add {kind === "asset" ? "an asset" : "a debt"} here
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <button
          type="button"
          onClick={() =>
            setItems(BLANK.map((i) => ({ ...i, id: nextId.current++ })))
          }
          className="self-start rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-hover"
        >
          Clear it out and start with my own numbers
        </button>
      </div>

      <div className="min-w-0 self-start rounded-lg border border-border bg-surface-hover p-6">
        {!e.hasItems ? (
          <p className="text-sm text-foreground/60">
            Add what you own and what you owe to see your net worth.
          </p>
        ) : (
          <>
            <p className="text-sm text-foreground/60">Your net worth</p>
            <p
              className={
                "mt-1 text-3xl font-semibold " +
                (negative ? NEGATIVE : "text-navy dark:text-baby-blue")
              }
            >
              {dollars(e.netWorth)}
            </p>
            <p className="mt-1 text-sm text-foreground/60">
              {dollars(e.totalAssets)} owned minus {dollars(e.totalLiabilities)} owed.
            </p>
            {negative && (
              <p className="mt-2 text-xs text-foreground/60">
                A negative net worth is common when you&apos;re starting out or
                paying off student loans. What matters most is the direction it
                moves over time.
              </p>
            )}

            <div className="mt-5 flex flex-col gap-2 text-sm">
              {[
                { label: "Assets", amount: e.totalAssets, color: "bg-navy dark:bg-baby-blue" },
                { label: "Liabilities", amount: e.totalLiabilities, color: "bg-[#eb6834] dark:bg-[#d95926]" },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-foreground/70">{row.label}</span>
                    <span className="font-medium">{dollars(row.amount)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-border">
                    <div
                      className={`h-full ${row.color}`}
                      style={{ width: `${(row.amount / bigger) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {e.totalAssets > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-medium text-foreground/50">
                  What you own
                </p>
                <BreakdownList parts={partsFor("asset")} summary="What you own" />
              </div>
            )}
            {e.totalLiabilities > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-medium text-foreground/50">
                  What you owe
                </p>
                <BreakdownList parts={partsFor("liability")} summary="What you owe" />
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-border p-3">
                <p className="text-foreground/50">Quick-access money</p>
                <p className="font-medium">{dollars(e.liquid)}</p>
                <p className="mt-0.5 text-xs text-foreground/50">
                  cash and investments outside retirement accounts
                </p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-foreground/50">Debt vs. what you own</p>
                <p className="font-medium">
                  {e.debtToAssets === null ? "—" : rate1(e.debtToAssets)}
                </p>
                <p className="mt-0.5 text-xs text-foreground/50">
                  of your assets are owed to someone
                </p>
              </div>
            </div>

            {e.benchmark && (
              <div className="mt-3 rounded-md border border-yellow/50 bg-yellow/10 p-3 text-sm">
                People {e.benchmark.label} have a median net worth of about{" "}
                <span className="font-semibold">{dollars(e.benchmark.median)}</span>.{" "}
                {e.benchmark.difference >= 0
                  ? `You're about ${dollars(e.benchmark.difference)} above that.`
                  : `You're about ${dollars(-e.benchmark.difference)} below that.`}
                <span className="mt-1 block text-xs text-foreground/60">
                  From the Federal Reserve&apos;s 2022 Survey of Consumer
                  Finances. Half of people are above the median and half below,
                  and it varies a lot with income, home ownership, and where
                  you live. It&apos;s a reference point, not a grade.
                </span>
              </div>
            )}

            <div className="mt-5 border-t border-border pt-4">
              <p className="text-sm font-medium">Take it with you</p>
              <p className="mt-1 text-xs text-foreground/50">
                A spreadsheet with your numbers, live totals, and a History tab
                for tracking your net worth month to month.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const now = today();
                    download(
                      netWorthFilename(now, "xlsx"),
                      buildNetWorthWorkbook(items, now) as BlobPart,
                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    );
                  }}
                  className="rounded-md bg-navy px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:bg-baby-blue dark:text-navy"
                >
                  Download spreadsheet (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = today();
                    download(
                      netWorthFilename(now, "csv"),
                      buildNetWorthCsv(items, now),
                      "text/csv;charset=utf-8",
                    );
                  }}
                  className="rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-hover"
                >
                  Download CSV
                </button>
              </div>
              <p className="mt-3 text-xs text-foreground/50">
                Private: everything you type stays in your browser. It isn&apos;t
                sent or saved anywhere, so download your file before you leave.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
