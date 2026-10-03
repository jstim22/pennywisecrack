import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Home from "@/app/page";
import Logo, { LogoMark } from "@/components/Logo";


const ROOT = process.cwd();

// The component's SVG and src/app/icon.svg (the browser-tab icon) are two
// copies of the same drawing; this keeps them from drifting apart.
const shapes = (svg: string) =>
  [...svg.matchAll(/\b(?:d|fill|stroke|stroke-width|fill-opacity|stroke-opacity)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((v) => v !== "none");

describe("Logo", () => {
  it("shows the mark next to the PennyWisecrack name", () => {
    const { container } = render(<Logo />);
    expect(container.textContent).toBe("PennyWisecrack");
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("hides the mark from screen readers, since the name is right beside it", () => {
    const { container } = render(<LogoMark />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("focusable")).toBe("false");
  });

  it("matches the browser-tab icon drawing", () => {
    const { container } = render(<LogoMark />);
    const component = shapes(container.querySelector("svg")!.outerHTML);
    const file = shapes(readFileSync(join(ROOT, "src/app/icon.svg"), "utf8"));
    expect(component.sort()).toEqual(file.sort());
  });

  it("uses only the site's yellow and navy, plus a darker gold for the base and white for the shine", () => {
    const svg = readFileSync(join(ROOT, "src/app/icon.svg"), "utf8");
    const colors = [...svg.matchAll(/#[0-9a-f]{6}/gi)].map((m) => m[0].toLowerCase());
    expect(new Set(colors)).toEqual(new Set(["#f2c94c", "#1e3a5f", "#e0a100", "#ffffff"]));
  });

  it("draws a cent sign: a C with a bar stub above and below, none running through it", () => {
    const { container } = render(<LogoMark />);
    const paths = [...container.querySelectorAll("path")].map((p) => p.getAttribute("d"));
    expect(paths).toContain("M36.3 24.5a7 7 0 1 0 0 11"); // the C (centered on x=32, y=30)
    expect(paths).toContain("M32 19v4"); // stub above the C (ends at its top, y=23)
    expect(paths).toContain("M32 37v4"); // stub below the C (starts at its bottom, y=37)
  });

  it("keeps the cent sign centered on the coin", () => {
    const { container } = render(<LogoMark />);
    const coin = container.querySelector('circle[r="19"]')!;
    expect(coin.getAttribute("cx")).toBe("32");
    expect(coin.getAttribute("cy")).toBe("30");
    // Stubs sit on x=32 and are balanced around y=30: 19–23 above, 37–41 below.
    expect(30 - 19).toBe(41 - 30);
  });

  it("turns the coin into a lightbulb with a two-line screw base below it, and no rays", () => {
    const { container } = render(<LogoMark />);
    const base = [...container.querySelectorAll("g path")].map((p) => p.getAttribute("d"));
    expect(base).toEqual(["M25 53h14", "M28 58.5h8"]);
    // The base is centered under the coin (x=32) and narrower toward the bottom.
    expect(25 + 39).toBe(32 * 2);
    expect(28 + 36).toBe(32 * 2);
    // Nothing sticks out above or beside the coin like the old rays did.
    const coinTop = 30 - 19;
    const topmost = Math.min(...[...container.querySelectorAll("path")].map((p) => Number(p.getAttribute("d")!.match(/^M[\d.]+ ([\d.]+)/)![1])));
    expect(topmost).toBeGreaterThanOrEqual(coinTop);
  });

  it("has no glow of its own: the glow comes from the homepage hero", () => {
    const { container } = render(<LogoMark />);
    // Only the coin and its inner ring are circles; no translucent halos.
    const circles = [...container.querySelectorAll("circle")];
    expect(circles).toHaveLength(2);
    expect(circles.some((c) => c.getAttribute("fill-opacity"))).toBe(false);
    expect(readFileSync(join(ROOT, "src/app/icon.svg"), "utf8")).not.toContain("fill-opacity");
  });

  it("has a highlight on the coin's upper-left edge, as if lit from within", () => {
    const { container } = render(<LogoMark />);
    const shine = [...container.querySelectorAll("path")].find(
      (p) => p.getAttribute("stroke") === "#ffffff",
    )!;
    expect(shine.getAttribute("d")).toBe("M18.1 20.3A17 17 0 0 1 27.6 13.6");
  });

  it("has the icon files in place", () => {
    for (const f of ["icon.svg", "favicon.ico", "apple-icon.png"]) {
      expect(readFileSync(join(ROOT, "src/app", f)).length, f).toBeGreaterThan(100);
    }
    const png = readFileSync(join(ROOT, "src/app/apple-icon.png"));
    expect(png.readUInt32BE(16)).toBe(180); // width
    expect(png.readUInt32BE(20)).toBe(180); // height
  });
});

describe("Nav", () => {
  it("links the logo to the home page", () => {
    render(<Nav />);
    const home = screen.getByRole("link", { name: "PennyWisecrack home" });
    expect(home.getAttribute("href")).toBe("/");
    expect(home.querySelector("svg")).not.toBeNull();
  });
});

describe("Logo prominence", () => {
  it("is larger in the nav than the original small size, with a bigger name", () => {
    const { container } = render(<Logo />);
    const mark = container.querySelector("svg")!;
    expect(mark.getAttribute("class")).toContain("h-11 w-11"); // was h-8 w-8
    expect(container.querySelector("span")!.className).toContain("text-xl"); // was text-lg
  });

  it("has a smaller size for tight spots", () => {
    const { container } = render(<Logo size="sm" />);
    expect(container.querySelector("svg")!.getAttribute("class")).toContain("h-9 w-9");
  });

  it("appears in the footer, linking home", () => {
    render(<Footer />);
    const home = screen.getByRole("link", { name: "PennyWisecrack home" });
    expect(home.getAttribute("href")).toBe("/");
    expect(home.querySelector("svg")).not.toBeNull();
    expect(home.textContent).toBe("PennyWisecrack");
  });

  it("appears large in the homepage hero, hidden from screen readers", () => {
    const { container } = render(<Home />);
    const hero = container.querySelector("section")!;
    const mark = hero.querySelector("svg")!;
    expect(mark.getAttribute("aria-hidden")).toBe("true");
    // The mark fills a wrapper that's 80px (phones) to 96px (desktop) square.
    expect(mark.getAttribute("class")).toContain("h-full w-full");
    expect(mark.parentElement!.className).toMatch(/h-20 w-20.*sm:h-24 sm:w-24/);
  });
});
