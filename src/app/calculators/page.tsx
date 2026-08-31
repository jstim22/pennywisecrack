import type { Metadata } from "next";
import Link from "next/link";
import CalculatorTileImage from "@/components/calculators/CalculatorTileImage";
import {
  SavingsGoalIcon,
  CompoundInterestIcon,
  RetirementIcon,
  PaycheckIcon,
} from "@/components/calculators/CalculatorIcons";

export const metadata: Metadata = {
  title: "Calculators — PennyWisecrack",
};

const tools = [
  {
    href: "/calculators/savings-goal",
    title: "Savings Goal",
    description: "See how long it'll take to save up for something you want.",
    icon: SavingsGoalIcon,
  },
  {
    href: "/calculators/compound-interest",
    title: "Compound Interest",
    description: "Watch how a little savings can grow into a lot over time.",
    icon: CompoundInterestIcon,
  },
  {
    href: "/calculators/retirement",
    title: "Retirement",
    description: "See what starting early could be worth by the time you retire.",
    icon: RetirementIcon,
  },
  {
    href: "/calculators/paycheck",
    title: "Paycheck Estimator",
    description: "Get a rough idea of what a part-time job actually pays you.",
    icon: PaycheckIcon,
  },
];

export default function Calculators() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-navy dark:text-baby-blue">
        Calculators
      </h1>
      <p className="mt-4 text-foreground/70">
        Simple tools to help you see what your money can actually do.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="block overflow-hidden rounded-lg border border-border transition-colors hover:border-baby-blue"
          >
            <CalculatorTileImage icon={tool.icon} className="h-28 w-full" />
            <div className="p-6">
              <h2 className="font-medium">{tool.title}</h2>
              <p className="mt-2 text-sm text-foreground/60">
                {tool.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
