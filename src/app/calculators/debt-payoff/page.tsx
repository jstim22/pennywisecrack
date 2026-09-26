import type { Metadata } from "next";
import Link from "next/link";
import DebtPayoffCalculator from "@/components/calculators/DebtPayoffCalculator";

export const metadata: Metadata = {
  title: "Debt Payoff Calculator — PennyWisecrack",
};

export default function DebtPayoffPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/calculators"
        className="text-sm font-medium text-navy hover:underline dark:text-baby-blue"
      >
        ← All calculators
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-navy dark:text-baby-blue">
        Debt Payoff Calculator
      </h1>
      <p className="mt-2 text-foreground/70">
        Compare the snowball and avalanche methods for paying off your debts,
        and see what it takes to be debt-free by a date you choose.
      </p>

      <div className="mt-10">
        <DebtPayoffCalculator />
      </div>
    </div>
  );
}
