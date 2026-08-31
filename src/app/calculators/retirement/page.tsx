import type { Metadata } from "next";
import Link from "next/link";
import RetirementCalculator from "@/components/calculators/RetirementCalculator";

export const metadata: Metadata = {
  title: "Retirement Calculator — PennyWisecrack",
};

export default function RetirementPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/calculators"
        className="text-sm font-medium text-navy hover:underline dark:text-baby-blue"
      >
        ← All calculators
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-navy dark:text-baby-blue">
        Retirement Calculator
      </h1>
      <p className="mt-2 text-foreground/70">
        See what starting early could be worth by the time you retire.
      </p>

      <div className="mt-10">
        <RetirementCalculator />
      </div>
    </div>
  );
}
