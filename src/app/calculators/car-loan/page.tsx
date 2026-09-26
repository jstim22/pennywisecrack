import type { Metadata } from "next";
import Link from "next/link";
import CarLoanCalculator from "@/components/calculators/CarLoanCalculator";

export const metadata: Metadata = {
  title: "Car Loan Calculator — PennyWisecrack",
};

export default function CarLoanPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/calculators"
        className="text-sm font-medium text-navy hover:underline dark:text-baby-blue"
      >
        ← All calculators
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-navy dark:text-baby-blue">
        Car Loan Calculator
      </h1>
      <p className="mt-2 text-foreground/70">
        See your monthly payment, what a car really costs with tax and
        interest, and whether you&apos;d owe more than it&apos;s worth.
      </p>

      <div className="mt-10">
        <CarLoanCalculator />
      </div>
    </div>
  );
}
