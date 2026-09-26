"use client";

import { useMemo, useState } from "react";
import NumberField from "./NumberField";
import Disclosure from "./Disclosure";
import Segmented from "./Segmented";
import StateSelect from "./StateSelect";
import LocalSelect from "./LocalSelect";
import {
  MEDICARE_RATE,
  PAY_FREQUENCIES,
  RETIREMENT_DEFERRAL_LIMIT,
  SOCIAL_SECURITY_RATE,
  TAX_YEAR,
  type PayFrequency,
  type RetirementType,
} from "@/lib/paycheckTax";
import {
  ADDITIONAL_MEDICARE_RATE,
  SUPPLEMENTAL_RATE,
  SUPPLEMENTAL_RATE_OVER_THRESHOLD,
  SUPPLEMENTAL_THRESHOLD,
  estimateBonus,
  type BonusInputs,
  type WithholdingMethod,
} from "@/lib/bonusTax";
import { getState } from "@/lib/stateTax";
import { pct, usd } from "@/lib/format";

export default function BonusCalculator() {
  const [bonus, setBonus] = useState(2_000);
  const [annualPay, setAnnualPay] = useState(40_000);
  const [stateCode, setStateCode] = useState("");
  const [localId, setLocalId] = useState("");
  const [localCustomRate, setLocalCustomRate] = useState(0);
  const [method, setMethod] = useState<WithholdingMethod>("flat");
  const [payFrequency, setPayFrequency] = useState<PayFrequency>("biweekly");
  const [bonusRetirementPct, setBonusRetirementPct] = useState(0);
  const [retirementType, setRetirementType] =
    useState<RetirementType>("traditional");
  // null = use the automatic rate for the chosen state.
  const [stateRateOverride, setStateRateOverride] = useState<number | null>(
    null,
  );

  // A different state means a different rate and different local taxes, so
  // start those answers over.
  function handleStateChange(code: string) {
    setStateCode(code);
    setStateRateOverride(null);
    setLocalId("");
    setLocalCustomRate(0);
  }

  const { estimate, withoutRetirement } = useMemo(() => {
    const inputs: BonusInputs = {
      bonus,
      annualPay,
      stateCode,
      stateBonusRatePct: stateRateOverride,
      localId,
      localCustomRatePct: localCustomRate,
      method,
      payFrequency,
      bonusRetirementPct,
      retirementType,
    };
    return {
      estimate: estimateBonus(inputs),
      // Used to show what saving part of the bonus really costs your check.
      withoutRetirement:
        bonusRetirementPct > 0
          ? estimateBonus({ ...inputs, bonusRetirementPct: 0 })
          : null,
    };
  }, [
    bonus,
    annualPay,
    stateCode,
    stateRateOverride,
    localId,
    localCustomRate,
    method,
    payFrequency,
    bonusRetirementPct,
    retirementType,
  ]);

  const e = estimate;
  const stateRule = getState(stateCode);
  const hasBonus = e.bonus > 0;
  const keptPct = hasBonus ? Math.round((e.takeHome / e.bonus) * 100) : 0;
  const retirementCost = withoutRetirement
    ? withoutRetirement.takeHome - e.takeHome
    : 0;

  const autoStateRate = Math.round(e.stateAutoRatePct * 100) / 100;
  const shownStateRate = stateRateOverride ?? autoStateRate;

  let stateRateNote: string;
  if (!stateRule) {
    stateRateNote = "Pick your state above and this fills in automatically.";
  } else if (stateRule.brackets.length === 0) {
    stateRateNote = `${stateRule.name} doesn't tax wages, so there's nothing to withhold.`;
  } else if (e.stateRateIsFlat) {
    stateRateNote = `${stateRule.name} tells employers to withhold a flat ${stateRule.bonusWithholdingRatePct}% on bonuses. Change it if your pay stub shows something different.`;
  } else {
    stateRateNote = `Estimated from ${stateRule.name}'s regular tax rates. Some states withhold a flat rate on bonuses instead, so change it if your pay stub shows something different.`;
  }

  const federalLabel =
    method === "flat"
      ? `Federal income tax (${pct(SUPPLEMENTAL_RATE * 100)}${
          e.overMillion ? " / 37%" : ""
        } flat)`
      : "Federal income tax (combined)";

  const breakdown = [
    {
      key: "takeHome",
      label: "You keep",
      amount: e.takeHome,
      swatch: "bg-navy dark:bg-baby-blue",
      always: true,
    },
    {
      key: "retirement",
      label: `${retirementType === "roth" ? "Roth " : ""}401(k)/403(b) savings`,
      amount: e.bonusDeferral,
      swatch: "bg-foreground/60",
    },
    {
      key: "federal",
      label: federalLabel,
      amount: e.federalWithheld,
      swatch: "bg-yellow",
      always: true,
    },
    {
      key: "socialSecurity",
      label: `Social Security (${pct(SOCIAL_SECURITY_RATE * 100)})`,
      amount: e.socialSecurity,
      swatch: "bg-yellow/75",
      always: true,
    },
    {
      key: "medicare",
      label: `Medicare (${pct(MEDICARE_RATE * 100)})`,
      amount: e.medicare,
      swatch: "bg-yellow/55",
      always: true,
    },
    {
      key: "additionalMedicare",
      label: `Extra Medicare (${pct(ADDITIONAL_MEDICARE_RATE * 100)})`,
      amount: e.additionalMedicare,
      swatch: "bg-yellow/45",
    },
    {
      key: "state",
      label: stateRule
        ? `State income tax (${stateRule.code})`
        : "State income tax",
      amount: e.stateWithheld,
      swatch: "bg-yellow/35",
      always: true,
    },
    {
      key: "local",
      label: e.localName
        ? `Local income tax (${e.localName})`
        : "Local income tax",
      amount: e.localWithheld,
      swatch: "bg-yellow/25",
    },
  ].filter((b) => b.always || b.amount > 0.005);

  const barSegments = breakdown.filter((b) => b.amount > 0.005);

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-4">
        <NumberField
          id="bonus"
          label="Bonus amount (before taxes)"
          value={bonus}
          onChange={setBonus}
          prefix="$"
        />

        <div>
          <NumberField
            id="annualPay"
            label="Your yearly pay before the bonus"
            value={annualPay}
            onChange={setAnnualPay}
            prefix="$"
          />
          <p className="mt-1.5 text-xs text-foreground/50">
            Your gross pay for the year, not counting this bonus. It decides
            which tax brackets your bonus lands in.
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
          <div>
            <span className="text-sm font-medium text-foreground/80">
              How your employer withholds federal tax
            </span>
            <Segmented
              options={[
                { value: "flat", label: "Flat 22% (most common)" },
                { value: "aggregate", label: "Combined with a paycheck" },
              ]}
              value={method}
              onChange={setMethod}
            />
            <p className="mt-1.5 text-xs text-foreground/50">
              A flat rate on the bonus alone is the most common. Some
              employers instead add the bonus to a regular paycheck and
              withhold on the total, which can take out more (or less) up
              front.
            </p>
          </div>

          {method === "aggregate" && (
            <div>
              <span className="text-sm font-medium text-foreground/80">
                How often do you get paid?
              </span>
              <Segmented
                options={PAY_FREQUENCIES}
                value={payFrequency}
                onChange={setPayFrequency}
              />
            </div>
          )}

          <div>
            <NumberField
              id="bonusRetirement"
              label="401(k) / 403(b) from your bonus (% of bonus)"
              value={bonusRetirementPct}
              onChange={setBonusRetirementPct}
              suffix="%"
              step={0.5}
            />
            <Segmented
              options={[
                { value: "traditional", label: "Traditional (pre-tax)" },
                { value: "roth", label: "Roth (after-tax)" },
              ]}
              value={retirementType}
              onChange={setRetirementType}
            />
            <p className="mt-1.5 text-xs text-foreground/50">
              Traditional comes out before income tax, so it lowers the tax on
              your bonus. Roth comes out after tax. Neither lowers Social
              Security or Medicare tax. The {TAX_YEAR} limit is $
              {RETIREMENT_DEFERRAL_LIMIT.toLocaleString()} a year (this doesn&apos;t
              count anything you contribute from regular pay).
            </p>
          </div>

          <div>
            <NumberField
              id="stateBonusRate"
              label="State withholding rate on your bonus"
              value={shownStateRate}
              onChange={setStateRateOverride}
              suffix="%"
              step={0.05}
            />
            {stateRateOverride !== null && (
              <button
                type="button"
                onClick={() => setStateRateOverride(null)}
                className="mt-1.5 text-xs font-medium text-navy hover:underline dark:text-baby-blue"
              >
                Reset to the automatic {autoStateRate}%
              </button>
            )}
            <p className="mt-1.5 text-xs text-foreground/50">{stateRateNote}</p>
          </div>
        </Disclosure>
      </div>

      <div className="min-w-0 rounded-lg border border-border bg-surface-hover p-6">
        <p className="text-sm text-foreground/60">Your bonus after taxes</p>
        <p className="mt-1 text-3xl font-semibold text-navy dark:text-baby-blue">
          {usd(e.takeHome)}
        </p>
        <p className="mt-1 text-xs text-foreground/50">
          {hasBonus
            ? `${usd(e.bonus)} bonus — you keep about ${keptPct}%${
                e.bonusDeferral > 0.005
                  ? `, plus ${Math.round((e.bonusDeferral / e.bonus) * 100)}% saved for retirement`
                  : ""
              }`
            : "Enter a bonus amount to see what you'd keep"}
        </p>

        {hasBonus && (
          <>
            <div
              role="img"
              aria-label={`Where your ${usd(e.bonus)} bonus goes: ${barSegments
                .map((b) => `${b.label} ${usd(b.amount)}`)
                .join(", ")}`}
              className="mt-4 flex h-3 w-full gap-0.5 overflow-hidden rounded-full"
            >
              {barSegments.map((b) => (
                <div
                  key={b.key}
                  className={b.swatch}
                  style={{ width: `${(b.amount / e.bonus) * 100}%` }}
                />
              ))}
            </div>

            <ul className="mt-4 flex flex-col gap-2 text-sm">
              {breakdown.map((b) => (
                <li
                  key={b.key}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="flex min-w-0 items-center gap-2 text-foreground/70">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-sm ${b.swatch}`}
                      aria-hidden="true"
                    />
                    {b.label}
                  </span>
                  <span
                    className={
                      "shrink-0 " +
                      (b.key === "takeHome"
                        ? "font-semibold text-navy dark:text-baby-blue"
                        : "font-medium")
                    }
                  >
                    {b.key === "takeHome" ? "" : "−"}
                    {usd(b.amount)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-border p-3">
                <p className="text-foreground/50">Income tax withheld</p>
                <p className="font-medium">{usd(e.incomeTaxWithheld)}</p>
              </div>
              <div className="rounded-md border border-navy/40 bg-navy/5 p-3 dark:border-baby-blue/40 dark:bg-baby-blue/10">
                <p className="text-foreground/50">Income tax you&apos;ll owe</p>
                <p className="font-semibold text-navy dark:text-baby-blue">
                  {usd(e.incomeTaxOwed)}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <div className="rounded-md border border-yellow/50 bg-yellow/10 p-3 text-sm">
                {Math.abs(e.settleUp) < 1 ? (
                  <>
                    Bonuses aren&apos;t taxed at a special higher rate —
                    they&apos;re added to your other income for the year. Here
                    the amount withheld lands close to what you&apos;ll
                    actually owe.
                  </>
                ) : e.settleUp > 0 ? (
                  <>
                    Bonuses aren&apos;t taxed at a special higher rate —
                    they&apos;re added to your other income for the year. Your
                    bonus really adds about{" "}
                    <span className="font-semibold">
                      {pct(e.federalEffectiveRate * 100)}
                    </span>{" "}
                    in federal tax, less than the{" "}
                    <span className="font-semibold">
                      {pct(e.federalWithheldRate * 100)}
                    </span>{" "}
                    withheld, so you&apos;d likely get about{" "}
                    <span className="font-semibold">{usd(e.settleUp)}</span>{" "}
                    back when you file.
                  </>
                ) : (
                  <>
                    Bonuses aren&apos;t taxed at a special higher rate —
                    they&apos;re added to your other income for the year. Your
                    bonus really adds about{" "}
                    <span className="font-semibold">
                      {pct(e.federalEffectiveRate * 100)}
                    </span>{" "}
                    in federal tax, more than the{" "}
                    <span className="font-semibold">
                      {pct(e.federalWithheldRate * 100)}
                    </span>{" "}
                    withheld, so you may owe about{" "}
                    <span className="font-semibold">
                      {usd(Math.abs(e.settleUp))}
                    </span>{" "}
                    more when you file.
                  </>
                )}
              </div>

              {e.bonusDeferral > 0.005 && (
                <div className="rounded-md border border-yellow/50 bg-yellow/10 p-3 text-sm">
                  You&apos;re putting{" "}
                  <span className="font-semibold">{usd(e.bonusDeferral)}</span>{" "}
                  of your bonus toward retirement.
                  {retirementType === "traditional" ? (
                    <>
                      {" "}
                      Because it&apos;s pre-tax, it only lowers what you keep
                      by <span className="font-semibold">{usd(retirementCost)}</span>.
                    </>
                  ) : (
                    " Roth contributions don't lower today's taxes, so what you keep drops by the full amount."
                  )}
                </div>
              )}

              {e.retirementCapped && (
                <div className="rounded-md border border-yellow/50 bg-yellow/10 p-3 text-sm">
                  The {TAX_YEAR} limit is $
                  {RETIREMENT_DEFERRAL_LIMIT.toLocaleString()} a year, so only{" "}
                  {usd(e.bonusDeferral)} of your bonus can go in.
                </div>
              )}

              {e.overMillion && (
                <div className="rounded-md border border-yellow/50 bg-yellow/10 p-3 text-sm">
                  Federal withholding on the part of a year&apos;s bonuses over{" "}
                  {usd(SUPPLEMENTAL_THRESHOLD)} is required to be{" "}
                  {pct(SUPPLEMENTAL_RATE_OVER_THRESHOLD * 100)}, so that part
                  is withheld at the higher rate.
                </div>
              )}
            </div>
          </>
        )}

        <p className="mt-5 text-xs text-foreground/50">
          An estimate, not tax advice. Federal figures use {TAX_YEAR} rules for
          a single filer with no other income: the{" "}
          {pct(SUPPLEMENTAL_RATE * 100)} flat rate on bonuses (
          {pct(SUPPLEMENTAL_RATE_OVER_THRESHOLD * 100)} over{" "}
          {usd(SUPPLEMENTAL_THRESHOLD)}) or the combined-paycheck method. State
          tax uses the flat bonus rate where the state publishes one
          (California, New York, Minnesota), an estimate from its regular rates
          elsewhere, or the rate you enter. City and county tax is included
          only where you answer the question above. &ldquo;Tax you&apos;ll
          owe&rdquo; assumes the rest of your year&apos;s withholding matches
          what you owe. Your pay stub has the real numbers.
        </p>
      </div>
    </div>
  );
}
