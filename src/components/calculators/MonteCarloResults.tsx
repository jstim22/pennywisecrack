import { money } from "@/lib/format";

export default function MonteCarloResults({
  scenarios,
}: {
  scenarios: { p10: number; p50: number; p90: number };
}) {
  return (
    <div className="mt-6">
      <p className="mb-2 text-xs font-medium text-foreground/50">
        Monte Carlo outcomes
      </p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md border border-border p-3">
          <p className="text-xs text-foreground/50">10th percentile</p>
          <p className="mt-1 text-sm font-medium">${money(scenarios.p10)}</p>
        </div>
        <div className="rounded-md border border-navy/40 bg-navy/5 p-3 dark:border-baby-blue/40 dark:bg-baby-blue/10">
          <p className="text-xs text-foreground/50">Median</p>
          <p className="mt-1 text-sm font-medium text-navy dark:text-baby-blue">
            ${money(scenarios.p50)}
          </p>
        </div>
        <div className="rounded-md border border-border p-3">
          <p className="text-xs text-foreground/50">90th percentile</p>
          <p className="mt-1 text-sm font-medium">${money(scenarios.p90)}</p>
        </div>
      </div>
    </div>
  );
}
