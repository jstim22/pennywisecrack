import Link from "next/link";
import RecentPostsRibbon from "@/components/RecentPostsRibbon";
import HeroPreview from "@/components/home/HeroPreview";
import { LogoMark } from "@/components/Logo";
import {
  FALLBACK_ACCENT,
  SECTION_ACCENTS,
} from "@/components/home/sectionStyles";
import {
  ALL_CALCULATORS,
  CALCULATOR_SECTIONS,
} from "@/lib/calculatorCatalog";

const PERKS = [
  {
    stat: String(ALL_CALCULATORS.length),
    title: "free calculators",
    text: "From budgets and paychecks to mortgages and student loans.",
  },
  {
    stat: "0",
    title: "accounts needed",
    text: "No sign-up, no email. Just open a tool and use it.",
  },
  {
    stat: "100%",
    title: "private",
    text: "The numbers you type stay in your browser. We never see them.",
  },
  {
    stat: "2026",
    title: "tax-year numbers",
    text: "Tax tools use current-year rules, so estimates stay realistic.",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-baby-blue/10 to-transparent dark:from-navy/30">
        <div className="relative mx-auto grid max-w-5xl items-center gap-12 px-6 py-16 sm:py-24 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex items-center gap-4">
              {/* The hero's color radiates from the bulb: warm yellow at the
                  bulb, shifting to baby-blue as it spreads out. */}
              <div className="relative h-20 w-20 shrink-0 sm:h-24 sm:w-24">
                <div
                  aria-hidden="true"
                  className="decor bulb-glow pointer-events-none absolute -z-10 left-1/2 top-1/2 h-[64rem] w-[64rem] -translate-x-1/2 -translate-y-1/2"
                />
                <LogoMark className="relative h-full w-full drop-shadow-md" />
              </div>
              <p className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-background/70 px-3 py-1 text-xs font-medium text-navy backdrop-blur dark:border-baby-blue/25 dark:text-baby-blue">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-yellow" aria-hidden="true" />
                Free · No sign-up · Your numbers stay in your browser
              </p>
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
              Personal finance, minus the{" "}
              <span className="rounded bg-yellow/50 px-1.5 dark:bg-yellow/30">
                headache
              </span>
              .
            </h1>
            <p className="mt-5 max-w-xl text-lg text-foreground/70">
              PennyWisecrack breaks down money basics for everyone — saving,
              spending, paychecks, investing, and everything school forgot to
              cover.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/calculators"
                className="rounded-md bg-navy px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 dark:bg-baby-blue dark:text-navy"
              >
                Try a calculator
              </Link>
              <Link
                href="/learning"
                className="rounded-md border border-navy bg-background/60 px-5 py-2.5 text-sm font-medium text-navy transition-colors hover:bg-navy/5 dark:border-baby-blue dark:text-baby-blue dark:hover:bg-baby-blue/10"
              >
                Start learning
              </Link>
            </div>
          </div>

          <HeroPreview />
        </div>
      </section>

      {/* Start with a question */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-navy dark:text-baby-blue">
          What are you trying to figure out?
        </h2>
        <p className="mt-2 max-w-xl text-foreground/70">
          Pick the question on your mind and we&apos;ll point you to the right
          tool.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CALCULATOR_SECTIONS.map((section) => {
            const accent = SECTION_ACCENTS[section.id] ?? FALLBACK_ACCENT;
            const Icon = section.tools[0].icon;
            return (
              <Link
                key={section.id}
                href={`/calculators#${section.id}`}
                className={`group flex flex-col rounded-xl border border-border p-6 transition-colors ${accent.tile}`}
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-lg text-white ${accent.bubble}`}
                  aria-hidden="true"
                >
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-semibold group-hover:underline">
                  {section.title}
                </h3>
                <p className="mt-1 text-sm text-foreground/70">{section.blurb}</p>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {section.tools.map((tool) => (
                    <li
                      key={tool.href}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${accent.chip}`}
                    >
                      {tool.title}
                    </li>
                  ))}
                </ul>
              </Link>
            );
          })}

          <Link
            href="/calculators"
            className="flex flex-col justify-center rounded-xl border border-dashed border-navy/40 p-6 text-navy transition-colors hover:bg-navy/5 dark:border-baby-blue/40 dark:text-baby-blue dark:hover:bg-baby-blue/10"
          >
            <span className="font-semibold">See all {ALL_CALCULATORS.length} calculators →</span>
            <span className="mt-1 text-sm text-foreground/70">
              Browse every tool in one place.
            </span>
          </Link>
        </div>
      </section>

      {/* Why it's different */}
      <section className="bg-navy text-white">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-2xl font-semibold tracking-tight">
            Simple on purpose
          </h2>
          <p className="mt-2 max-w-xl text-white/80">
            No jargon walls, no upsells, no logins. Just clear answers about
            your money.
          </p>
          <dl className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {PERKS.map((perk) => (
              <div key={perk.title}>
                <dt className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold text-yellow">{perk.stat}</span>
                  <span className="text-sm font-medium">{perk.title}</span>
                </dt>
                <dd className="mt-2 text-sm text-white/75">{perk.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Keep learning */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-5 sm:grid-cols-2">
          <Link
            href="/learning"
            className="group rounded-xl border border-border border-l-4 border-l-yellow p-6 transition-colors hover:bg-yellow/10"
          >
            <h2 className="font-semibold group-hover:underline">Learning</h2>
            <p className="mt-2 text-sm text-foreground/70">
              The money basics school skips — explained simply, no boring
              textbook required.
            </p>
          </Link>
          <Link
            href="/about"
            className="group rounded-xl border border-border border-l-4 border-l-baby-blue p-6 transition-colors hover:bg-baby-blue/10"
          >
            <h2 className="font-semibold group-hover:underline">About us</h2>
            <p className="mt-2 text-sm text-foreground/70">
              Why we started PennyWisecrack, and who it&apos;s for.
            </p>
          </Link>
        </div>
      </section>

      <div className="bg-baby-blue/15 dark:bg-navy/30">
        <RecentPostsRibbon />
      </div>
    </>
  );
}
