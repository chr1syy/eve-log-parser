import { describe, expect, it } from "vitest";
import { resolveBrushRange } from "../../components/charts/DamageDealtChart";

describe("resolveBrushRange", () => {
  it("returns null when data or indices are missing", () => {
    const base = new Date("2024-01-01T00:00:00Z");
    expect(resolveBrushRange([], 0, 1)).toBeNull();
    expect(resolveBrushRange([{ timestamp: base }], undefined, 1)).toBeNull();
    expect(resolveBrushRange([{ timestamp: base }], 0, undefined)).toBeNull();
  });

  it("clamps and orders indices to return a valid range", () => {
    const base = new Date("2024-01-01T00:00:00Z");
    const data = [
      { timestamp: base },
      { timestamp: new Date(base.getTime() + 1000) },
      { timestamp: new Date(base.getTime() + 2000) },
    ];

    const range = resolveBrushRange(data, 5, -2);

    expect(range?.start.getTime()).toBe(data[0]?.timestamp.getTime());
    expect(range?.end.getTime()).toBe(data[2]?.timestamp.getTime());
  });
});
