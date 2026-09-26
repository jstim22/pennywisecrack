import type { Metadata } from "next";
import Link from "next/link";
import SavingsGoalCalculator from "@/components/calculators/SavingsGoalCalculator";

export const metadata: Metadata = {
  title: "Savings Goal Calculator — PennyWisecrack",
};

export default function SavingsGoalPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/calculators"
        className="text-sm font-medium text-navy hover:underline dark:text-baby-blue"
      >
        ← All calculators
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-navy dark:text-baby-blue">
        Savings Goal Calculator
      </h1>
      <p className="mt-2 text-foreground/70">
        Figure out how long it&apos;ll take to save up for something you
        want.
      </p>

      <div className="mt-10">
        <SavingsGoalCalculator />
      </div>
    </div>
  );
}
