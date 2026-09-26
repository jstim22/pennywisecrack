import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unmount whatever a component test rendered so tests don't leak into each other.
afterEach(cleanup);
