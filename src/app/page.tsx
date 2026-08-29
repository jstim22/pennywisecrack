import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Personal finance, minus the headache.
        </h1>
        <p className="mt-4 text-lg text-foreground/70">
          PennyWisecrack helps you run the numbers and learn the basics, so
          you can make confident money decisions without the jargon.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/calculators"
            className="rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Try a calculator
          </Link>
          <Link
            href="/learning"
            className="rounded-md border border-black/10 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
          >
            Start learning
          </Link>
        </div>
      </div>

      <div className="mt-20 grid gap-6 sm:grid-cols-3">
        <FeatureCard
          title="Calculators"
          description="Budgeting, savings, debt payoff, and more — plug in your numbers and see where you stand."
          href="/calculators"
        />
        <FeatureCard
          title="Learning"
          description="Plain-English guides to the financial concepts that actually matter."
          href="/learning"
        />
        <FeatureCard
          title="About Us"
          description="Why we built PennyWisecrack, and what we're trying to do differently."
          href="/about"
        />
      </div>
    </div>
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
      className="block rounded-lg border border-black/10 p-6 transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
    >
      <h2 className="font-medium">{title}</h2>
      <p className="mt-2 text-sm text-foreground/60">{description}</p>
    </Link>
  );
}
