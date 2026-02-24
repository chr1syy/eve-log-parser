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
  overallHitQualities: Partial<Record<HitQuality, number>>;
}

const FIGHT_GAP_MS = 60_000; // 60 seconds

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

function computeDpsTimeSeries(
  fights: FightSegment[],
  rollingWindowMs = 10_000,
): TimeSeriesDpsPoint[] {
  const points: TimeSeriesDpsPoint[] = [];

  for (let fi = 0; fi < fights.length; fi++) {
    const fight = fights[fi];
    const sorted = [...fight.entries].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
    if (sorted.length === 0) continue;

    // Collect unique timestamps from fight entries (step through each event timestamp)
    const timestamps = sorted.map((e) => e.timestamp.getTime());
    const uniqueTs = Array.from(new Set(timestamps)).sort((a, b) => a - b);

    for (const ts of uniqueTs) {
      const windowStart = ts - rollingWindowMs;
      const windowDamage = sorted
        .filter((e) => {
          const t = e.timestamp.getTime();
          return t > windowStart && t <= ts;
        })
        .reduce((sum, e) => sum + (e.amount ?? 0), 0);
      const dps = windowDamage / (rollingWindowMs / 1000);
      points.push({ timestamp: new Date(ts), dps, fightIndex: fi });
    }
  }

  return points;
}

function computePeakDps(entries: LogEntry[], windowSeconds: number): DpsWindow {
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
    overallHitQualities,
  };
}
