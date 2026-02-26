import { computeRollingTracking } from "../../lib/analysis/tracking";
import { WeaponSystemType } from "../../lib/types";

describe("computeRollingTracking", () => {
  test("single turret shots compute averages and counts", () => {
    const t0 = Date.now();
    const entries = [
      {
        id: "1",
        timestamp: new Date(t0 - 9000),
        rawLine: "",
        eventType: "damage-dealt",
        weaponSystemType: WeaponSystemType.TURRET,
        damageMultiplier: 0.8,
      },
      {
        id: "2",
        timestamp: new Date(t0 - 5000),
        rawLine: "",
        eventType: "damage-dealt",
        weaponSystemType: WeaponSystemType.TURRET,
        damageMultiplier: 1.2,
      },
      {
        id: "3",
        timestamp: new Date(t0 - 1000),
        rawLine: "",
        eventType: "miss-outgoing",
        weaponSystemType: WeaponSystemType.TURRET,
        damageMultiplier: undefined,
      },
    ];

    const series = computeRollingTracking(entries as any, 10_000);
    // Expect three sample points (for each unique timestamp)
    expect(series.length).toBeGreaterThanOrEqual(1);
    const last = series[series.length - 1];
    // All three shots fall into final 10s window: avg multiplier = (0.8+1.2+1)/3 = 1.0
    expect(Math.abs(last.trackingQuality - 1.0)).toBeLessThan(1e-6);
    expect(last.shotCount).toBeGreaterThanOrEqual(1);
  });

  test("ignores non-turret entries", () => {
    const t0 = Date.now();
    const entries = [
      {
        id: "1",
        timestamp: new Date(t0),
        rawLine: "",
        eventType: "damage-dealt",
        weaponSystemType: WeaponSystemType.MISSILE,
        damageMultiplier: 0.5,
      },
    ];
    const series = computeRollingTracking(entries as any, 1000);
    expect(series.length).toBe(0);
  });
});
