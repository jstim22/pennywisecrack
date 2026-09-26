import Link from "next/link";

const COPY = {
  tools: {
    heading: "These tools are illustrative, not advice",
    body: "PennyWisecrack's calculators are for education and general information only. They use simplified assumptions and general rules, mostly for the 2026 tax year, so your real numbers will differ. Nothing here is financial, tax, legal, or investment advice, and PennyWisecrack is not a financial advisor, tax preparer, accountant, attorney, or broker. Check with a qualified professional and your official documents before making decisions.",
  },
  articles: {
    heading: "Educational content, not advice",
    body: "Our articles are for education and general information only. They aren't financial, tax, legal, or investment advice, they may be out of date, and they don't account for your personal situation. PennyWisecrack is not a financial advisor, tax preparer, accountant, attorney, or broker. Check with a qualified professional before making decisions.",
  },
  learning: {
    heading: "Educational content, not advice",
    body: "Our lessons and resources are for education and general information only. They aren't financial, tax, legal, or investment advice, they may be out of date, and they don't account for your personal situation. PennyWisecrack is not a financial advisor, tax preparer, accountant, attorney, or broker. Check with a qualified professional before making decisions.",
  },
} as const;

export default function DisclaimerNote({
  variant,
}: {
  variant: keyof typeof COPY;
}) {
  const copy = COPY[variant];
  return (
    <aside
      aria-label="Disclaimer"
      className="rounded-lg border border-border bg-surface-hover p-4 text-xs leading-relaxed text-foreground/70"
    >
      <p className="font-medium text-foreground/80">{copy.heading}</p>
      <p className="mt-1">
        {copy.body}{" "}
        <Link href="/disclaimer" className="underline hover:text-foreground">
          Read the full Disclaimer &amp; Terms
        </Link>
        .
      </p>
    </aside>
  );
}
