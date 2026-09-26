import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const CALCULATORS = join(process.cwd(), "src/app/calculators");

describe("calculator routes", () => {
  const routes = readdirSync(CALCULATORS, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  it("has the five calculators", () => {
    expect(routes.sort()).toEqual(
      ["bonus", "compound-interest", "paycheck", "retirement", "sinking-fund"],
    );
  });

  it("gives each one a page", () => {
    for (const route of routes) {
      expect(existsSync(join(CALCULATORS, route, "page.tsx")), route).toBe(true);
    }
  });

  it("links to each one from the calculators page", () => {
    const index = readFileSync(join(CALCULATORS, "page.tsx"), "utf8");
    for (const route of routes) {
      expect(index, route).toContain(`href: "/calculators/${route}"`);
    }
  });
});
