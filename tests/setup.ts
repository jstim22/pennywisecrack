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
