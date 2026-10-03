import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-8 text-sm text-foreground/60">
        <Link href="/" aria-label="PennyWisecrack home" className="self-start">
          <Logo size="sm" />
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} PennyWisecrack. All rights reserved.</p>
          <ul className="flex gap-5">
            <li>
              <Link href="/disclaimer" className="hover:text-foreground">
                Disclaimer &amp; Terms
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
            </li>
          </ul>
        </div>
        <p className="text-xs leading-relaxed">
          PennyWisecrack provides general educational information and
          illustrative tools. It is not financial, tax, legal, or investment
          advice, and we are not financial advisors, tax preparers, or
          attorneys. Results are estimates and may not match your situation.
        </p>
      </div>
    </footer>
  );
}
