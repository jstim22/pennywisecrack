import type { Metadata } from "next";
import Link from "next/link";
import OpportunityCostCalculator from "@/components/calculators/OpportunityCostCalculator";

export const metadata: Metadata = {
  title: "Opportunity Cost Calculator — PennyWisecrack",
};

export default function OpportunityCostPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/calculators"
        className="text-sm font-medium text-navy hover:underline dark:text-baby-blue"
      >
        ← All calculators
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-navy dark:text-baby-blue">
        Opportunity Cost Calculator
      </h1>
      <p className="mt-2 text-foreground/70">
        See what a spending decision today could cost you at retirement — and
        whether it&apos;s worth it.
      </p>

      <div className="mt-10">
        <OpportunityCostCalculator />
      </div>
    </div>
  );
}
