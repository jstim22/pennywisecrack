"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/calculators", label: "Calculators" },
  { href: "/learning", label: "Learning" },
  { href: "/about", label: "About Us" },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          PennyWisecrack
        </Link>

        <ul className="hidden gap-8 text-sm font-medium sm:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={
                    active
                      ? "text-foreground"
                      : "text-foreground/60 transition-colors hover:text-foreground"
                  }
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          className="text-sm font-medium sm:hidden"
          aria-expanded={open}
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </nav>

      {open && (
        <ul className="flex flex-col gap-1 border-t border-black/10 px-6 py-3 text-sm font-medium sm:hidden dark:border-white/10">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={
                    active
                      ? "block py-2 text-foreground"
                      : "block py-2 text-foreground/60 hover:text-foreground"
                  }
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </header>
  );
}
