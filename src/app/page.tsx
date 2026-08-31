import Link from "next/link";
import RecentPostsRibbon from "@/components/RecentPostsRibbon";

export default function Home() {
  return (
    <>
      <div className="mx-auto max-w-5xl px-6 py-20">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Personal finance, minus the{" "}
            <span className="bg-yellow/40 px-1">headache</span>.
          </h1>
          <p className="mt-4 text-lg text-foreground/70">
            PennyWisecrack breaks down money basics for teens and
            students — saving, spending, first jobs, and everything school
            forgot to cover.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/calculators"
              className="rounded-md bg-navy px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:bg-baby-blue dark:text-navy"
            >
              Try a calculator
            </Link>
            <Link
              href="/learning"
              className="rounded-md border border-navy px-5 py-2.5 text-sm font-medium text-navy transition-colors hover:bg-navy/5 dark:border-baby-blue dark:text-baby-blue dark:hover:bg-baby-blue/10"
            >
              Start learning
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-3">
          <FeatureCard
            title="Calculators"
            description="See what saving up for something actually looks like — allowance, a first paycheck, simple budgets, and more."
            href="/calculators"
          />
          <FeatureCard
            title="Learning"
            description="The money basics school skips — explained simply, no boring textbook required."
            href="/learning"
          />
          <FeatureCard
            title="About Us"
            description="Why we started PennyWisecrack, and who it's for."
            href="/about"
          />
        </div>
      </div>

      <RecentPostsRibbon />
    </>
  );
}

function FeatureCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-border p-6 transition-colors hover:border-baby-blue hover:bg-baby-blue/5"
    >
      <h2 className="font-medium">{title}</h2>
      <p className="mt-2 text-sm text-foreground/60">{description}</p>
    </Link>
  );
}
