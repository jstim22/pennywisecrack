import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ALL_CALCULATORS, CALCULATOR_SECTIONS } from "@/lib/calculatorCatalog";

const APP = join(process.cwd(), "src/app");
const CALCULATORS = join(APP, "calculators");

describe("calculator routes", () => {
  const routes = readdirSync(CALCULATORS, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  it("has the thirteen calculators", () => {
    expect(routes.sort()).toEqual(
      [
        "bonus",
        "budget",
        "car-loan",
        "compound-interest",
        "debt-payoff",
        "income-tax",
        "mortgage",
        "net-worth",
        "opportunity-cost",
        "paycheck",
        "retirement",
        "sinking-fund",
        "student-loans",
      ],
    );
  });

  it("gives each one a page", () => {
    for (const route of routes) {
      expect(existsSync(join(CALCULATORS, route, "page.tsx")), route).toBe(true);
    }
  });

  it("lists each one in exactly one section of the calculators page", () => {
    const listed = ALL_CALCULATORS.map((t) => t.href);
    expect(new Set(listed).size).toBe(listed.length);
    expect(listed.sort()).toEqual(routes.map((r) => `/calculators/${r}`).sort());
  });
});

describe("calculator sections", () => {
  it("have unique ids, labels, and titles", () => {
    for (const key of ["id", "label", "title"] as const) {
      const values = CALCULATOR_SECTIONS.map((s) => s[key]);
      expect(new Set(values).size, key).toBe(values.length);
    }
  });
  it("have URL-safe ids", () => {
    for (const s of CALCULATOR_SECTIONS) expect(s.id).toMatch(/^[a-z][a-z0-9-]*$/);
  });
  it("each hold at least one calculator", () => {
    for (const s of CALCULATOR_SECTIONS) expect(s.tools.length, s.id).toBeGreaterThan(0);
  });
  it("group related tools together", () => {
    const section = (id: string) => CALCULATOR_SECTIONS.find((s) => s.id === id)!.tools.map((t) => t.href);
    expect(section("paying-off-debt")).toEqual(["/calculators/debt-payoff", "/calculators/student-loans"]);
    expect(section("big-purchase")).toEqual([
      "/calculators/car-loan",
      "/calculators/mortgage",
      "/calculators/opportunity-cost",
    ]);
  });
  it("give every calculator a title and description", () => {
    for (const t of ALL_CALCULATORS) {
      expect(t.title.length, t.href).toBeGreaterThan(2);
      expect(t.description.length, t.href).toBeGreaterThan(20);
    }
  });
});

describe("legal pages", () => {
  it("has a disclaimer and a privacy page", () => {
    expect(existsSync(join(APP, "disclaimer/page.tsx"))).toBe(true);
    expect(existsSync(join(APP, "privacy/page.tsx"))).toBe(true);
  });
  it("shows a disclaimer on the calculators, blog, and learning sections", () => {
    for (const section of ["calculators", "blog", "learning"]) {
      const layout = readFileSync(join(APP, section, "layout.tsx"), "utf8");
      expect(layout, section).toContain("DisclaimerNote");
    }
  });
});
