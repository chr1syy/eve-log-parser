import { describe, it, expect } from "vitest";
import { resolveBrushRange } from "../../components/charts/DamageDealtChart";

describe("resolveBrushRange", () => {
  const t0 = new Date("2024-01-01T00:00:00Z");
  const t1 = new Date("2024-01-01T00:00:05Z");
  const t2 = new Date("2024-01-01T00:00:10Z");
  const data = [{ timestamp: t0 }, { timestamp: t1 }, { timestamp: t2 }];

  it("returns null when data is empty or indices are undefined", () => {
    expect(resolveBrushRange([], 0, 1)).toBeNull();
    expect(resolveBrushRange(data, undefined, 1)).toBeNull();
    expect(resolveBrushRange(data, 0, undefined)).toBeNull();
  });

  it("returns start/end for normal indices", () => {
    const r = resolveBrushRange(data, 0, 2);
    expect(r).not.toBeNull();
    expect(r?.start.toISOString()).toBe(t0.toISOString());
    expect(r?.end.toISOString()).toBe(t2.toISOString());
  });

  it("clamps out-of-bounds indices and handles reversed indices", () => {
    // startIndex > lastIndex and endIndex < 0 -> clamps to 0..2
    const r = resolveBrushRange(data, 999, -5);
    expect(r).not.toBeNull();
    expect(r?.start.toISOString()).toBe(t0.toISOString());
    expect(r?.end.toISOString()).toBe(t2.toISOString());

    // reversed indices (2,0) should still return 0..2
    const r2 = resolveBrushRange(data, 2, 0);
    expect(r2).not.toBeNull();
    expect(r2?.start.toISOString()).toBe(t0.toISOString());
    expect(r2?.end.toISOString()).toBe(t2.toISOString());
  });
});
