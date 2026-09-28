import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AccessibilityWidget from "@/components/AccessibilityWidget";

// These check the actual <html> attribute, since that (plus the matching CSS
// in globals.css) is what really shows/hides the docked tab vs. the full
// button — see the comment in AccessibilityWidget.tsx.
const isDocked = () => document.documentElement.hasAttribute("data-a11y-docked");

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-a11y-docked");
});
afterEach(() => {
  document.documentElement.removeAttribute("data-a11y-docked");
});

describe("Accessibility widget: docking to the side", () => {
  it("starts undocked, with both the full button and the docked tab in the DOM", () => {
    render(<AccessibilityWidget />);
    expect(screen.getByRole("button", { name: "Accessibility options" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Show accessibility options" })).toBeTruthy();
    expect(isDocked()).toBe(false);
  });

  it("docks when you open the panel and choose to move it out of the way", async () => {
    render(<AccessibilityWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Accessibility options" }));
    expect(screen.getByText("Accessibility Options")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Move out of the way" }));
    await waitFor(() => expect(isDocked()).toBe(true));
    // The panel closes along with docking.
    expect(screen.queryByText("Accessibility Options")).toBeNull();
  });

  it("undocks from the tab, back to the closed full button (not a reopened panel)", async () => {
    render(<AccessibilityWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Accessibility options" }));
    fireEvent.click(screen.getByRole("button", { name: "Move out of the way" }));
    await waitFor(() => expect(isDocked()).toBe(true));

    fireEvent.click(screen.getByRole("button", { name: "Show accessibility options" }));
    await waitFor(() => expect(isDocked()).toBe(false));
    expect(screen.queryByText("Accessibility Options")).toBeNull();
    expect(screen.getByRole("button", { name: "Accessibility options" })).toBeTruthy();
  });

  it("remembers being docked across a reload", async () => {
    const { unmount } = render(<AccessibilityWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Accessibility options" }));
    fireEvent.click(screen.getByRole("button", { name: "Move out of the way" }));
    await waitFor(() => expect(isDocked()).toBe(true));
    unmount();

    const stored = JSON.parse(localStorage.getItem("pw-a11y") ?? "{}");
    expect(stored.docked).toBe(true);

    document.documentElement.removeAttribute("data-a11y-docked");
    render(<AccessibilityWidget />);
    await waitFor(() => expect(isDocked()).toBe(true));
  });

  it("doesn't clobber your other settings when you dock", async () => {
    render(<AccessibilityWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Accessibility options" }));
    fireEvent.click(screen.getByRole("button", { name: "A+" }));
    fireEvent.click(screen.getByRole("button", { name: "Move out of the way" }));
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("pw-a11y") ?? "{}");
      expect(stored.fontSize).toBe("lg");
      expect(stored.docked).toBe(true);
    });
  });
});
