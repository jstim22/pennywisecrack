import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy — PennyWisecrack",
};

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "What stays in your browser",
    body: [
      "The numbers you type into our calculators, like your pay, debts, or savings, are worked out on your own device. They aren't sent to us, and we don't save them. When you leave or reload a page, they're gone.",
      "If you download a spreadsheet, such as from the Net Worth calculator, it's created on your device and saved to your computer. We never see it.",
      "Your accessibility and display choices (like text size, contrast, motion, and light or dark theme) are saved in your browser's local storage on your device so they stick between visits. You can clear them by clearing your browser's site data.",
    ],
  },
  {
    heading: "What our hosting provider may collect",
    body: [
      "Like most websites, the service that hosts PennyWisecrack processes technical information needed to deliver the site, such as your IP address, browser type, and the pages you request, and may keep server logs. We don't use this to identify you.",
    ],
  },
  {
    heading: "Cookies, analytics, and ads",
    body: [
      "We don't currently use advertising cookies or third-party analytics. If that changes, we'll update this page.",
    ],
  },
  {
    heading: "Accounts and personal information",
    body: [
      "We don't ask you to create an account or give us personal information to use the site.",
    ],
  },
  {
    heading: "Links to other sites",
    body: [
      "We link to other websites, such as government sites. They have their own privacy practices, which we don't control.",
    ],
  },
  {
    heading: "Children",
    body: [
      "PennyWisecrack isn't directed at children under 13, and we don't knowingly collect personal information from anyone.",
    ],
  },
  {
    heading: "Changes",
    body: [
      "We may update this page. The date at the top shows when it last changed.",
    ],
  },
];

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-navy dark:text-baby-blue">
        Privacy
      </h1>
      <p className="mt-2 text-sm text-foreground/50">
        Last updated {LEGAL_LAST_UPDATED}
      </p>

      <div className="mt-6 rounded-lg border border-border bg-surface-hover p-4 text-sm font-medium">
        The short version: we don&apos;t ask for accounts, and the numbers you
        enter into our tools stay in your browser.
      </div>

      <div className="mt-8 flex flex-col gap-8">
        {SECTIONS.map((s) => (
          <section key={s.heading}>
            <h2 className="text-lg font-semibold text-navy dark:text-baby-blue">
              {s.heading}
            </h2>
            <div className="mt-2 flex flex-col gap-3 text-sm leading-relaxed text-foreground/80">
              {s.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-10 text-sm text-foreground/60">
        See also our{" "}
        <Link href="/disclaimer" className="underline hover:text-foreground">
          Disclaimer &amp; Terms
        </Link>
        .
      </p>
    </div>
  );
}
