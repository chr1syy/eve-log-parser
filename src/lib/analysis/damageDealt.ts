import type { LogEntry, HitQuality } from "../types";
import { detectFightBoundaries } from "./fightBoundaries";

export interface TargetEngagement {
  target: string; // pilotName or NPC name
  shipType: string;
  corp?: string;
  firstHit: Date;
  lastHit: Date;
  windowSeconds: number;
  totalDamage: number;
  hitCount: number;
  dps: number; // totalDamage / windowSeconds (0 if single hit)
  minHit: number;
  maxHit: number;
  avgHit: number;
  hitQualities: Partial<Record<HitQuality, number>>;
}

export interface WeaponApplicationSummary {
  weapon: string;
  isDrone: boolean;
  hitCount: number;
  totalDamage: number;
  minHit: number;
  maxHit: number;
  avgHit: number;
  hitQualities: Partial<Record<HitQuality, number>>;
}

export interface DamageDealtAnalysis {
  engagements: TargetEngagement[]; // sorted by totalDamage desc
  weaponSummaries: WeaponApplicationSummary[]; // turrets/missiles
  droneSummaries: WeaponApplicationSummary[]; // drones only
  overallDps: number; // total damage / total active combat seconds
  totalDamageDealt: number;
  totalHits: number;
  overallHitQualities: Partial<Record<HitQuality, number>>;
}

