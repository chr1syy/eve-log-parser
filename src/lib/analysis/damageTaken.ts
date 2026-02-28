import type { LogEntry, HitQuality } from "../types";

export interface DpsWindow {
  windowSeconds: number; // 10, 30, or 60
  maxDps: number;
  peakTimestamp: Date; // when the peak occurred
}

export interface FightSegment {
  start: Date;
  end: Date;
  durationSeconds: number;
  entries: LogEntry[]; // damage-received events in this fight
}

export interface TimeSeriesDpsPoint {
  timestamp: Date;
  dps: number; // rolling 10s window ending at this timestamp
  fightIndex: number; // which fight segment
}

export interface AttackerTimeSeries {
  source: string;
  shipType?: string;
  isNpc?: boolean;
  color: string;
  timeSeries: TimeSeriesDpsPoint[];
}

export interface IncomingWeaponSummary {
  source: string; // attacker name/NPC
  shipType?: string; // ship type of attacker (auto-detected from first matching entry)
  weapon: string;
  isDrone: boolean;
  hitCount: number;
  missCount: number; // count of miss-incoming events for this weapon
  totalDamage: number;
  minHit: number;
  maxHit: number;
  hitQualities: Partial<Record<HitQuality, number>>;
  // first/last hit timestamps for this source+weapon window — useful for
  // programmatic zooming of the timeline when the user clicks a row.
  firstHit?: Date;
  lastHit?: Date;
}

export interface DamageTakenAnalysis {
  totalDamageReceived: number;
  totalIncomingHits: number;
  fights: FightSegment[];
  dpsTimeSeries: TimeSeriesDpsPoint[];
  peakDps10s: DpsWindow;
  peakDps30s: DpsWindow;
  peakDps60s: DpsWindow;
  incomingWeaponSummaries: IncomingWeaponSummary[]; // non-drone
  incomingDroneSummaries: IncomingWeaponSummary[]; // drone only
  attackerTimeSeries: AttackerTimeSeries[]; // per-non-npc attacker DPS time series
  overallHitQualities: Partial<Record<HitQuality, number>>;
}

const FIGHT_GAP_MS = 60_000; // 60 seconds
// If two events are separated by more than this threshold we insert zero
// points in the time series to avoid visually interpolating a slow decline.
// (defined for parity with damageDealt but unused here)
// Gap insert threshold kept for documentation parity with damageDealt
// (unused but intentionally present for future behavior alignment).
/* eslint-disable @typescript-eslint/no-unused-vars */
const _GAP_INSERT_THRESHOLD_MS = 90_000; // 1.5 minutes
/* eslint-enable @typescript-eslint/no-unused-vars */

function segmentFights(entries: LogEntry[]): FightSegment[] {
  const sorted = [...entries].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );
  if (sorted.length === 0) return [];

  const segments: FightSegment[] = [];
  let currentGroup: LogEntry[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].timestamp.getTime();
    const curr = sorted[i].timestamp.getTime();
    if (curr - prev > FIGHT_GAP_MS) {
      // Flush current group
      const start = currentGroup[0].timestamp;
      const end = currentGroup[currentGroup.length - 1].timestamp;
      segments.push({
        start,
        end,
        durationSeconds: Math.max(1, (end.getTime() - start.getTime()) / 1000),
        entries: currentGroup,
      });
      currentGroup = [sorted[i]];
    } else {
      currentGroup.push(sorted[i]);
    }
  }

  // Flush last group
  if (currentGroup.length > 0) {
    const start = currentGroup[0].timestamp;
    const end = currentGroup[currentGroup.length - 1].timestamp;
    segments.push({
      start,
      end,
      durationSeconds: Math.max(1, (end.getTime() - start.getTime()) / 1000),
      entries: currentGroup,
    });
  }

  return segments;
}

