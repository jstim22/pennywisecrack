import type { Metadata } from "next";
import Link from "next/link";
import NetWorthCalculator from "@/components/calculators/NetWorthCalculator";

export const metadata: Metadata = {
  title: "Net Worth Calculator — PennyWisecrack",
};

export default function NetWorthPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/calculators"
        className="text-sm font-medium text-navy hover:underline dark:text-baby-blue"
      >
        ← All calculators
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-navy dark:text-baby-blue">
        Net Worth Calculator
      </h1>
      <p className="mt-2 text-foreground/70">
        Add up what you own and what you owe to find your net worth, then
        download it as a spreadsheet you can keep updating.
      </p>

      <div className="mt-10">
        <NetWorthCalculator />
      </div>
    </div>
  );
}
