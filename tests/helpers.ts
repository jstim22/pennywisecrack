import { expect, it } from "vitest";

// Registers one test that passes when `actual` is within `tol` of `expected`.
// Values are computed while the suite is being collected, so a bad engine
// change shows up as the named check failing with both numbers in the message.
export function check(
  name: string,
  actual: number,
  expected: number,
  tol = 0.005,
) {
  it(name, () => {
    expect(
      Math.abs(actual - expected),
      `${name}: got ${actual}, expected ${expected}`,
    ).toBeLessThanOrEqual(tol);
  });
}

export function checkStr(name: string, actual: string, expected: string) {
  it(name, () => {
    expect(actual).toBe(expected);
  });
}