export function computeDpsTimeSeries(
  fights: FightSegment[],
  rollingWindowMs = 10_000,
): TimeSeriesDpsPoint[] {
  const points: TimeSeriesDpsPoint[] = [];

  if (fights.length === 0) return points;

  // Build a global uniform sampling grid across all fights so there is a
  // point every `rollingWindowMs` (typically 10s). This fills gaps between
  // fights with zero-valued points and produces a smooth time series.
  // Additionally insert zero points between fights if the gap is large to
  // ensure the chart visually drops to zero instead of interpolating.
  const firstStart = fights[0].start.getTime();
  const lastEnd = fights[fights.length - 1].end.getTime();
  const alignedStart =
    Math.floor(firstStart / rollingWindowMs) * rollingWindowMs;
  const timestampsToUse: number[] = [];
  for (let t = alignedStart; t <= lastEnd; t += rollingWindowMs) {
    timestampsToUse.push(t);
  }

  // Prepare a single sorted list of all entries across fights (for sliding window)
  const allEntries = fights
    .flatMap((f) => f.entries)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  let damageStart = 0;
  let damageEnd = 0;
  let damageSum = 0;

  // Maintain a pointer to current fight for assigning fightIndex to timestamps
  let fi = 0;
  for (const ts of timestampsToUse) {
    const windowStart = ts - rollingWindowMs;

    while (
      damageStart < allEntries.length &&
      allEntries[damageStart].timestamp.getTime() < windowStart
    ) {
      damageSum -= allEntries[damageStart].amount ?? 0;
      damageStart++;
    }

    while (
      damageEnd < allEntries.length &&
      allEntries[damageEnd].timestamp.getTime() <= ts
    ) {
      damageSum += allEntries[damageEnd].amount ?? 0;
      damageEnd++;
    }

    // Advance fight pointer so fi points at the first fight with end >= ts,
    // or fights.length if past the last fight.
    while (fi < fights.length && ts > fights[fi].end.getTime()) fi++;

    // Determine fightIndex: prefer fight containing ts, otherwise use previous fight
    let fightIndex = 0;
    if (fi === fights.length) {
      fightIndex = fights.length - 1;
    } else if (ts < fights[fi].start.getTime()) {
      fightIndex = Math.max(0, fi - 1);
    } else {
      fightIndex = fi;
    }

    const dps = damageSum / (rollingWindowMs / 1000);
    points.push({ timestamp: new Date(ts), dps, fightIndex });
  }

  return points;
}

export function computePeakDps(
  entries: LogEntry[],
  windowSeconds: number,
): DpsWindow {
  const windowMs = windowSeconds * 1000;
  const sorted = [...entries].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );

  let maxDps = 0;
  let peakTimestamp = sorted.length > 0 ? sorted[0].timestamp : new Date(0);

  for (let i = 0; i < sorted.length; i++) {
    const ts = sorted[i].timestamp.getTime();
    const windowStart = ts - windowMs;
    let windowDamage = 0;
    for (let j = i; j >= 0; j--) {
      const t = sorted[j].timestamp.getTime();
      if (t < windowStart) break;
      windowDamage += sorted[j].amount ?? 0;
    }
    const dps = windowDamage / windowSeconds;
    if (dps > maxDps) {
      maxDps = dps;
      peakTimestamp = sorted[i].timestamp;
    }
  }

  return { windowSeconds, maxDps, peakTimestamp };
}