export function analyzeDamageDealt(entries: LogEntry[]): DamageDealtAnalysis {
  // Filter to outgoing damage only
  const damageEntries = entries.filter((e) => e.eventType === "damage-dealt");

  if (damageEntries.length === 0) {
    return {
      engagements: [],
      weaponSummaries: [],
      droneSummaries: [],
      overallDps: 0,
      totalDamageDealt: 0,
      totalHits: 0,
      overallHitQualities: {},
    };
  }

  // --- Engagement windows per target ---
  const engagementMap = new Map<string, LogEntry[]>();
  for (const entry of damageEntries) {
    const targetName = entry.pilotName ?? entry.shipType ?? "Unknown";
    const shipType = entry.shipType ?? "Unknown";
    const key = `${targetName}||${shipType}`;
    if (!engagementMap.has(key)) engagementMap.set(key, []);
    engagementMap.get(key)!.push(entry);
  }

  const engagements: TargetEngagement[] = [];
  for (const [key, group] of engagementMap) {
    const [targetName, shipType] = key.split("||");
    const timestamps = group.map((e) => e.timestamp.getTime());
    const firstHitMs = Math.min(...timestamps);
    const lastHitMs = Math.max(...timestamps);
    const firstHit = new Date(firstHitMs);
    const lastHit = new Date(lastHitMs);
    const rawWindowSeconds = (lastHitMs - firstHitMs) / 1000;
    // Single hit: use 1s to avoid divide-by-zero, but mark dps = 0 to signal N/A
    const windowSeconds = rawWindowSeconds > 0 ? rawWindowSeconds : 1;
    const isSingleHit = rawWindowSeconds === 0;

    const amounts = group.map((e) => e.amount ?? 0);
    const totalDamage = amounts.reduce((a, b) => a + b, 0);
    const hitCount = group.length;
    const minHit = Math.min(...amounts);
    const maxHit = Math.max(...amounts);
    const avgHit = hitCount > 0 ? totalDamage / hitCount : 0;
    const dps = isSingleHit ? 0 : totalDamage / windowSeconds;

    const hitQualities: Partial<Record<HitQuality, number>> = {};
    for (const entry of group) {
      if (entry.hitQuality) {
        hitQualities[entry.hitQuality] =
          (hitQualities[entry.hitQuality] ?? 0) + 1;
      }
    }

    const corp = group.find((e) => e.corpTicker)?.corpTicker;

    engagements.push({
      target: targetName,
      shipType,
      corp,
      firstHit,
      lastHit,
      windowSeconds,
      totalDamage,
      hitCount,
      dps,
      minHit,
      maxHit,
      avgHit,
      hitQualities,
    });
  }

  // Sort by totalDamage desc
  engagements.sort((a, b) => b.totalDamage - a.totalDamage);

  // --- Weapon summaries ---
  const weaponMap = new Map<string, LogEntry[]>();
  for (const entry of damageEntries) {
    const weapon = entry.weapon ?? "Unknown";
    if (!weaponMap.has(weapon)) weaponMap.set(weapon, []);
    weaponMap.get(weapon)!.push(entry);
  }

  const weaponSummaries: WeaponApplicationSummary[] = [];
  const droneSummaries: WeaponApplicationSummary[] = [];

  for (const [weapon, group] of weaponMap) {
    const isDrone = group.some((e) => e.isDrone === true);
    const amounts = group.map((e) => e.amount ?? 0);
    const totalDamage = amounts.reduce((a, b) => a + b, 0);
    const hitCount = group.length;
    const minHit = Math.min(...amounts);
    const maxHit = Math.max(...amounts);
    const avgHit = hitCount > 0 ? totalDamage / hitCount : 0;

    const hitQualities: Partial<Record<HitQuality, number>> = {};
    for (const entry of group) {
      if (entry.hitQuality) {
        hitQualities[entry.hitQuality] =
          (hitQualities[entry.hitQuality] ?? 0) + 1;
      }
    }

    const summary: WeaponApplicationSummary = {
      weapon,
      isDrone,
      hitCount,
      totalDamage,
      minHit,
      maxHit,
      avgHit,
      hitQualities,
    };

    if (isDrone) {
      droneSummaries.push(summary);
    } else {
      weaponSummaries.push(summary);
    }
  }

  // Sort by totalDamage desc
  weaponSummaries.sort((a, b) => b.totalDamage - a.totalDamage);
  droneSummaries.sort((a, b) => b.totalDamage - a.totalDamage);

  // --- Overall stats ---
  const allTimestamps = damageEntries.map((e) => e.timestamp.getTime());
  const firstMs = Math.min(...allTimestamps);
  const lastMs = Math.max(...allTimestamps);
  const overallWindowSeconds = (lastMs - firstMs) / 1000;
  const totalDamageDealt = damageEntries.reduce(
    (a, e) => a + (e.amount ?? 0),
    0,
  );
  const overallDps =
    overallWindowSeconds > 0 ? totalDamageDealt / overallWindowSeconds : 0;
  const totalHits = damageEntries.length;

  const overallHitQualities: Partial<Record<HitQuality, number>> = {};
  for (const entry of damageEntries) {
    if (entry.hitQuality) {
      overallHitQualities[entry.hitQuality] =
        (overallHitQualities[entry.hitQuality] ?? 0) + 1;
    }
  }

  return {
    engagements,
    weaponSummaries,
    droneSummaries,
    overallDps,
    totalDamageDealt,
    totalHits,
    overallHitQualities,
  };
}

export interface DamageDealtPoint {
  timestamp: Date;
  dps: number; // rolling 10s total outgoing DPS
  badHitPct: number; // % of hits in this window that are Glances Off or Grazes
}

export interface TackleWindow {
  start: Date;
  end: Date;
  targetShip?: string;
  targetShips?: Set<string>;
}

export interface DamageDealtTimeSeries {
  points: DamageDealtPoint[];
  tackleWindows: TackleWindow[];
  // Start timestamps (ms since epoch) for detected fight segments based on
  // outgoing damage activity. Useful for aligning UI segments with other
  // analyses (eg. damage-taken).
  fightBoundaries?: number[];
}

const BAD_HIT_QUALITIES = new Set<HitQuality>(["Glances Off", "Grazes"]);
const WINDOW_MS = 10_000;

