import { amortizedPayment } from "./amortization";
import { runStrategy, type ActiveDebt, type StrategyResult } from "./debtPayoff";

// Federal student loan repayment, as of 2026.
//
// Interest rates (fixed for the life of each loan, for loans first disbursed
// July 1, 2026 - June 30, 2027): 6.52% undergraduate, 8.07% graduate/
// professional, 9.07% PLUS. Source: U.S. Department of Education, "Interest
// Rates for Federal Direct Loans First Disbursed Between July 1, 2026 and
// June 30, 2027" (fsapartners.ed.gov).
//
// Repayment plans (Public Law 119-21, in effect July 1, 2026): borrowers with
// new loans choose between the Tiered Standard plan (term set by balance) and
// the Repayment Assistance Plan (RAP). Older loans keep the 10-year Standard
// and 25-year Extended plans. RAP: a percentage of adjusted gross income from
// 1% (AGI $10,001-$20,000) up to 10% (over $100,000), divided by 12, minus $50
// per dependent, at least $10 a month; unpaid interest is waived while you
// make your payments; the balance is forgiven after 360 payments. RAP's
// principal match (which can take up to $50 a month off the balance) is NOT
// counted here, so RAP balances in this tool can shrink more slowly than in
// real life.
export const FEDERAL_RATES_2026_27 = {
  undergraduate: 6.52,
  graduate: 8.07,
  plus: 9.07,
};

export type PlanId = "standard" | "tiered" | "extended" | "custom" | "rap";

export const PLANS: { value: PlanId; label: string; short: string; note: string }[] = [
  {
    value: "standard",
    label: "Standard — 10 years",
    short: "Standard (10 yrs)",
    note: "Fixed payments for 10 years. For loans made before July 1, 2026.",
  },
  {
    value: "tiered",
    label: "Tiered Standard — term based on your balance",
    short: "Tiered Standard",
    note: "Fixed payments for 10, 15, 20, or 25 years depending on how much you owe. For loans made on or after July 1, 2026.",
  },
  {
    value: "extended",
    label: "Extended — 25 years",
    short: "Extended (25 yrs)",
    note: "Lower fixed payments for 25 years, so more interest. For loans made before July 1, 2026.",
  },
  {
    value: "custom",
    label: "Choose your own term",
    short: "Your term",
    note: "Useful for private loans or a refinanced loan.",
  },
  {
    value: "rap",
    label: "Repayment Assistance Plan (RAP) — based on income",
    short: "RAP (income-based)",
    note: "Your payment is a percentage of your income. Unpaid interest is waived, and what's left is forgiven after 30 years.",
  },
];

// Autopay discount on federal Direct Loans: normally 0.25 percentage points
// off your rate while you're in repayment and paying by automatic bank draft.
// From July 1, 2026 through June 30, 2028 the U.S. Department of Education
// raised it to 1 point for borrowers enrolled by September 30, 2026. After
// that it goes back to 0.25 unless the Department extends it. The discount
// lowers the interest you're charged; it doesn't change your required
// payment. (studentaid.gov, "Larger Temporary Interest Rate Reduction for
// Borrowers Enrolled in Auto Pay".)
export const AUTOPAY_STANDARD_DISCOUNT = 0.25;
export const AUTOPAY_TEMPORARY_DISCOUNT = 1;
export const AUTOPAY_ENROLL_DEADLINE = { year: 2026, month: 8, day: 30 }; // Sept 30, 2026
export const AUTOPAY_TEMPORARY_ENDS = { year: 2028, month: 5 }; // June 2028

// How many of your repayment months fall inside the temporary 1% window,
// given today's date (month is 0-based) and how many months until you start
// repaying. The window runs through the end of June 2028.
export function autopayBoostMonths(
  today: { year: number; month: number },
  monthsUntilRepayment: number,
) {
  const monthsLeft =
    (AUTOPAY_TEMPORARY_ENDS.year - today.year) * 12 +
    (AUTOPAY_TEMPORARY_ENDS.month - today.month);
  return Math.max(monthsLeft - Math.max(monthsUntilRepayment, 0), 0);
}

export const RAP_FORGIVENESS_MONTHS = 360;
const RAP_MIN_PAYMENT = 10;
const RAP_DEPENDENT_REDUCTION = 50;
const PENNY = 0.005;

export type Loan = {
  id: number;
  name: string;
  balance: number;
  // Yearly interest rate in percent.
  ratePct: number;
  // Subsidized loans don't build up interest before repayment starts.
  // (Only federal loans can be subsidized.)
  subsidized: boolean;
  // Federal Direct Loan (true unless said otherwise). Private loans don't get
  // the autopay discount.
  federal?: boolean;
};

