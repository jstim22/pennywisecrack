"use client";

import { useEffect, useRef, useState } from "react";

// A table of contents for the calculators page: links that jump to each
// section, with the section you're reading highlighted as you scroll.
export default function CalculatorsToc({
  sections,
}: {
  sections: { id: string; label: string }[];
}) {
  const [active, setActive] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // On a phone the list scrolls sideways; keep the current section's link in view.
  useEffect(() => {
    const list = listRef.current;
    const link = list?.querySelector<HTMLElement>('a[aria-current="true"]');
    if (!list || !link || typeof list.scrollTo !== "function") return;
    const left = link.offsetLeft - list.clientWidth / 2 + link.offsetWidth / 2;
    list.scrollTo({ left: Math.max(left, 0), behavior: "smooth" });
  }, [active]);

  useEffect(() => {
    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0 || typeof IntersectionObserver === "undefined") return;

    // A section counts as "current" while its top part is in the upper
    // portion of the window.
    const visible = new Set<string>();
    const last = sections[sections.length - 1].id;

    const update = () => {
      // The last section can never reach the upper part of the window, so once
      // you've scrolled to the very bottom of the page it's the current one.
      const doc = document.documentElement;
      const atBottom =
        doc.scrollHeight > window.innerHeight + 8 &&
        window.innerHeight + window.scrollY >= doc.scrollHeight - 4;
      if (atBottom) {
        setActive(last);
        return;
      }
      // Otherwise the first section (in page order) that's in view wins.
      const current = sections.find((s) => visible.has(s.id));
      if (current) setActive(current.id);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        update();
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    elements.forEach((el) => observer.observe(el));
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
    };
  }, [sections]);

  return (
    <nav
      aria-label="Calculator categories"
      className="sticky top-0 z-10 -mx-6 mt-8 border-b border-border bg-background/90 px-6 py-3 backdrop-blur"
    >
      <p className="sr-only">Jump to a category</p>
      <ul ref={listRef} className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
        {sections.map((s) => {
          const isActive = active === s.id;
          return (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                aria-current={isActive ? "true" : undefined}
                onClick={() => setActive(s.id)}
                className={
                  "block rounded-full border px-3 py-1.5 text-sm font-medium transition-colors " +
                  (isActive
                    ? "border-navy bg-navy text-white dark:border-baby-blue dark:bg-baby-blue dark:text-navy"
                    : "border-border text-foreground/70 hover:bg-surface-hover hover:text-foreground")
                }
              >
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