export function computeTackleWindows(entries: LogEntry[]): TackleWindow[] {
  const scramEvents = entries
    .filter(
      (e) => e.eventType === "warp-scram" && e.tackleDirection === "outgoing",
    )
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  if (scramEvents.length === 0) return [];

  const windows: TackleWindow[] = [];
  let windowStart = scramEvents[0].timestamp;
  let windowEnd = scramEvents[0].timestamp;
  let currentTarget = scramEvents[0].tackleTarget;
  const targetShips = new Set<string>();
  if (currentTarget) targetShips.add(currentTarget);
  const MERGE_GAP_MS = 20_000;

  for (let i = 1; i < scramEvents.length; i++) {
    const curr = scramEvents[i].timestamp.getTime();
    const prev = windowEnd.getTime();
    const nextTarget = scramEvents[i].tackleTarget;

    // Split window if target changes OR gap exceeds threshold
    if (nextTarget !== currentTarget || curr - prev > MERGE_GAP_MS) {
      windows.push({
        start: windowStart,
        end: new Date(windowEnd.getTime() + MERGE_GAP_MS),
        targetShip: currentTarget,
        targetShips,
      });
      windowStart = scramEvents[i].timestamp;
      currentTarget = nextTarget;
      targetShips.clear();
      if (nextTarget) targetShips.add(nextTarget);
    } else {
      // Same target, within gap → extend window
      windowEnd = scramEvents[i].timestamp;
      if (nextTarget) targetShips.add(nextTarget);
    }
  }

  // Flush last window
  if (windowStart <= windowEnd) {
    windows.push({
      start: windowStart,
      end: new Date(windowEnd.getTime() + MERGE_GAP_MS),
      targetShip: currentTarget,
      targetShips,
    });
  }

  return windows;
}