export type StudentLoanInputs = {
  loans: Loan[];
  // 0 if you're already repaying.
  monthsUntilRepayment: number;
  plan: PlanId;
  customYears: number;
  extraPerMonth: number;
  // Yearly income before taxes; RAP treats it as your adjusted gross income.
  income: number;
  dependents: number;
  // Expected yearly raise, used to move the RAP payment up over time.
  raisePct: number;
  // Paying by autopay. `autopayBoostMonths` is how many repayment months get
  // the larger temporary discount (see autopayBoostMonths); the rest get 0.25.
  autopay?: boolean;
  autopayBoostMonths?: number;
};

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

export { amortizedPayment };

// Tiered Standard term (in months) for a balance, from Public Law 119-21.
export function tieredTermMonths(balance: number) {
  if (balance < 25_000) return 120;
  if (balance < 50_000) return 180;
  if (balance < 100_000) return 240;
  return 300;
}

// RAP's monthly payment for a yearly AGI and number of dependents.
export function rapMonthlyPayment(agi: number, dependents: number) {
  const income = Math.max(agi, 0);
  const percent = Math.min(Math.max(Math.ceil(income / 10_000) - 1, 0), 10);
  const payment =
    (income * (percent / 100)) / 12 -
    RAP_DEPENDENT_REDUCTION * Math.max(dependents, 0);
  return Math.max(payment, RAP_MIN_PAYMENT);
}

type Prepared = { name: string; balance: number; rate: number; federal: boolean }[];
type Discount = ((month: number) => number) | undefined;

export type PlanResult = {
  plan: PlanId;
  // Required payment each month at the start (before any extra).
  monthlyPayment: number;
  // The highest required payment along the way (RAP's grows with your income).
  peakPayment: number;
  // Months of repayment until paid off, or until forgiveness for RAP.
  months: number | null;
  // Balance forgiven at the end (RAP only).
  forgiven: number;
  totalPaid: number;
  totalInterest: number;
  balanceByMonth: number[];
};

function fixedTermPlan(
  prepared: Prepared,
  termMonths: number,
  extra: number,
  plan: PlanId,
  discount: Discount,
): PlanResult {
  const active: ActiveDebt[] = prepared.map((p) => ({
    name: p.name,
    balance: p.balance,
    apr: p.rate,
    // The required payment is set from your regular rate; the autopay
    // discount only changes how much interest is charged.
    minimum: amortizedPayment(p.balance, p.rate, termMonths),
    discountEligible: p.federal,
  }));
  // With no extra, each loan is paid on its own schedule. With extra, we
  // assume you keep paying the same total each month, aimed at the highest
  // rate first, so a paid-off loan's payment moves to the next one.
  const result: StrategyResult = runStrategy(
    active,
    extra,
    extra > 0 ? "avalanche" : "minimums",
    discount,
  );
  const required = active.reduce((s, d) => s + d.minimum, 0);
  return {
    plan,
    monthlyPayment: required,
    peakPayment: required,
    months: result.months,
    forgiven: 0,
    totalPaid: result.totalPaid,
    totalInterest: result.totalInterest,
    balanceByMonth: result.balanceByMonth,
  };
}

function rapPlan(
  prepared: Prepared,
  income: number,
  dependents: number,
  raisePct: number,
  extra: number,
  discount: Discount,
): PlanResult {
  const bal = prepared.map((p) => p.balance);
  const total = () => bal.reduce((s, b) => s + b, 0);
  const balanceByMonth = [total()];
  let totalPaid = 0;
  let totalInterest = 0;
  let months: number | null = null;
  let first = 0;
  let peak = 0;

  for (let m = 1; m <= RAP_FORGIVENESS_MONTHS && months === null; m++) {
    const year = Math.floor((m - 1) / 12);
    const agi = income * Math.pow(1 + raisePct / 100, year);
    const required = rapMonthlyPayment(agi, dependents);
    if (m === 1) first = required;
    peak = Math.max(peak, required);
    const payment = required + extra;

    const off = discount && m ? discount(m) : 0;
    const interest = bal.map(
      (b, i) =>
        (b * Math.max(prepared[i].rate - (prepared[i].federal ? off : 0), 0)) / 1200,
    );
    const monthInterest = interest.reduce((s, x) => s + x, 0);
    const startBalance = total();
    // Pay off at most everything owed (balance plus this month's interest).
    const pay = Math.min(payment, startBalance + monthInterest);

    if (pay >= monthInterest) {
      // Interest is paid in full; the rest goes to principal, split by balance.
      const principal = pay - monthInterest;
      bal.forEach((b, i) => {
        bal[i] = Math.max(b - (principal * b) / startBalance, 0);
      });
      totalInterest += monthInterest;
    } else {
      // The payment doesn't cover the interest: the rest is waived, so the
      // balance stays put instead of growing.
      totalInterest += pay;
    }
    totalPaid += pay;
    if (total() <= PENNY) {
      bal.fill(0);
      months = m;
    }
    balanceByMonth.push(total());
  }

  const forgiven = months === null ? total() : 0;
  return {
    plan: "rap",
    monthlyPayment: first,
    peakPayment: peak,
    months: months ?? RAP_FORGIVENESS_MONTHS,
    forgiven,
    totalPaid,
    totalInterest,
    balanceByMonth,
  };
}

