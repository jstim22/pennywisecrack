import type { Metadata } from "next";
import Link from "next/link";
import BudgetCalculator from "@/components/calculators/BudgetCalculator";

export const metadata: Metadata = {
  title: "Budget Buckets Calculator — PennyWisecrack",
};

export default function BudgetPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/calculators"
        className="text-sm font-medium text-navy hover:underline dark:text-baby-blue"
      >
        ← All calculators
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-navy dark:text-baby-blue">
        Budget Buckets Calculator
      </h1>
      <p className="mt-2 text-foreground/70">
        Find out how much you can spend each month. Split your pay into
        buckets: housing, other needs, wants, and savings.
      </p>

      <div className="mt-10">
        <BudgetCalculator />
      </div>
    </div>
  );
}