export function analyzeDamageTaken(entries: LogEntry[]): DamageTakenAnalysis {
  const damageEntries = entries.filter(
    (e) => e.eventType === "damage-received",
  );
  const missEntries = entries.filter((e) => e.eventType === "miss-incoming");

  const empty: DamageTakenAnalysis = {
    totalDamageReceived: 0,
    totalIncomingHits: 0,
    fights: [],
    dpsTimeSeries: [],
    peakDps10s: { windowSeconds: 10, maxDps: 0, peakTimestamp: new Date(0) },
    peakDps30s: { windowSeconds: 30, maxDps: 0, peakTimestamp: new Date(0) },
    peakDps60s: { windowSeconds: 60, maxDps: 0, peakTimestamp: new Date(0) },
    incomingWeaponSummaries: [],
    incomingDroneSummaries: [],
    attackerTimeSeries: [],
    overallHitQualities: {},
  };

  if (damageEntries.length === 0) return empty;

  // Fight segmentation
  const fights = segmentFights(damageEntries);

  // DPS time series (10s rolling window)
  const dpsTimeSeries = computeDpsTimeSeries(fights, 10_000);

  // Peak DPS windows
  const peakDps10s = computePeakDps(damageEntries, 10);
  const peakDps30s = computePeakDps(damageEntries, 30);
  const peakDps60s = computePeakDps(damageEntries, 60);

  // Build per-attacker DPS time series for non-NPC attackers.
  // Use the timestamps from the global dpsTimeSeries so lines align.
  const attackerSeries: AttackerTimeSeries[] = [];
  // collect sources -> entries
  const sourceMap = new Map<string, LogEntry[]>();
  for (const e of damageEntries) {
    const src = e.pilotName ?? e.shipType ?? "Unknown";
    if (!sourceMap.has(src)) sourceMap.set(src, []);
    sourceMap.get(src)!.push(e);
  }

  const palette = [
    "#00b4d8",
    "#ff7448",
    "#66cc66",
    "#ffbf00",
    "#b28cff",
    "#ff6bcb",
    "#4dd0e1",
    "#ffa066",
    "#9be564",
    "#7aa2ff",
  ];

  const rollingWindowMs = 10_000;
  const globalTimestamps = dpsTimeSeries.map((p) => p.timestamp.getTime());

  const hashString = (s: string) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  };

  for (const [src, srcEntries] of sourceMap) {
    // skip NPC attackers
    const anyNpc = srcEntries.some((e) => e.isNpc === true);
    if (anyNpc) continue;

    // Pre-sort source entries
    const sortedSrc = [...srcEntries].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    const pts: TimeSeriesDpsPoint[] = [];
    for (let i = 0; i < globalTimestamps.length; i++) {
      const ts = globalTimestamps[i];
      const windowStart = ts - rollingWindowMs;
      // sum damage from this source within (windowStart, ts]
      let windowDamage = 0;
      // iterate backwards until before windowStart for efficiency
      for (let j = sortedSrc.length - 1; j >= 0; j--) {
        const t = sortedSrc[j].timestamp.getTime();
        if (t <= ts && t > windowStart) {
          windowDamage += sortedSrc[j].amount ?? 0;
        }
        if (t <= windowStart) break;
      }
      pts.push({
        timestamp: new Date(ts),
        dps: windowDamage / (rollingWindowMs / 1000),
        fightIndex: dpsTimeSeries[i]?.fightIndex ?? 0,
      });
    }

    const color = palette[hashString(src) % palette.length];
    attackerSeries.push({
      source: src,
      shipType: srcEntries[0]?.shipType,
      isNpc: false,
      color,
      timeSeries: pts,
    });
  }

  // Incoming weapon/drone summaries grouped by (source + weapon)
  // First, add all damage entries
  const weaponMap = new Map<
    string,
    { damage: LogEntry[]; misses: LogEntry[] }
  >();
  for (const entry of damageEntries) {
    const source = entry.pilotName ?? entry.shipType ?? "Unknown";
    const weapon = entry.weapon ?? "Unknown";
    const key = `${source}||${weapon}`;
    if (!weaponMap.has(key)) weaponMap.set(key, { damage: [], misses: [] });
    weaponMap.get(key)!.damage.push(entry);
  }

  // Then, add miss entries
  for (const entry of missEntries) {
    const source = entry.pilotName ?? entry.shipType ?? "Unknown";
    const weapon = entry.weapon ?? "Unknown";
    const key = `${source}||${weapon}`;
    if (!weaponMap.has(key)) weaponMap.set(key, { damage: [], misses: [] });
    weaponMap.get(key)!.misses.push(entry);
  }

  const incomingWeaponSummaries: IncomingWeaponSummary[] = [];
  const incomingDroneSummaries: IncomingWeaponSummary[] = [];

  for (const [key, { damage, misses }] of weaponMap) {
    const [source, weapon] = key.split("||");
    const isDrone = damage.some((e) => e.isDrone === true);
    const shipType = damage[0]?.shipType ?? misses[0]?.shipType;
    const amounts = damage.map((e) => e.amount ?? 0);
    const totalDamage = amounts.reduce((a, b) => a + b, 0);
    const hitCount = damage.length;
    const missCount = misses.length;
    const minHit = amounts.length > 0 ? Math.min(...amounts) : 0;
    const maxHit = amounts.length > 0 ? Math.max(...amounts) : 0;

    const hitQualities: Partial<Record<HitQuality, number>> = {};
    for (const entry of damage) {
      if (entry.hitQuality) {
        hitQualities[entry.hitQuality] =
          (hitQualities[entry.hitQuality] ?? 0) + 1;
      }
    }

    const firstTimestamp =
      (damage[0]?.timestamp?.getTime() ?? misses[0]?.timestamp?.getTime()) ||
      undefined;
    const lastTimestamp =
      (damage[damage.length - 1]?.timestamp?.getTime() ??
        misses[misses.length - 1]?.timestamp?.getTime()) ||
      undefined;

    const summary: IncomingWeaponSummary = {
      source,
      shipType,
      weapon,
      isDrone,
      hitCount,
      missCount,
      totalDamage,
      minHit,
      maxHit,
      hitQualities,
      firstHit: firstTimestamp ? new Date(firstTimestamp) : undefined,
      lastHit: lastTimestamp ? new Date(lastTimestamp) : undefined,
    };

    if (isDrone) {
      incomingDroneSummaries.push(summary);
    } else {
      incomingWeaponSummaries.push(summary);
    }
  }

  incomingWeaponSummaries.sort((a, b) => b.totalDamage - a.totalDamage);
  incomingDroneSummaries.sort((a, b) => b.totalDamage - a.totalDamage);

  // Overall totals
  const totalDamageReceived = damageEntries.reduce(
    (a, e) => a + (e.amount ?? 0),
    0,
  );
  const totalIncomingHits = damageEntries.length;

  const overallHitQualities: Partial<Record<HitQuality, number>> = {};
  for (const entry of damageEntries) {
    if (entry.hitQuality) {
      overallHitQualities[entry.hitQuality] =
        (overallHitQualities[entry.hitQuality] ?? 0) + 1;
    }
  }

  return {
    totalDamageReceived,
    totalIncomingHits,
    fights,
    dpsTimeSeries,
    peakDps10s,
    peakDps30s,
    peakDps60s,
    incomingWeaponSummaries,
    incomingDroneSummaries,
    attackerTimeSeries: attackerSeries,
    overallHitQualities,
  };
}
