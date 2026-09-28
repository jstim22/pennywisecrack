import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unmount whatever a component test rendered so tests don't leak into each other.
afterEach(cleanup);

// jsdom has no ResizeObserver; charts that measure their container need one.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub;

// jsdom has no matchMedia either; components that check the OS color scheme
// (dark mode, reduced motion) need one. Always reports "no match" — tests
// that care about a specific match construct their own mock.
globalThis.matchMedia ??=
  ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
