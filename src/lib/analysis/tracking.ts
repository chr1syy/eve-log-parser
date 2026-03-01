import type { LogEntry } from "../types";

import { WeaponSystemType } from "../types";

import type { TrackingSeries } from "../types";

function isDisintegratorWeapon(weapon?: string): boolean {
  return weapon?.toLowerCase().includes("disintegrator") ?? false;
}

export function isTrackingEligibleTurretShot(entry: LogEntry): boolean {
  if (entry.weaponSystemType !== WeaponSystemType.TURRET) return false;
  // Tracking overlay is for the pilot's own weapon application only.
  if (entry.eventType !== "damage-dealt" && entry.eventType !== "miss-outgoing")
    return false;
  return !isDisintegratorWeapon(entry.weapon);
}

/**
 * Compute rolling tracking quality for turret weapon entries.
 * Uses an efficient two-pointer sliding window (windowMs) and
 * emits one TrackingSeries per window aligned to the window end timestamp.
 */
export function computeRollingTracking(
  entries: LogEntry[],
  windowMs: number = 10_000,
): TrackingSeries[] {
  // Filter turret shots (include misses and hits) and sort by timestamp
  const turretShots = entries
    .filter(isTrackingEligibleTurretShot)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  if (turretShots.length === 0) return [];

  // Create an array of timestamps (ms) for unique sample points (use shot times)
  const timestamps = Array.from(
    new Set(turretShots.map((s) => s.timestamp.getTime())),
  ).sort((a, b) => a - b);

  const result: TrackingSeries[] = [];

  // sliding window pointers
  let start = 0;
  let end = 0;

  // running sums
  let multiplierSum = 0; // sum of damageMultiplier for hits inside window
  let shotCount = 0; // total shots (hits + misses)
  let hitCount = 0;
  let missCount = 0;

  for (const t of timestamps) {
    const windowStart = t - windowMs;

    // advance end pointer to include shots up to time t
    while (
      end < turretShots.length &&
      turretShots[end].timestamp.getTime() <= t
    ) {
      const s = turretShots[end];
      // Count as shot (hit or miss)
      shotCount++;
      // Determine miss vs hit by eventType or hitQuality
      if (
        s.eventType === "miss-outgoing" ||
        s.eventType === "miss-incoming" ||
        s.hitQuality === "misses"
      ) {
        missCount++;
      } else {
        hitCount++;
      }

      // damageMultiplier may be undefined — treat undefined as 1.0 (neutral)
      const m = s.damageMultiplier ?? 1;
      multiplierSum += m;
      end++;
    }

    // advance start pointer to remove shots older than windowStart
    while (
      start < turretShots.length &&
      turretShots[start].timestamp.getTime() < windowStart
    ) {
      const s = turretShots[start];
      shotCount--;
      if (
        s.eventType === "miss-outgoing" ||
        s.eventType === "miss-incoming" ||
        s.hitQuality === "misses"
      ) {
        missCount--;
      } else {
        hitCount--;
      }
      multiplierSum -= s.damageMultiplier ?? 1;
      start++;
    }

    const shotsInWindow = shotCount;
    const avgMultiplier = shotsInWindow > 0 ? multiplierSum / shotsInWindow : 0;

    result.push({
      timestamp: t,
      trackingQuality: avgMultiplier,
      shotCount: shotsInWindow,
      hitCount,
      missCount,
    });
  }

  return result;
}
