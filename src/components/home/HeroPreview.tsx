import Link from "next/link";

// A small, real-looking taste of the Budget Buckets calculator. The numbers
// are the calculator's own default example ($4,000 a month, split 25 / 25 / 25
// / 25), so what you see here is what you get when you click through.
const BUCKETS = [
  { label: "Housing", amount: "$1,000", color: "bg-[#2a78d6] dark:bg-[#3987e5]" },
  { label: "Other needs", amount: "$1,000", color: "bg-[#eb6834] dark:bg-[#d95926]" },
  { label: "Wants", amount: "$1,000", color: "bg-[#1baf7a] dark:bg-[#199e70]" },
  { label: "Savings", amount: "$1,000", color: "bg-[#eda100] dark:bg-[#c98500]" },
];

export default function HeroPreview() {
  return (
    <Link
      href="/calculators/budget"
      className="group block rounded-2xl border border-border bg-background p-6 shadow-xl shadow-navy/10 transition-transform hover:-translate-y-0.5 dark:shadow-black/30"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
        Example
      </p>
      <p className="mt-1 text-lg font-semibold text-navy dark:text-baby-blue">
        Where does $4,000 a month go?
      </p>

      <div className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        {BUCKETS.map((b) => (
          <div key={b.label} className={`${b.color} flex-1`} />
        ))}
      </div>

      <ul className="mt-4 flex flex-col gap-2.5 text-sm">
        {BUCKETS.map((b) => (
          <li key={b.label} className="flex items-center gap-3">
            <span className={`h-3 w-3 rounded-sm ${b.color}`} aria-hidden="true" />
            <span className="flex-1">{b.label}</span>
            <span className="font-medium">{b.amount}</span>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-sm font-medium text-navy group-hover:underline dark:text-baby-blue">
        Try the Budget Buckets calculator →
      </p>
    </Link>
  );
}
