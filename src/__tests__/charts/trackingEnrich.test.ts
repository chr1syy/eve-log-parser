import { describe, it, expect } from "vitest";
import { buildEnrichedTrackingData } from "@/components/charts/DamageDealtChart";
import type { TrackingSeries } from "@/lib/types";

// Helper to build a minimal DamageDealtPoint with timestampMs
function pt(tsMs: number, dps = 100) {
  return { timestamp: new Date(tsMs), dps, badHitPct: 0, timestampMs: tsMs };
}

// Helper to build a TrackingSeries sample placed exactly at a given ms
function ts(tsMs: number, tq: number): TrackingSeries {
  return { timestamp: tsMs, trackingQuality: tq, shotCount: 1, hitCount: 1, missCount: 0 };
}

describe("buildEnrichedTrackingData — tier bridging", () => {
  it("returns data unchanged when trackingSeries is empty", () => {
    const data = [pt(1000), pt(2000)];
    const result = buildEnrichedTrackingData(data, []);
    expect(result).toEqual(data);
  });

  it("Mid → Low → Mid: bridges the Low point into Mid so no line gap", () => {
    // Three DPS chart data points spaced 10 s apart.
    // Tracking samples are placed directly on the data-point timestamps so
    // no interpolation is needed and the tier assignments are deterministic.
    const T0 = 0;
    const T1 = 10_000;
    const T2 = 20_000;

    const data = [pt(T0), pt(T1), pt(T2)];
    const tracking = [
      ts(T0, 0.9),   // Mid
      ts(T1, 0.5),   // Low  ← isolated between two Mid neighbours
      ts(T2, 0.85),  // Mid
    ];

    const result = buildEnrichedTrackingData(data, tracking);

    // T0: pure Mid
    expect(result[0].trackingMid).toBeCloseTo(0.9);
    expect(result[0].trackingLow).toBeNull();
    expect(result[0].trackingHigh).toBeNull();

    // T1: the Low-tier point must be bridged into Mid (prevTier = Mid, nextTier = Mid)
    expect(result[1].trackingLow).toBeCloseTo(0.5);   // own tier still set
    expect(result[1].trackingMid).toBeCloseTo(0.5);   // bridge into Mid tier
    expect(result[1].trackingHigh).toBeNull();

    // T2: Mid tier, but prev=Low so bridge on arrival extends Low line here too
    expect(result[2].trackingMid).toBeCloseTo(0.85);
    expect(result[2].trackingLow).toBeCloseTo(0.85); // bridge from prev Low tier
    expect(result[2].trackingHigh).toBeNull();
  });

  it("Low → High → Low: bridges the High point into Low on both sides", () => {
    const T0 = 0;
    const T1 = 10_000;
    const T2 = 20_000;

    const data = [pt(T0), pt(T1), pt(T2)];
    const tracking = [
      ts(T0, 0.5),   // Low
      ts(T1, 1.2),   // High ← isolated between two Low neighbours
      ts(T2, 0.6),   // Low
    ];

    const result = buildEnrichedTrackingData(data, tracking);

    expect(result[1].trackingHigh).toBeCloseTo(1.2);  // own tier
    expect(result[1].trackingLow).toBeCloseTo(1.2);   // bridge into Low (both sides)
    expect(result[1].trackingMid).toBeNull();
  });

  it("continuous same-tier run: no bridging needed", () => {
    const T0 = 0;
    const T1 = 10_000;
    const T2 = 20_000;

    const data = [pt(T0), pt(T1), pt(T2)];
    const tracking = [ts(T0, 0.8), ts(T1, 0.75), ts(T2, 0.9)]; // all Mid

    const result = buildEnrichedTrackingData(data, tracking);

    for (const p of result) {
      expect(p.trackingHigh).toBeNull();
      expect(p.trackingLow).toBeNull();
      expect(typeof p.trackingMid).toBe("number");
    }
  });

  it("transition from Mid to Low: bridge on arrival at T1, no bridge at T2", () => {
    // Mid at T0, Low at T1, Low at T2.  T1 is the first Low point (prev=Mid)
    // so bridge on arrival fires: T1 is written into Mid.  T2 is also Low
    // (prev=Low) so no bridge at T2 — the Mid line ends at T1.
    const T0 = 0;
    const T1 = 10_000;
    const T2 = 20_000;

    const data = [pt(T0), pt(T1), pt(T2)];
    const tracking = [ts(T0, 0.85), ts(T1, 0.5), ts(T2, 0.55)];

    const result = buildEnrichedTrackingData(data, tracking);

    // T1: Low tier, prev=Mid → bridge on arrival extends Mid line here
    expect(result[1].trackingLow).toBeCloseTo(0.5);
    expect(result[1].trackingMid).toBeCloseTo(0.5); // bridge from prev Mid tier

    // T2: both prev and curr are Low — no bridge
    expect(result[2].trackingLow).toBeCloseTo(0.55);
    expect(result[2].trackingMid).toBeNull();
  });
});
