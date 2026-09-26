// A sinking fund is money set aside a little at a time for a planned expense.
// This works out how long that takes, optionally with the money sitting in a
// high-yield savings account (HYSA) that pays interest once a month.

export type ContributionFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "semimonthly"
  | "monthly"
  | "yearly";

export const CONTRIBUTION_FREQUENCIES: {
  value: ContributionFrequency;
  label: string;
  perYear: number;
}[] = [
  { value: "daily", label: "Daily", perYear: 365 },
  { value: "weekly", label: "Weekly", perYear: 52 },
  { value: "biweekly", label: "Biweekly", perYear: 26 },
  { value: "semimonthly", label: "Semimonthly", perYear: 24 },
  { value: "monthly", label: "Monthly", perYear: 12 },
  { value: "yearly", label: "Yearly", perYear: 1 },
];

const DAYS_PER_YEAR = 365;
const MONTHS_PER_YEAR = 12;
const DAYS_PER_MONTH = DAYS_PER_YEAR / MONTHS_PER_YEAR;
// Stop looking after this long and call it "never".
const MAX_DAYS = DAYS_PER_YEAR * 100;

export function periodsPerYear(frequency: ContributionFrequency) {
  return (
    CONTRIBUTION_FREQUENCIES.find((f) => f.value === frequency)?.perYear ?? 12
  );
}

// The same saving pace expressed for every frequency ($10 a week is about
// $1.42 a day, $43.33 a month, $520 a year).
export function equivalentContributions(
  amount: number,
  frequency: ContributionFrequency,
) {
  const perYear = amount * periodsPerYear(frequency);
  return CONTRIBUTION_FREQUENCIES.map((f) => ({
    ...f,
    amount: perYear / f.perYear,
  }));
}

export type SinkingFundInputs = {
  goal: number;
  saved: number;
  contribution: number;
  frequency: ContributionFrequency;
  // Annual percentage yield of a high-yield savings account, or null when the
  // money isn't earning interest.
  apyPct: number | null;
};

type Run = {
  // Days until the goal is reached, or null if it never gets there.
  days: number | null;
  deposits: number;
  contributed: number;
  interest: number;
};

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function run(
  goal: number,
  saved: number,
  contribution: number,
  frequency: ContributionFrequency,
  apyPct: number,
): Run {
  if (saved >= goal) {
    return { days: 0, deposits: 0, contributed: 0, interest: 0 };
  }
  const depositEvery = DAYS_PER_YEAR / periodsPerYear(frequency);
  // Monthly growth that adds up to exactly the advertised APY over a year.
  const monthlyRate = Math.pow(1 + apyPct / 100, 1 / MONTHS_PER_YEAR) - 1;

  let balance = saved;
  let contributed = 0;
  let interest = 0;
  let deposits = 0;
  let nextDeposit = depositEvery;
  let nextInterest = DAYS_PER_MONTH;

  for (;;) {
    // Interest lands first when both happen on the same day, so a deposit
    // starts earning from the next month.
    const interestNext = monthlyRate > 0 && nextInterest <= nextDeposit + 1e-9;
    const at = interestNext ? nextInterest : nextDeposit;
    if (at > MAX_DAYS) break;

    if (interestNext) {
      const earned = balance * monthlyRate;
      balance += earned;
      interest += earned;
      nextInterest += DAYS_PER_MONTH;
    } else {
      balance += contribution;
      contributed += contribution;
      deposits += 1;
      nextDeposit += depositEvery;
    }
    if (balance >= goal - 1e-9) {
      // Rounded so 12 monthly deposits read as exactly 365 days, not 365.00…01.
      return { days: Math.round(at * 1e6) / 1e6, deposits, contributed, interest };
    }
  }
  return { days: null, deposits, contributed, interest };
}

export function estimateSinkingFund(raw: SinkingFundInputs) {
  const goal = clamp(raw.goal, 0, 1_000_000_000);
  const saved = clamp(raw.saved, 0, 1_000_000_000);
  const contribution = clamp(raw.contribution, 0, 1_000_000_000);
  const apyPct = raw.apyPct === null ? 0 : clamp(raw.apyPct, 0, 30);

  const hasGoal = goal > 0;
  const reached = hasGoal && saved >= goal;
  const canSave = contribution > 0;

  const result =
    !hasGoal || reached || !canSave
      ? null
      : run(goal, saved, contribution, raw.frequency, apyPct);
  // The same plan with no interest, to show what the account is worth.
  const withoutInterest =
    result && apyPct > 0
      ? run(goal, saved, contribution, raw.frequency, 0)
      : null;

  return {
    goal,
    saved,
    hasGoal,
    reached,
    canSave,
    progressPct: goal > 0 ? Math.min((saved / goal) * 100, 100) : 0,
    remaining: Math.max(goal - saved, 0),
    days: result?.days ?? null,
    neverReached: !!result && result.days === null,
    deposits: result?.deposits ?? 0,
    contributed: result?.contributed ?? 0,
    interest: result?.interest ?? 0,
    // How many days sooner the interest gets you there (0 if it doesn't).
    daysSaved:
      result?.days != null && withoutInterest?.days != null
        ? Math.max(withoutInterest.days - result.days, 0)
        : 0,
  };
}

// "9 days", "6 weeks", "14 months", "2 years, 3 months".
export function describeDuration(days: number) {
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  const rounded = Math.ceil(days);
  if (rounded < 14) return plural(Math.max(rounded, 1), "day");
  if (rounded < 60) return plural(Math.round(rounded / 7), "week");
  const totalMonths = Math.round(days / DAYS_PER_MONTH);
  if (totalMonths < 24) return plural(totalMonths, "month");
  const years = Math.floor(totalMonths / MONTHS_PER_YEAR);
  const months = totalMonths % MONTHS_PER_YEAR;
  return months === 0
    ? plural(years, "year")
    : `${plural(years, "year")}, ${plural(months, "month")}`;
}