export function estimateStudentLoans(raw: StudentLoanInputs) {
  const monthsUntil = Math.round(clamp(raw.monthsUntilRepayment, 0, 120));
  const extra = clamp(raw.extraPerMonth, 0, 1_000_000_000);
  const income = clamp(raw.income, 0, 1_000_000_000);
  const dependents = Math.round(clamp(raw.dependents, 0, 20));
  const raisePct = clamp(raw.raisePct, 0, 20);
  const customMonths = Math.round(clamp(raw.customYears, 1, 30) * 12);

  const loans = raw.loans
    .map((l, i) => {
      const balance = clamp(l.balance, 0, 1_000_000_000);
      const rate = clamp(l.ratePct, 0, 100);
      const federal = l.federal !== false;
      // Interest builds up until repayment starts, unless the government pays it.
      const built =
        federal && l.subsidized ? 0 : (balance * rate * monthsUntil) / 1200;
      return {
        name: l.name.trim() || `Loan ${i + 1}`,
        borrowed: balance,
        interestBuilt: built,
        balance: balance + built,
        rate,
        federal,
      };
    })
    .filter((l) => l.borrowed > PENNY);

  const prepared: Prepared = loans;
  const empty = loans.length === 0;
  const totalBorrowed = loans.reduce((s, l) => s + l.borrowed, 0);
  const balanceAtStart = loans.reduce((s, l) => s + l.balance, 0);
  const interestBuilt = balanceAtStart - totalBorrowed;
  const tieredMonths = tieredTermMonths(balanceAtStart);

  const termFor: Record<Exclude<PlanId, "rap">, number> = {
    standard: 120,
    tiered: tieredMonths,
    extended: 300,
    custom: customMonths,
  };

  // Autopay: a bigger discount for the first `boost` months of repayment,
  // then the usual 0.25 points.
  const boost = Math.max(Math.round(clamp(raw.autopayBoostMonths ?? 0, 0, 1_200)), 0);
  const autopay = raw.autopay ? (month: number) =>
    month <= boost ? AUTOPAY_TEMPORARY_DISCOUNT : AUTOPAY_STANDARD_DISCOUNT
    : undefined;

  const build = (plan: PlanId, planExtra: number, useAutopay = true): PlanResult => {
    const discount: Discount = useAutopay ? autopay : undefined;
    return plan === "rap"
      ? rapPlan(prepared, income, dependents, raisePct, planExtra, discount)
      : fixedTermPlan(prepared, termFor[plan], planExtra, plan, discount);
  };

  const planIds = PLANS.map((p) => p.value);
  // Every plan with no extra payments, for comparing them fairly.
  const compared = Object.fromEntries(
    planIds.map((id) => [id, build(id, 0)]),
  ) as Record<PlanId, PlanResult>;

  const chosen = build(raw.plan, extra);
  const chosenNoExtra = compared[raw.plan];
  // The same plan with no autopay discount, to show what autopay is worth.
  const chosenNoAutopay = autopay ? build(raw.plan, extra, false) : chosen;
  const hasFederal = loans.some((l) => l.federal);
  const monthlyIncome = income / 12;

  return {
    empty,
    loans,
    totalBorrowed,
    balanceAtStart,
    interestBuilt,
    monthsUntil,
    tieredMonths,
    customMonths,
    extra,
    compared,
    chosen,
    chosenNoExtra,
    // What your extra payment does for the plan you picked.
    monthsSavedByExtra:
      chosen.months !== null && chosenNoExtra.months !== null
        ? chosenNoExtra.months - chosen.months
        : 0,
    interestSavedByExtra: chosenNoExtra.totalInterest - chosen.totalInterest,
    // What autopay saves on the plan you picked (zero without autopay or
    // without a federal loan).
    hasFederal,
    interestSavedByAutopay: chosenNoAutopay.totalInterest - chosen.totalInterest,
    monthsSavedByAutopay:
      chosen.months !== null && chosenNoAutopay.months !== null
        ? chosenNoAutopay.months - chosen.months
        : 0,
    paymentShareOfIncome:
      monthlyIncome > 0 ? chosen.monthlyPayment / monthlyIncome : null,
    borrowedVsIncome: income > 0 ? totalBorrowed / income : null,
    income,
    dependents,
  };
}
