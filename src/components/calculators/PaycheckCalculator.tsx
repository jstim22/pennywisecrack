"use client";

import { useMemo, useState } from "react";
import NumberField from "./NumberField";
import Disclosure from "./Disclosure";
import Segmented from "./Segmented";
import StateSelect from "./StateSelect";
import {
  HSA_LIMIT_FAMILY,
  HSA_LIMIT_SELF_ONLY,
  MEDICARE_RATE,
  OVERTIME_MULTIPLIER,
  OVERTIME_THRESHOLD_HOURS,
  PAY_FREQUENCIES,
  RETIREMENT_DEFERRAL_LIMIT,
  SOCIAL_SECURITY_RATE,
  STANDARD_DEDUCTION,
  TAX_YEAR,
  estimatePaycheck,
  type PayFrequency,
  type PayType,
  type PaycheckInputs,
  type RetirementType,
} from "@/lib/paycheckTax";
import { getState } from "@/lib/stateTax";
import { pct, usd } from "@/lib/format";

export default function PaycheckCalculator() {
  const [payType, setPayType] = useState<PayType>("hourly");
  const [wage, setWage] = useState(15);
  const [hours, setHours] = useState(10);
  const [salary, setSalary] = useState(12_000);
  const [payFrequency, setPayFrequency] = useState<PayFrequency>("biweekly");
  const [stateCode, setStateCode] = useState("");
  const [tips, setTips] = useState(0);
  const [retirementPct, setRetirementPct] = useState(0);
  const [retirementType, setRetirementType] =
    useState<RetirementType>("traditional");
  const [insurancePre, setInsurancePre] = useState(0);
  const [insurancePost, setInsurancePost] = useState(0);
  const [hsa, setHsa] = useState(0);
  const [otherPreTax, setOtherPreTax] = useState(0);
  const [otherPostTax, setOtherPostTax] = useState(0);
  const [skipFica, setSkipFica] = useState(false);

  const { estimate, withoutRetirement } = useMemo(() => {
    const inputs: PaycheckInputs = {
      payType,
      hourlyWage: wage,
      hoursPerWeek: hours,
      tipsPerWeek: tips,
      annualSalary: salary,
      payFrequency,
      stateCode,
      retirementPct,
      retirementType,
      insurancePreTaxPerPaycheck: insurancePre,
      insurancePostTaxPerPaycheck: insurancePost,
      hsaPerPaycheck: hsa,
      otherPreTaxPerPaycheck: otherPreTax,
      otherPostTaxPerPaycheck: otherPostTax,
      skipFica,
    };
    return {
      estimate: estimatePaycheck(inputs),
      // Used to show what saving for retirement really costs your paycheck.
      withoutRetirement:
        retirementPct > 0
          ? estimatePaycheck({ ...inputs, retirementPct: 0 })
          : null,
    };
  }, [
    payType,
    wage,
    hours,
    tips,
    salary,
    payFrequency,
    stateCode,
    retirementPct,
    retirementType,
    insurancePre,
    insurancePost,
    hsa,
    otherPreTax,
    otherPostTax,
    skipFica,
  ]);

  const p = estimate.perPaycheck;
  const stateRule = getState(stateCode);
  const every = PAY_FREQUENCIES.find((f) => f.value === payFrequency)!.every;
  const hasPay = p.gross > 0;
  const keptPct = hasPay ? Math.round((p.takeHome / p.gross) * 100) : 0;
  const savedPct = hasPay
    ? Math.round(((p.retirement + p.hsa) / p.gross) * 100)
    : 0;
  const savedFor = [
    p.retirement > 0.005 && "retirement",
    p.hsa > 0.005 && "your HSA",
  ]
    .filter(Boolean)
    .join(" and ");
  const retirementCost = withoutRetirement
    ? withoutRetirement.perPaycheck.takeHome - p.takeHome
    : 0;

  const breakdown = [
    {
      key: "takeHome",
      label: "Take-home pay",
      amount: p.takeHome,
      swatch: "bg-navy dark:bg-baby-blue",
      always: true,
    },
    {
      key: "retirement",
      label: `${retirementType === "roth" ? "Roth " : ""}401(k)/403(b) savings`,
      amount: p.retirement,
      swatch: "bg-foreground/60",
    },
    {
      key: "insurance",
      label:
        p.insurancePreTax > 0.005 && p.insurancePostTax > 0.005
          ? "Insurance (pre- & post-tax)"
          : "Insurance premiums",
      amount: p.insurance,
      swatch: "bg-foreground/50",
    },
    {
      key: "hsa",
      label: "HSA savings",
      amount: p.hsa,
      swatch: "bg-foreground/40",
    },
    {
      key: "otherPreTax",
      label: "Other pre-tax deductions",
      amount: p.otherPreTax,
      swatch: "bg-foreground/30",
    },
    {
      key: "otherPostTax",
      label: "Other post-tax deductions",
      amount: p.otherPostTax,
      swatch: "bg-foreground/20",
    },
    {
      key: "federal",
      label: "Federal income tax",
      amount: p.federal,
      swatch: "bg-yellow",
      always: true,
    },
    {
      key: "socialSecurity",
      label: `Social Security (${pct(SOCIAL_SECURITY_RATE * 100)})`,
      amount: p.socialSecurity,
      swatch: "bg-yellow/75",
      always: true,
    },
    {
      key: "medicare",
      label: `Medicare (${pct(MEDICARE_RATE * 100)})`,
      amount: p.medicare,
      swatch: "bg-yellow/55",
      always: true,
    },
    {
      key: "state",
      label: stateRule
        ? `State income tax (${stateRule.code})`
        : "State income tax",
      amount: p.state,
      swatch: "bg-yellow/35",
      always: true,
    },
  ].filter((b) => b.always || b.amount > 0.005);

  const barSegments = breakdown.filter((b) => b.amount > 0.005);

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-4">
        <div>
          <span className="text-sm font-medium text-foreground/80">
            How are you paid?
          </span>
          <Segmented
            options={[
              { value: "hourly", label: "Hourly" },
              { value: "salary", label: "Salary" },
            ]}
            value={payType}
            onChange={setPayType}
          />
        </div>

        {payType === "hourly" ? (
          <>
            <NumberField
              id="wage"
              label="Hourly wage"
              value={wage}
              onChange={setWage}
              prefix="$"
            />
            <div>
              <NumberField
                id="hours"
                label="Hours per week"
                value={hours}
                onChange={setHours}
                suffix="hrs"
              />
              <p className="mt-1.5 text-xs text-foreground/50">
                Hours over {OVERTIME_THRESHOLD_HOURS} in a week count as
                overtime and pay {OVERTIME_MULTIPLIER}×.
              </p>
            </div>
          </>
        ) : (
          <NumberField
            id="salary"
            label="Annual salary"
            value={salary}
            onChange={setSalary}
            prefix="$"
          />
        )}

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

        <StateSelect value={stateCode} onChange={setStateCode} />

        <Disclosure title="Advanced settings">
          <div>
            <NumberField
              id="retirementPct"
              label="401(k) / 403(b) contribution (% of your pay)"
              value={retirementPct}
              onChange={setRetirementPct}
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
              Traditional comes out before income tax, so it lowers your tax
              bill today. Roth comes out after tax, but you generally won&apos;t
              owe tax on it when you take it out in retirement. The{" "}
              {TAX_YEAR} limit is ${RETIREMENT_DEFERRAL_LIMIT.toLocaleString()}{" "}
              a year.
            </p>
          </div>

          <div>
            <NumberField
              id="insurancePreTax"
              label="Insurance premiums, pre-tax (per paycheck)"
              value={insurancePre}
              onChange={setInsurancePre}
              prefix="$"
            />
            <p className="mt-1.5 text-xs text-foreground/50">
              Usually employer medical, dental, and vision plans. These come
              out before income tax and also lower your Social Security and
              Medicare tax.
            </p>
          </div>

          <div>
            <NumberField
              id="insurancePostTax"
              label="Insurance premiums, post-tax (per paycheck)"
              value={insurancePost}
              onChange={setInsurancePost}
              prefix="$"
            />
            <p className="mt-1.5 text-xs text-foreground/50">
              Coverage taken out after tax, like some supplemental life or
              accident plans. Your pay stub shows which is which. If you have
              both kinds, enter each here.
            </p>
          </div>

          <div>
            <NumberField
              id="hsa"
              label="HSA contribution (per paycheck)"
              value={hsa}
              onChange={setHsa}
              prefix="$"
            />
            <p className="mt-1.5 text-xs text-foreground/50">
              A health savings account requires a high-deductible health plan.
              It comes out before federal income tax and Social Security and
              Medicare tax. {TAX_YEAR} limits: $
              {HSA_LIMIT_SELF_ONLY.toLocaleString()} for self-only coverage, $
              {HSA_LIMIT_FAMILY.toLocaleString()} for family (employer
              contributions count toward these).
              {estimate.stateTaxesHsa &&
                stateRule &&
                ` ${stateRule.name} doesn't give HSA contributions a state tax break.`}
            </p>
          </div>

          <div>
            <NumberField
              id="otherPreTax"
              label="Other pre-tax deductions (per paycheck)"
              value={otherPreTax}
              onChange={setOtherPreTax}
              prefix="$"
            />
            <p className="mt-1.5 text-xs text-foreground/50">
              Like an FSA or commuter benefits.
            </p>
          </div>

          <div>
            <NumberField
              id="otherPostTax"
              label="Other post-tax deductions (per paycheck)"
              value={otherPostTax}
              onChange={setOtherPostTax}
              prefix="$"
            />
            <p className="mt-1.5 text-xs text-foreground/50">
              Like union dues, uniform costs, or charity giving.
            </p>
          </div>

          {payType === "hourly" && (
            <Disclosure title="Tips">
              <div>
                <NumberField
                  id="tips"
                  label="Tips per week"
                  value={tips}
                  onChange={setTips}
                  prefix="$"
                />
                <p className="mt-1.5 text-xs text-foreground/50">
                  Tips are taxed just like the rest of your pay.
                </p>
              </div>
            </Disclosure>
          )}

          <label className="flex items-start justify-between gap-3 text-sm font-medium text-foreground/80">
            <span>
              My job doesn&apos;t take out Social Security &amp; Medicare
              <span className="mt-0.5 block text-xs font-normal text-foreground/50">
                Some jobs skip these, like working for your parents&apos;
                business while under 18, or working for your own school as a
                student. If you&apos;re not sure, leave this off.
              </span>
            </span>
            <input
              type="checkbox"
              checked={skipFica}
              onChange={(e) => setSkipFica(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-navy dark:accent-baby-blue"
            />
          </label>
        </Disclosure>
      </div>

      <div className="min-w-0 rounded-lg border border-border bg-surface-hover p-6">
        <p className="text-sm text-foreground/60">
          Your estimated paycheck, paid {every}
        </p>
        <p className="mt-1 text-3xl font-semibold text-navy dark:text-baby-blue">
          {usd(p.takeHome)}
        </p>
        <p className="mt-1 text-xs text-foreground/50">
          {hasPay
            ? `${usd(p.gross)} gross — you keep about ${keptPct}%${
                savedFor ? `, plus ${savedPct}% saved for ${savedFor}` : ""
              }`
            : payType === "hourly"
              ? "Enter a wage and hours to see your paycheck"
              : "Enter a salary to see your paycheck"}
        </p>

        {hasPay && (
          <>
            <div
              role="img"
              aria-label={`Where your ${usd(p.gross)} paycheck goes: ${barSegments
                .map((b) => `${b.label} ${usd(b.amount)}`)
                .join(", ")}`}
              className="mt-4 flex h-3 w-full gap-0.5 overflow-hidden rounded-full"
            >
              {barSegments.map((b) => (
                <div
                  key={b.key}
                  className={b.swatch}
                  style={{ width: `${(b.amount / p.gross) * 100}%` }}
                />
              ))}
            </div>

            <ul className="mt-4 flex flex-col gap-2 text-sm">
              {breakdown.map((b) => (
                <li key={b.key} className="flex items-center justify-between gap-3">
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

            {(estimate.overtimeHours > 0 || p.tips > 0) && (
              <p className="mt-3 text-xs text-foreground/50">
                Gross includes {usd(p.regularPay)} regular pay
                {estimate.overtimeHours > 0 &&
                  `, ${usd(p.overtimePay)} overtime (${estimate.overtimeHours} hrs a week)`}
                {p.tips > 0 && `, and ${usd(p.tips)} in tips`}.
              </p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-border p-3">
                <p className="text-foreground/50">Per week</p>
                <p className="font-medium">{usd(estimate.takeHomeWeekly)}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-foreground/50">Per month</p>
                <p className="font-medium">{usd(estimate.takeHomeMonthly)}</p>
              </div>
            </div>
            <div className="mt-3 rounded-md border border-navy/40 bg-navy/5 p-3 text-sm dark:border-baby-blue/40 dark:bg-baby-blue/10">
              <p className="text-foreground/50">Per year</p>
              <p className="font-semibold text-navy dark:text-baby-blue">
                {usd(estimate.takeHomeYear)}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              {estimate.deductionsExceedPay && (
                <div className="rounded-md border border-yellow/50 bg-yellow/10 p-3 text-sm">
                  Your deductions add up to more than your pay, so double-check
                  the amounts you entered.
                </div>
              )}
              {estimate.underStandardDeduction && (
                <div className="rounded-md border border-yellow/50 bg-yellow/10 p-3 text-sm">
                  Your taxable pay over a full year would be about{" "}
                  <span className="font-semibold">
                    {usd(estimate.federalWages)}
                  </span>
                  , which is under the{" "}
                  <span className="font-semibold">
                    {usd(STANDARD_DEDUCTION)}
                  </span>{" "}
                  standard deduction — so you likely owe{" "}
                  <span className="font-semibold">no federal income tax</span>.
                  {!skipFica &&
                    " Social Security and Medicare still come out of every paycheck."}
                </div>
              )}
              {p.hsa > 0.005 && (
                <div className="rounded-md border border-yellow/50 bg-yellow/10 p-3 text-sm">
                  You&apos;re putting{" "}
                  <span className="font-semibold">{usd(p.hsa)}</span> a
                  paycheck ({usd(p.hsa * estimate.periods)} a year) into your
                  HSA. It&apos;s still your money for medical costs, and it
                  skips federal income tax and Social Security and Medicare tax
                  {stateRule &&
                    stateRule.brackets.length > 0 &&
                    !estimate.stateTaxesHsa &&
                    ", plus state income tax"}
                  .
                  {estimate.hsaCapped &&
                    ` (Capped at the ${TAX_YEAR} family limit of $${HSA_LIMIT_FAMILY.toLocaleString()}.)`}
                </div>
              )}
              {p.retirement > 0.005 && (
                <div className="rounded-md border border-yellow/50 bg-yellow/10 p-3 text-sm">
                  You&apos;re saving{" "}
                  <span className="font-semibold">{usd(p.retirement)}</span> a
                  paycheck ({usd(p.retirement * estimate.periods)} a year) for
                  retirement.
                  {retirementType === "traditional" ? (
                    <>
                      {" "}
                      Because it&apos;s pre-tax, it only lowers your take-home
                      by{" "}
                      <span className="font-semibold">
                        {usd(retirementCost)}
                      </span>
                      .
                    </>
                  ) : (
                    " Roth contributions don't lower today's taxes, so your take-home drops by the full amount."
                  )}
                  {estimate.retirementCapped &&
                    ` (Capped at the ${TAX_YEAR} limit of $${RETIREMENT_DEFERRAL_LIMIT.toLocaleString()}.)`}
                </div>
              )}
            </div>
          </>
        )}

        <p className="mt-5 text-xs text-foreground/50">
          An estimate, not tax advice. Federal figures use {TAX_YEAR} rules for
          a single filer with no other income. State figures use {TAX_YEAR}{" "}
          rates and standard deductions but skip local taxes, phase-outs, and
          state payroll programs like disability or paid-leave insurance. Weekly,
          monthly, and yearly figures assume steady pay all year. Your pay stub
          has the real numbers.
        </p>
      </div>
    </div>
  );
}
