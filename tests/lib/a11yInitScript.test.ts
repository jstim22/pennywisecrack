import { describe, expect, it } from "vitest";
import { a11yInitScript } from "@/lib/a11yInitScript";

// The script is a hand-written, minified IIFE that runs before paint (see
// src/app/layout.tsx) to set <html> attributes from localStorage, avoiding a
// flash of the wrong theme/size/docked state. These tests actually run it
// against a stand-in <html> and localStorage, rather than just reading the
// source, so a typo in the minified string would fail a test.
function run(stored: Record<string, unknown> | null) {
  const html = { attrs: {} as Record<string, string> };
  const fakeHtml = {
    setAttribute: (k: string, v: string) => {
      html.attrs[k] = v;
    },
  };
  const fakeDocument = { documentElement: fakeHtml };
  const fakeLocalStorage = {
    getItem: () => (stored === null ? null : JSON.stringify(stored)),
  };
  const fn = new Function(
    "document",
    "localStorage",
    "window",
    `return (${a11yInitScript.replace(/;\s*$/, "")});`,
  );
  fn(fakeDocument, fakeLocalStorage, {
    matchMedia: () => ({ matches: false }),
  });
  return html.attrs;
}

describe("the pre-paint accessibility init script", () => {
  it("does nothing extra with no saved settings", () => {
    const attrs = run(null);
    expect(attrs["data-theme"]).toBe("light");
    expect(attrs["data-font-size"]).toBeUndefined();
    expect(attrs["data-contrast"]).toBeUndefined();
    expect(attrs["data-motion"]).toBeUndefined();
    expect(attrs["data-a11y-docked"]).toBeUndefined();
  });
  it("applies every saved setting", () => {
    const attrs = run({ theme: "dark", fontSize: "lg", contrast: "high", motion: "reduced", docked: true });
    expect(attrs["data-theme"]).toBe("dark");
    expect(attrs["data-font-size"]).toBe("lg");
    expect(attrs["data-contrast"]).toBe("high");
    expect(attrs["data-motion"]).toBe("reduced");
    expect(attrs["data-a11y-docked"]).toBe("true");
  });
  it("doesn't set data-a11y-docked for a falsy or missing docked value", () => {
    expect(run({ docked: false })["data-a11y-docked"]).toBeUndefined();
    expect(run({})["data-a11y-docked"]).toBeUndefined();
  });
  it("never sets the base font size as an attribute", () => {
    expect(run({ fontSize: "base" })["data-font-size"]).toBeUndefined();
  });
  it("swallows a broken localStorage value instead of throwing", () => {
    const fakeDocument = { documentElement: { setAttribute: () => {} } };
    const fn = new Function(
      "document",
      "localStorage",
      "window",
      `return (${a11yInitScript.replace(/;\s*$/, "")});`,
    );
    expect(() =>
      fn(fakeDocument, { getItem: () => "{not json" }, { matchMedia: () => ({ matches: false }) }),
    ).not.toThrow();
  });
});
