"use client";

import { useState, useSyncExternalStore } from "react";
import NumberField from "./NumberField";
import Segmented from "./Segmented";
import Disclosure from "./Disclosure";
import { usd } from "@/lib/format";
import {
  CONTRIBUTION_FREQUENCIES,
  describeDuration,
  equivalentContributions,
  estimateSinkingFund,
  type ContributionFrequency,
} from "@/lib/sinkingFund";

const AMOUNT_LABELS: Record<ContributionFrequency, string> = {
  daily: "How much can you save per day?",
  weekly: "How much can you save per week?",
  biweekly: "How much can you save every two weeks?",
  semimonthly: "How much can you save twice a month?",
  monthly: "How much can you save per month?",
  yearly: "How much can you save per year?",
};

// Today's date (local midnight), or null while rendering on the server, so the
// "around <date>" text only appears once we know the visitor's real date.
function subscribeToNothing() {
  return () => {};
}
function todayTimestamp() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}
function useToday() {
  const timestamp = useSyncExternalStore(
    subscribeToNothing,
    todayTimestamp,
    () => null,
  );
  return timestamp === null ? null : new Date(timestamp);
}

export default function SinkingFundCalculator() {
  const [goal, setGoal] = useState(150);
  const [saved, setSaved] = useState(20);
  const [frequency, setFrequency] = useState<ContributionFrequency>("weekly");
  const [contribution, setContribution] = useState(10);
  const [highYield, setHighYield] = useState(false);
  const [apy, setApy] = useState(4);

  const today = useToday();

  const plan = estimateSinkingFund({
    goal,
    saved,
    contribution,
    frequency,
    apyPct: highYield ? apy : null,
  });
  const equivalents = equivalentContributions(contribution, frequency);
  const targetDate =
    today && plan.days !== null
      ? new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + Math.ceil(plan.days),
        )
      : null;
  const hasInterest = highYield && apy > 0;

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-4">
        <NumberField
          id="goal"
          label="What are you saving for? (goal amount)"
          value={goal}
          onChange={setGoal}
          prefix="$"
        />
        <NumberField
          id="saved"
          label="How much have you saved already?"
          value={saved}
          onChange={setSaved}
          prefix="$"
        />

        <div>
          <span className="text-sm font-medium text-foreground/80">
            How often do you save?
          </span>
          <Segmented
            options={CONTRIBUTION_FREQUENCIES}
            value={frequency}
            onChange={setFrequency}
            columns={3}
          />
        </div>

        <NumberField
          id="contribution"
          label={AMOUNT_LABELS[frequency]}
          value={contribution}
          onChange={setContribution}
          prefix="$"
        />

        {contribution > 0 && (
          <div>
            <p className="text-xs font-medium text-foreground/50">
              Same pace, every way
            </p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {equivalents.map((e) => {
                const selected = e.value === frequency;
                return (
                  <li
                    key={e.value}
                    className={
                      "flex items-baseline justify-between gap-3 rounded-md border " +
                      (selected
                        ? "border-navy/40 bg-navy/5 px-3 py-2.5 dark:border-baby-blue/40 dark:bg-baby-blue/10"
                        : "border-transparent px-3 py-1")
                    }
                  >
                    <span
                      className={
                        selected
                          ? "text-sm font-medium"
                          : "text-sm text-foreground/60"
                      }
                    >
                      {e.label}
                    </span>
                    <span
                      className={
                        selected
                          ? "text-2xl font-semibold text-navy dark:text-baby-blue"
                          : "text-sm text-foreground/60"
                      }
                    >
                      {usd(e.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <Disclosure title="Advanced settings">
          <label className="flex items-start justify-between gap-3 text-sm font-medium text-foreground/80">
            <span>
              High-yield savings account
              <span className="mt-0.5 block text-xs font-normal text-foreground/50">
                Your savings sit in an account that pays interest, which is
                added to your balance once a month.
              </span>
            </span>
            <input
              type="checkbox"
              checked={highYield}
              onChange={(e) => setHighYield(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-navy dark:accent-baby-blue"
            />
          </label>

          {highYield && (
            <div>
              <NumberField
                id="apy"
                label="Interest rate (APY)"
                value={apy}
                onChange={setApy}
                suffix="%"
                step={0.05}
              />
              <p className="mt-1.5 text-xs text-foreground/50">
                Banks advertise this as the APY — the total you earn in a year
                with monthly compounding. Rates change, so check your
                account&apos;s current one.
              </p>
            </div>
          )}
        </Disclosure>
      </div>

      <div className="min-w-0 rounded-lg border border-border bg-surface-hover p-6">
        {!plan.hasGoal ? (
          <p className="text-sm text-foreground/60">
            Enter how much you&apos;re saving up for to see your timeline.
          </p>
        ) : plan.reached ? (
          <p className="text-lg font-medium">
            You&apos;ve already hit your goal! 🎉
          </p>
        ) : !plan.canSave ? (
          <p className="text-sm text-foreground/60">
            Enter how much you can save to see your timeline.
          </p>
        ) : plan.neverReached ? (
          <p className="text-sm text-foreground/60">
            At this pace it would take more than 100 years. Try saving a bit
            more each time, or a smaller goal.
          </p>
        ) : (
          <>
            <p className="text-sm text-foreground/60">
              At this rate, you&apos;ll reach your goal in
            </p>
            <p className="mt-1 text-3xl font-semibold text-navy dark:text-baby-blue">
              {describeDuration(plan.days ?? 0)}
            </p>
            {targetDate && (
              <p className="mt-1 text-sm text-foreground/60">
                around{" "}
                {targetDate.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-border p-3">
                <p className="text-foreground/50">You put in</p>
                <p className="font-medium">{usd(plan.contributed)}</p>
                <p className="mt-0.5 text-xs text-foreground/50">
                  {plan.deposits.toLocaleString()}{" "}
                  {plan.deposits === 1 ? "deposit" : "deposits"}
                </p>
              </div>
              {hasInterest && (
                <div className="rounded-md border border-border p-3">
                  <p className="text-foreground/50">Interest earned</p>
                  <p className="font-medium text-navy dark:text-baby-blue">
                    {usd(plan.interest)}
                  </p>
                </div>
              )}
            </div>

            {hasInterest && plan.daysSaved >= 1 && (
              <div className="mt-3 rounded-md border border-yellow/50 bg-yellow/10 p-3 text-sm">
                Interest gets you there about{" "}
                <span className="font-semibold text-navy dark:text-baby-blue">
                  {describeDuration(plan.daysSaved)}
                </span>{" "}
                sooner than keeping the money where it earns nothing.
              </div>
            )}
          </>
        )}

        <div className="mt-6">
          <div className="h-2 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full bg-navy dark:bg-baby-blue"
              style={{ width: `${plan.progressPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-foreground/50">
            {usd(plan.saved)} of {usd(plan.goal)} saved
          </p>
        </div>

        {hasInterest && plan.days !== null && (
          <p className="mt-4 text-xs text-foreground/50">
            Interest is an estimate — real accounts can change their rate at
            any time.
          </p>
        )}
      </div>
    </div>
  );
}