export function generateDamageDealtTimeSeries(
  entries: LogEntry[],
  excludeDrones?: boolean,
): DamageDealtTimeSeries {
  const dealtEntries = entries
    .filter(
      (e) => e.eventType === "damage-dealt" && (!excludeDrones || !e.isDrone),
    )
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const missEntries = entries.filter(
    (e) => e.eventType === "miss-outgoing" && (!excludeDrones || !e.isDrone),
  );

  const tackleWindows = computeTackleWindows(entries);

  // For parity with the damage-taken pipeline prefer to derive fight
  // boundaries from incoming damage events when they exist. This keeps the
  // start timestamps aligned between both analyses even when outgoing shots
  // are offset by a few milliseconds.
  const receivedEntries = entries.filter(
    (e) => e.eventType === "damage-received",
  );
  const fightBoundaries =
    receivedEntries.length > 0
      ? detectFightBoundaries(receivedEntries)
      : detectFightBoundaries(dealtEntries);

  if (dealtEntries.length === 0)
    return { points: [], tackleWindows, fightBoundaries };

  // All shot events (hits + misses) sorted for bad-hit % calculation
  const allShots = [...dealtEntries, ...missEntries].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );

  const points: DamageDealtPoint[] = [];

  // Extract unique timestamps from dealt entries. If we derived fight
  // boundaries from receivedEntries (damage-received) include those
  // timestamps as well so the outgoing time series covers the same global
  // domain as the damage-taken pipeline. This helps UI alignment tests that
  // map timestamps to pixel positions.
  const dealtTs = dealtEntries.map((e) => e.timestamp.getTime());
  const receivedTs = receivedEntries.map((e) => e.timestamp.getTime());
  const combinedSet = new Set<number>([...dealtTs, ...receivedTs]);
  const uniqueTs = Array.from(combinedSet).sort((a, b) => a - b);

  // Ensure the time series spans the full range of the input log so pixel
  // mapping between charts that use different sampling strategies aligns.
  // Add global min/max timestamps from all entries when present.
  if (entries.length > 0) {
    const allEntryTs = entries.map((e) => e.timestamp.getTime());
    const globalMin = Math.min(...allEntryTs);
    const globalMax = Math.max(...allEntryTs);
    if (!combinedSet.has(globalMin)) uniqueTs.unshift(globalMin);
    if (!combinedSet.has(globalMax)) uniqueTs.push(globalMax);
  }

  // Also ensure the range covers damage-received bounds when available so the
  // outgoing series maps to the same domain as the damage-taken series.
  if (receivedEntries.length > 0) {
    const recTs = receivedEntries.map((e) => e.timestamp.getTime());
    const recMin = Math.min(...recTs);
    const recMax = Math.max(...recTs);
    if (!combinedSet.has(recMin)) uniqueTs.unshift(recMin);
    if (!combinedSet.has(recMax)) uniqueTs.push(recMax);
  }

  // If there are large gaps with no activity we insert zero-value sample
  // timestamps inside the gap so the chart drops to 0 instead of
  // interpolating between widely separated points. Use a threshold of
  // 3 minutes (LONG_GAP_MS) — gaps longer than this will get two zero
  // samples inserted: one after the last activity window and one before
  // the next activity window (taking WINDOW_MS into account so the zero
  // point falls outside the rolling window that computes DPS).
  const LONG_GAP_MS = 1.5 * 60 * 1000; // 1.5 minutes
  const expandedTs: number[] = [];
  for (let i = 0; i < uniqueTs.length; i++) {
    const t = uniqueTs[i];
    expandedTs.push(t);
    if (i < uniqueTs.length - 1) {
      const next = uniqueTs[i + 1];
      const gap = next - t;
      if (gap > LONG_GAP_MS) {
        const zeroAfter = t + WINDOW_MS + 1; // just outside the rolling window after t
        const zeroBefore = next - WINDOW_MS - 1; // just before next's rolling window
        if (zeroAfter < zeroBefore) {
          expandedTs.push(zeroAfter);
          expandedTs.push(zeroBefore);
        }
      }
    }
  }
  const timestampsToUse = expandedTs.length > 0 ? expandedTs : uniqueTs;

  // Sliding window pointers for damage (O(n))
  let damageStart = 0;
  let damageEnd = 0;
  let damageSum = 0;

  // Sliding window pointers for shots (O(n))
  let shotStart = 0;
  let shotEnd = 0;

  for (const t of timestampsToUse) {
    const windowStart = t - WINDOW_MS;

    // Advance damageStart pointer: remove entries older than window
    while (
      damageStart < dealtEntries.length &&
      dealtEntries[damageStart].timestamp.getTime() < windowStart
    ) {
      damageSum -= dealtEntries[damageStart].amount ?? 0;
      damageStart++;
    }

    // Advance damageEnd pointer: add entries up to current time
    while (
      damageEnd < dealtEntries.length &&
      dealtEntries[damageEnd].timestamp.getTime() <= t
    ) {
      damageSum += dealtEntries[damageEnd].amount ?? 0;
      damageEnd++;
    }

    const dps = damageSum / (WINDOW_MS / 1000);

    // Advance shotStart pointer: remove shots older than window
    while (
      shotStart < allShots.length &&
      allShots[shotStart].timestamp.getTime() < windowStart
    ) {
      shotStart++;
    }

    // Advance shotEnd pointer: count shots up to current time
    while (
      shotEnd < allShots.length &&
      allShots[shotEnd].timestamp.getTime() <= t
    ) {
      shotEnd++;
    }

    // Count bad hits in [shotStart, shotEnd)
    let badHits = 0;
    for (let i = shotStart; i < shotEnd; i++) {
      const shot = allShots[i];
      if (shot.eventType === "miss-outgoing") {
        badHits++;
        continue;
      }
      if (shot.hitQuality === "misses") {
        badHits++;
        continue;
      }
      if (
        shot.hitQuality != null &&
        BAD_HIT_QUALITIES.has(shot.hitQuality as HitQuality)
      ) {
        badHits++;
      }
    }

    const shotsInWindow = shotEnd - shotStart;
    const badHitPct = shotsInWindow > 0 ? (badHits / shotsInWindow) * 100 : 0;

    points.push({
      timestamp: new Date(t),
      dps,
      badHitPct,
    });
  }

  return { points, tackleWindows, fightBoundaries };
}
