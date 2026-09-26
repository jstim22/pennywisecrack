// Net worth = what you own (assets) minus what you owe (liabilities).

export type ItemKind = "asset" | "liability";

export type GroupId =
  | "cash"
  | "investments"
  | "retirement"
  | "property"
  | "otherAssets"
  | "housingDebt"
  | "loans"
  | "cards"
  | "otherDebt";

export const GROUPS: {
  id: GroupId;
  kind: ItemKind;
  label: string;
  hint: string;
  // Counts as money you could get at quickly.
  liquid?: boolean;
}[] = [
  { id: "cash", kind: "asset", label: "Cash & bank accounts", hint: "Checking, savings, emergency fund.", liquid: true },
  { id: "investments", kind: "asset", label: "Investments", hint: "Brokerage accounts, stocks, funds, crypto.", liquid: true },
  { id: "retirement", kind: "asset", label: "Retirement accounts", hint: "401(k), 403(b), IRA, HSA, pension value." },
  { id: "property", kind: "asset", label: "Property & belongings", hint: "What you could sell them for: home, car, valuables." },
  { id: "otherAssets", kind: "asset", label: "Other assets", hint: "A business you own, money people owe you." },
  { id: "housingDebt", kind: "liability", label: "Home loans", hint: "Mortgage, home equity loan or line." },
  { id: "loans", kind: "liability", label: "Loans", hint: "Car, student, and personal loans." },
  { id: "cards", kind: "liability", label: "Credit cards", hint: "Balances you're carrying." },
  { id: "otherDebt", kind: "liability", label: "Other debts", hint: "Medical bills, money you owe friends or family, taxes owed." },
];

export type NetWorthItem = {
  id: number;
  group: GroupId;
  name: string;
  amount: number;
};

export function groupsOf(kind: ItemKind) {
  return GROUPS.filter((g) => g.kind === kind);
}

// Median net worth by age of the head of household, from the Federal
// Reserve's 2022 Survey of Consumer Finances (in 2022 dollars, rounded).
export const MEDIAN_NET_WORTH_BY_AGE: { from: number; to: number | null; label: string; median: number }[] = [
  { from: 0, to: 34, label: "under 35", median: 39_000 },
  { from: 35, to: 44, label: "35 to 44", median: 135_000 },
  { from: 45, to: 54, label: "45 to 54", median: 247_000 },
  { from: 55, to: 64, label: "55 to 64", median: 364_000 },
  { from: 65, to: 74, label: "65 to 74", median: 410_000 },
  { from: 75, to: null, label: "75 and older", median: 335_000 },
];

export function medianForAge(age: number) {
  if (!Number.isFinite(age) || age <= 0) return null;
  return (
    MEDIAN_NET_WORTH_BY_AGE.find((b) => age >= b.from && (b.to === null || age <= b.to)) ?? null
  );
}

function clean(n: number) {
  return Number.isFinite(n) ? Math.max(n, 0) : 0;
}

export function estimateNetWorth(items: NetWorthItem[], age = 0) {
  const total = (pred: (i: NetWorthItem) => boolean) =>
    items.filter(pred).reduce((s, i) => s + clean(i.amount), 0);

  const byGroup = Object.fromEntries(
    GROUPS.map((g) => [g.id, total((i) => i.group === g.id)]),
  ) as Record<GroupId, number>;

  const totalAssets = GROUPS.filter((g) => g.kind === "asset").reduce((s, g) => s + byGroup[g.id], 0);
  const totalLiabilities = GROUPS.filter((g) => g.kind === "liability").reduce((s, g) => s + byGroup[g.id], 0);
  const liquid = GROUPS.filter((g) => g.liquid).reduce((s, g) => s + byGroup[g.id], 0);
  const benchmark = medianForAge(age);

  return {
    byGroup,
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    // Money you could get at quickly, minus everything you owe.
    liquid,
    liquidNetWorth: liquid - totalLiabilities,
    // Share of what you own that's owed to someone else.
    debtToAssets: totalAssets > 0 ? totalLiabilities / totalAssets : null,
    hasItems: totalAssets > 0 || totalLiabilities > 0,
    benchmark: benchmark
      ? {
          label: benchmark.label,
          median: benchmark.median,
          difference: totalAssets - totalLiabilities - benchmark.median,
          ratio: benchmark.median > 0 ? (totalAssets - totalLiabilities) / benchmark.median : 0,
        }
      : null,
  };
}
