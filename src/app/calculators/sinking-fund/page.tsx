import type { Metadata } from "next";
import Link from "next/link";
import SinkingFundCalculator from "@/components/calculators/SinkingFundCalculator";

export const metadata: Metadata = {
  title: "Sinking Fund Calculator — PennyWisecrack",
};

export default function SinkingFundPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/calculators"
        className="text-sm font-medium text-navy hover:underline dark:text-baby-blue"
      >
        ← All calculators
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-navy dark:text-baby-blue">
        Sinking Fund Calculator
      </h1>
      <p className="mt-2 text-foreground/70">
        A sinking fund is money you set aside a little at a time for
        something you know you&apos;ll need or want. Figure out how long it&apos;ll
        take to fill yours.
      </p>

      <div className="mt-10">
        <SinkingFundCalculator />
      </div>
    </div>
  );
}
