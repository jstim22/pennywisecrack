import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calculators — PennyWisecrack",
};

export default function Calculators() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Calculators</h1>
      <p className="mt-4 text-foreground/70">
        This is where interactive calculators (budgeting, savings, debt
        payoff, compound interest, and more) will live.
      </p>
    </div>
  );
}
