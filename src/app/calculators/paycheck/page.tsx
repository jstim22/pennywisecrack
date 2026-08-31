import type { Metadata } from "next";
import Link from "next/link";
import PaycheckCalculator from "@/components/calculators/PaycheckCalculator";

export const metadata: Metadata = {
  title: "Paycheck Estimator — PennyWisecrack",
};

export default function PaycheckPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/calculators"
        className="text-sm font-medium text-navy hover:underline dark:text-baby-blue"
      >
        ← All calculators
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-navy dark:text-baby-blue">
        Paycheck Estimator
      </h1>
      <p className="mt-2 text-foreground/70">
        Get a rough idea of what a part-time job actually pays you.
      </p>

      <div className="mt-10">
        <PaycheckCalculator />
      </div>
    </div>
  );
}
