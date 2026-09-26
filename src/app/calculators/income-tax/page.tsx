import type { Metadata } from "next";
import Link from "next/link";
import TaxCalculator from "@/components/calculators/TaxCalculator";

export const metadata: Metadata = {
  title: "Income Tax Calculator — PennyWisecrack",
};

export default function IncomeTaxPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/calculators"
        className="text-sm font-medium text-navy hover:underline dark:text-baby-blue"
      >
        ← All calculators
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-navy dark:text-baby-blue">
        Income Tax Calculator
      </h1>
      <p className="mt-2 text-foreground/70">
        See how much you might pay in federal, state, Social Security, and
        Medicare tax — and how it changes as you earn more.
      </p>

      <div className="mt-10">
        <TaxCalculator />
      </div>
    </div>
  );
}
