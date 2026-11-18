import { describe, expect, it } from "vitest";
import { assertReconciles, formatCurrency, formatDelta, formatNumber, initials, percentChange, sum, toShares } from "./format";

describe("format", () => {
  it("formats en-GB numbers and pounds", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
    expect(formatCurrency(48210)).toBe("£48,210");
    expect(formatCurrency(4.5, { pence: true })).toBe("£4.50");
  });

  it("uses a real minus sign for negative deltas", () => {
    expect(formatDelta(12)).toBe("+12%");
    expect(formatDelta(-3)).toBe("−3%");
    expect(formatDelta(0)).toBe("0%");
  });

  it("toShares always sums to exactly 100", () => {
    const cases = [[1, 1, 1], [31240, 6120, 4410, 2210, 1330, 410], [5, 0, 0], [1, 2, 3, 4, 5, 6, 7], [999, 1]];
    for (const values of cases) expect(sum(toShares(values))).toBe(100);
    expect(toShares([1, 1, 1])).toEqual([34, 33, 33]);
    expect(toShares([0, 0])).toEqual([0, 0]);
    expect(sum(toShares([1, 1, 1], 1))).toBeCloseTo(100, 5);
  });

  it("assertReconciles throws when parts don't add up", () => {
    expect(() => assertReconciles("Revenue", 100, [60, 40])).not.toThrow();
    expect(() => assertReconciles("Revenue", 100, [60, 30])).toThrow(/Revenue: total 100/);
  });

  it("handles missing baselines", () => {
    expect(percentChange(110, 100)).toBeCloseTo(10);
    expect(percentChange(5, 0)).toBeNull();
  });

  it("builds initials", () => {
    expect(initials("Priya Kaur")).toBe("PK");
    expect(initials("Mary Jane Watson")).toBe("MW");
    expect(initials("fellas")).toBe("F");
  });
});
