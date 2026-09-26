import type { Metadata } from "next";
import Link from "next/link";
import BonusCalculator from "@/components/calculators/BonusCalculator";

export const metadata: Metadata = {
  title: "Bonus Estimator — PennyWisecrack",
};

export default function BonusPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/calculators"
        className="text-sm font-medium text-navy hover:underline dark:text-baby-blue"
      >
        ← All calculators
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-navy dark:text-baby-blue">
        Bonus Estimator
      </h1>
      <p className="mt-2 text-foreground/70">
        See what a one-time bonus really pays after taxes.
      </p>

      <div className="mt-10">
        <BonusCalculator />
      </div>
    </div>
  );
}
