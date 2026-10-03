import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";
import { ALL_CALCULATORS, CALCULATOR_SECTIONS } from "@/lib/calculatorCatalog";
import { SECTION_ACCENTS } from "@/components/home/sectionStyles";

const text = () => document.body.textContent ?? "";

describe("Homepage", () => {
  it("keeps the headline and the two main calls to action", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Personal finance, minus the headache.",
    );
    expect(screen.getByRole("link", { name: "Try a calculator" }).getAttribute("href")).toBe("/calculators");
    expect(screen.getByRole("link", { name: "Start learning" }).getAttribute("href")).toBe("/learning");
  });

  it("shows a real example from the Budget Buckets calculator", () => {
    render(<Home />);
    const link = screen.getByRole("link", { name: /Where does \$4,000 a month go\?/ });
    expect(link.getAttribute("href")).toBe("/calculators/budget");
    for (const label of ["Housing", "Other needs", "Wants", "Savings"]) {
      expect(link.textContent).toContain(label);
    }
  });

  it("has a tile for every calculator section, linking to its anchor", () => {
    render(<Home />);
    for (const section of CALCULATOR_SECTIONS) {
      const tile = screen.getByRole("link", { name: new RegExp(section.title.replace(/[?]/g, "\\?")) });
      expect(tile.getAttribute("href")).toBe(`/calculators#${section.id}`);
      for (const tool of section.tools) expect(tile.textContent).toContain(tool.title);
    }
  });

  it("gives every section its own accent color", () => {
    for (const section of CALCULATOR_SECTIONS) {
      expect(SECTION_ACCENTS[section.id], section.id).toBeDefined();
    }
    const bubbles = CALCULATOR_SECTIONS.map((s) => SECTION_ACCENTS[s.id].bubble);
    expect(new Set(bubbles).size).toBe(bubbles.length);
  });

  it("counts the calculators from the catalog, so it can't go stale", () => {
    render(<Home />);
    const n = ALL_CALCULATORS.length;
    expect(text()).toContain(`See all ${n} calculators`);
    expect(text()).toMatch(new RegExp(`${n}\\s*free calculators`));
    expect(screen.getByRole("link", { name: new RegExp(`See all ${n} calculators`) }).getAttribute("href")).toBe("/calculators");
  });

  it("states the privacy promises the Privacy page actually makes", () => {
    render(<Home />);
    expect(text()).toContain("The numbers you type stay in your browser");
    expect(text()).toContain("No sign-up");
  });

  it("still links to Learning, About, and the blog", () => {
    render(<Home />);
    expect(screen.getByRole("link", { name: /^Learning/ }).getAttribute("href")).toBe("/learning");
    expect(screen.getByRole("link", { name: /^About us/ }).getAttribute("href")).toBe("/about");
    expect(screen.getByRole("link", { name: "View all" }).getAttribute("href")).toBe("/blog");
  });

  it("marks the decorative color blobs so assistive tech and high-contrast mode can skip them", () => {
    const { container } = render(<Home />);
    const blobs = container.querySelectorAll(".decor");
    expect(blobs.length).toBeGreaterThan(0);
    for (const b of blobs) expect(b.getAttribute("aria-hidden")).toBe("true");
  });

  describe("the hero's glow comes from the bulb", () => {
    it("is centered on the logo mark: the glow and the mark share one wrapper", () => {
      const { container } = render(<Home />);
      const glow = container.querySelector(".bulb-glow")!;
      const wrapper = glow.parentElement!;
      expect(wrapper.querySelector("svg")).not.toBeNull();
      expect(glow.className).toContain("left-1/2");
      expect(glow.className).toContain("top-1/2");
      expect(glow.className).toContain("-translate-x-1/2");
      expect(glow.className).toContain("-translate-y-1/2");
    });

    it("sits behind the text and buttons, so it can't wash them out", () => {
      const { container } = render(<Home />);
      const hero = container.querySelector("section")!;
      expect(hero.className).toContain("isolate");
      expect(container.querySelector(".bulb-glow")!.className).toContain("-z-10");
    });

    it("can't be clicked, is hidden from screen readers, and steps aside in high contrast", () => {
      const { container } = render(<Home />);
      const glow = container.querySelector(".bulb-glow")!;
      expect(glow.className).toContain("pointer-events-none");
      expect(glow.getAttribute("aria-hidden")).toBe("true");
      expect(glow.className).toContain("decor");
    });

    it("replaces the old unrelated color blobs", () => {
      const { container } = render(<Home />);
      expect(container.querySelectorAll(".decor")).toHaveLength(1);
    });
  });

  describe("the glow's styles", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

    it("fade from yellow at the bulb to baby-blue farther out, in light and dark", () => {
      const light = css.match(/\n\.bulb-glow \{([\s\S]*?)\n\}/)![1];
      const dark = css.match(/\[data-theme="dark"\] \.bulb-glow \{([\s\S]*?)\n\}/)![1];
      for (const block of [light, dark]) {
        expect(block).toContain("radial-gradient");
        expect(block.indexOf("242 201 76")).toBeLessThan(block.indexOf("142 205 240")); // yellow first, then blue
        expect(block).toContain("transparent 100%");
      }
    });

    it("breathes slowly, but only for people who haven't asked for less motion", () => {
      const motion = css.match(/@media \(prefers-reduced-motion: no-preference\) \{\s*\.bulb-glow \{([\s\S]*?)\}/)!;
      expect(motion[1]).toContain("animation: bulb-breathe");
      // The base .bulb-glow rule has no animation of its own.
      const base = css.match(/\n\.bulb-glow \{([\s\S]*?)\n\}/)![1];
      expect(base).not.toContain("animation");
    });
  });
});
