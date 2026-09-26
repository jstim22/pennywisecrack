import type { Metadata } from "next";
import Link from "next/link";
import CalculatorTileImage from "@/components/calculators/CalculatorTileImage";
import CalculatorsToc from "@/components/calculators/CalculatorsToc";
import { CALCULATOR_SECTIONS } from "@/lib/calculatorCatalog";

export const metadata: Metadata = {
  title: "Calculators — PennyWisecrack",
};

export default function Calculators() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-10 pt-16">
      <h1 className="text-3xl font-semibold tracking-tight text-navy dark:text-baby-blue">
        Calculators
      </h1>
      <p className="mt-4 text-foreground/70">
        Simple tools to help you see what your money can actually do. Pick the
        question you&apos;re asking.
      </p>

      <CalculatorsToc
        sections={CALCULATOR_SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
      />

      <div className="mt-10 flex flex-col gap-14">
        {CALCULATOR_SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            aria-labelledby={`${section.id}-heading`}
            className="scroll-mt-20"
          >
            <h2
              id={`${section.id}-heading`}
              className="text-xl font-semibold tracking-tight text-navy dark:text-baby-blue"
            >
              {section.title}
            </h2>
            <p className="mt-1 text-sm text-foreground/60">{section.blurb}</p>

            <div className="mt-5 grid gap-6 sm:grid-cols-2">
              {section.tools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="block overflow-hidden rounded-lg border border-border transition-colors hover:border-baby-blue"
                >
                  <CalculatorTileImage icon={tool.icon} className="h-28 w-full" />
                  <div className="p-6">
                    <h3 className="font-medium">{tool.title}</h3>
                    <p className="mt-2 text-sm text-foreground/60">
                      {tool.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
