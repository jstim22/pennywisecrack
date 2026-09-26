import type { Metadata } from "next";
import Link from "next/link";
import StudentLoanCalculator from "@/components/calculators/StudentLoanCalculator";

export const metadata: Metadata = {
  title: "Student Loan Calculator — PennyWisecrack",
};

export default function StudentLoansPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/calculators"
        className="text-sm font-medium text-navy hover:underline dark:text-baby-blue"
      >
        ← All calculators
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-navy dark:text-baby-blue">
        Student Loan Calculator
      </h1>
      <p className="mt-2 text-foreground/70">
        See your monthly payment, what your loans will really cost, and how
        different repayment plans — including the new income-based one —
        compare.
      </p>

      <div className="mt-10">
        <StudentLoanCalculator />
      </div>
    </div>
  );
}
