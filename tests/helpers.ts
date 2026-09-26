import { expect, it } from "vitest";

// Registers one test that passes when `actual` is within `tol` of `expected`.
// Values are computed while the suite is being collected, so a bad engine
// change shows up as the named check failing with both numbers in the message.
// (Called from inside an `it`, it just asserts right there.)
export function check(
  name: string,
  actual: number,
  expected: number,
  tol = 0.005,
) {
  const assert = () =>
    expect(
      Math.abs(actual - expected),
      `${name}: got ${actual}, expected ${expected}`,
    ).toBeLessThanOrEqual(tol);
  if (expect.getState().currentTestName) assert();
  else it(name, assert);
}

export function checkStr(name: string, actual: string, expected: string) {
  it(name, () => {
    expect(actual).toBe(expected);
  });
}

// Asserts right now that `actual` is within `tol` of `expected`. Use this
// inside an `it`; use `check` at the top of a `describe`.
export function near(actual: number, expected: number, tol = 0.005, name = "") {
  expect(
    Math.abs(actual - expected),
    `${name}: got ${actual}, expected ${expected}`,
  ).toBeLessThanOrEqual(tol);
}
