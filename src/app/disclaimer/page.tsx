import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Disclaimer & Terms of Use — PennyWisecrack",
};

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "1. For education and information only",
    body: [
      "Everything on PennyWisecrack, including calculators, articles, lessons, examples, charts, and resources, is provided for general educational and informational purposes. It is illustrative. It is not financial, investment, tax, accounting, legal, insurance, or other professional advice, and it is not a recommendation to buy, sell, or hold any product or investment, or to take or not take any action.",
      "We don't know your full situation, and nothing on this site takes it into account.",
    ],
  },
  {
    heading: "2. No professional relationship",
    body: [
      "Using this site does not create an advisor–client, fiduciary, attorney–client, accountant–client, or any other professional relationship. PennyWisecrack is not a registered investment adviser, financial planner, tax preparer, accountant, law firm, mortgage broker or loan originator, insurance agent, or broker-dealer, and does not hold itself out as one.",
    ],
  },
  {
    heading: "3. Calculators give estimates",
    body: [
      "Our calculators produce estimates. They are not quotes, offers, bills, or predictions. They rely on simplifying assumptions and general rules that may not fit your situation, including:",
      "• Federal tax rules for a single filer, mostly for the 2026 tax year, and approximate state and local tax rules that leave out many credits, deductions, phase-outs, and payroll programs.",
      "• Typical guesses, not actual figures, for things like property tax, homeowners insurance, mortgage insurance (PMI), and what a car is worth over time.",
      "• Fixed interest rates, steady returns, and payments that don't change.",
      "Real results depend on details we don't ask about, and on rates, laws, and prices that change. Your pay stub, tax return, loan documents, and account statements are the source of truth, and they may differ from what you see here, sometimes by a lot.",
    ],
  },
  {
    heading: "4. Projections and investing",
    body: [
      "Any projection of future savings, investment growth, retirement income, or other outcomes is hypothetical. Investing involves risk, including the possible loss of money. Returns are not guaranteed, and past performance does not predict future results. Tools that show a range of outcomes, such as Monte Carlo simulations, show some of the possibilities, not everything that could happen.",
    ],
  },
  {
    heading: "5. Accuracy and updates",
    body: [
      "We work to keep the site accurate and current, but we can't promise it is free of errors or up to date. Tax rules, interest rates, and program terms (like student loan repayment plans and autopay discounts) change, sometimes quickly. We are not obligated to update anything. Please verify important details with official sources such as the IRS, your state's tax agency, studentaid.gov, or your lender.",
    ],
  },
  {
    heading: "6. Your decisions are your responsibility",
    body: [
      "You are responsible for your own financial decisions. Before you act on anything you read or calculate here, consider your own circumstances and talk to a qualified professional, such as a licensed financial planner, a tax professional, or an attorney. If you're struggling with debt, a nonprofit credit counselor may be able to help. Please don't ignore or delay professional advice because of something you saw on this site.",
      "If you're under 18, talk to a parent or guardian before making financial decisions.",
    ],
  },
  {
    heading: "7. No warranties",
    body: [
      "To the fullest extent the law allows, the site and everything on it is provided “as is” and “as available,” without warranties of any kind, express or implied, including any warranty of accuracy, completeness, reliability, fitness for a particular purpose, or non-infringement.",
    ],
  },
  {
    heading: "8. Limitation of liability",
    body: [
      "To the fullest extent the law allows, PennyWisecrack and the people who create and run it are not liable for any loss or damage of any kind, whether direct, indirect, incidental, special, or consequential, including lost money, missed opportunities, penalties, or interest, that comes from using the site, relying on it, or not being able to use it. Some places don't allow certain limits, so parts of this section may not apply to you.",
    ],
  },
  {
    heading: "9. Other websites and sources",
    body: [
      "We refer to and link to other websites and sources, such as government sites and data published by other organizations. We don't control them and aren't responsible for them. When we mention a product, company, or program, it's to explain an idea, not to endorse it.",
    ],
  },
  {
    heading: "10. Using the site",
    body: [
      "You're welcome to use the site for your own personal, non-commercial learning. Please don't copy, resell, or misrepresent our content, misuse the site, or try to disrupt it. The site's text, design, and code belong to PennyWisecrack or are used with permission, unless noted otherwise.",
    ],
  },
  {
    heading: "11. Privacy",
    body: [
      "See our Privacy page. In short, the numbers you type into our tools stay in your browser.",
    ],
  },
  {
    heading: "12. Changes",
    body: [
      "We may change the site and these terms at any time. The date at the top of this page shows when it last changed. If you keep using the site after a change, you accept the updated terms.",
    ],
  },
];

export default function Disclaimer() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-navy dark:text-baby-blue">
        Disclaimer &amp; Terms of Use
      </h1>
      <p className="mt-2 text-sm text-foreground/50">
        Last updated {LEGAL_LAST_UPDATED}
      </p>

      <div className="mt-6 rounded-lg border border-yellow/50 bg-yellow/10 p-4 text-sm font-medium">
        PennyWisecrack is for education only. Nothing on this site is
        financial, tax, legal, or investment advice. Our tools give
        illustrative estimates that may not match your real situation.
      </div>

      <p className="mt-6 text-foreground/70">
        PennyWisecrack is a personal finance education website. By using it,
        you agree to the points below. If you don&apos;t agree, please
        don&apos;t use the site.
      </p>

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
        <Link href="/privacy" className="underline hover:text-foreground">
          Privacy page
        </Link>
        .
      </p>
    </div>
  );
}
