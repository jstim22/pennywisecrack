import type { Metadata } from "next";
import Link from "next/link";
import MortgageCalculator from "@/components/calculators/MortgageCalculator";

export const metadata: Metadata = {
  title: "Mortgage Calculator — PennyWisecrack",
};

export default function MortgagePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/calculators"
        className="text-sm font-medium text-navy hover:underline dark:text-baby-blue"
      >
        ← All calculators
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-navy dark:text-baby-blue">
        Mortgage Calculator
      </h1>
      <p className="mt-2 text-foreground/70">
        See what a home could really cost each month — including mortgage
        insurance, property tax, and homeowners insurance.
      </p>

      <div className="mt-10">
        <MortgageCalculator />
      </div>
    </div>
  );
}
