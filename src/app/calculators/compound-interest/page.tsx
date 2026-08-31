import type { Metadata } from "next";
import Link from "next/link";
import CompoundInterestCalculator from "@/components/calculators/CompoundInterestCalculator";

export const metadata: Metadata = {
  title: "Compound Interest Calculator — PennyWisecrack",
};

export default function CompoundInterestPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/calculators"
        className="text-sm font-medium text-navy hover:underline dark:text-baby-blue"
      >
        ← All calculators
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-navy dark:text-baby-blue">
        Compound Interest Calculator
      </h1>
      <p className="mt-2 text-foreground/70">
        Watch how a little savings can grow into a lot over time.
      </p>

      <div className="mt-10">
        <CompoundInterestCalculator />
      </div>
    </div>
  );
}
