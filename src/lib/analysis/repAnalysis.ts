import type { LogEntry } from "../types";

export interface RepSourceSummary {
  shipType: string; // e.g. "Vedmak", "Medium Armor Maintenance Bot I"
  module: string; // e.g. "Medium Remote Armor Repairer II"
  isBot: boolean;
  totalRepaired: number;
  repCount: number;
  minRep: number;
  maxRep: number;
}

export interface RepTimeSeriesPoint {
  timestamp: Date;
  repsPerSecond: number; // rolling 10s window
}

export interface RepWindowPeak {
  windowSeconds: number; // 30 or 60
  maxRepsPerSecond: number;
  peakTimestamp: Date;
}

export interface RepAnalysisResult {
  // Incoming reps (received by you)
  totalRepReceived: number;
  repReceivedSources: RepSourceSummary[]; // bots and ships
  repReceivedByBots: RepSourceSummary[]; // isBot = true only
  repReceivedByShips: RepSourceSummary[]; // isBot = false only
  peakRepIncoming30s: RepWindowPeak;
  peakRepIncoming60s: RepWindowPeak;
  incomingRepTimeSeries: RepTimeSeriesPoint[]; // rolling 10s window

  // Outgoing reps (you repped others)
  totalRepOutgoing: number;
  repOutgoingTargets: RepSourceSummary[];
  peakRepOutgoing30s: RepWindowPeak;
  peakRepOutgoing60s: RepWindowPeak;
}

function computeRepTimeSeries(
  entries: LogEntry[],
  rollingWindowMs = 10_000,
): RepTimeSeriesPoint[] {
  const sorted = [...entries].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );
  if (sorted.length === 0) return [];

  const timestamps = sorted.map((e) => e.timestamp.getTime());
  const uniqueTs = Array.from(new Set(timestamps)).sort((a, b) => a - b);

  return uniqueTs.map((ts) => {
    const windowStart = ts - rollingWindowMs;
    const windowAmount = sorted
      .filter((e) => {
        const t = e.timestamp.getTime();
        return t > windowStart && t <= ts;
      })
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);
    return {
      timestamp: new Date(ts),
      repsPerSecond: windowAmount / (rollingWindowMs / 1000),
    };
  });
}

function computePeakRepsPerSecond(
  entries: LogEntry[],
  windowSeconds: number,
): RepWindowPeak {
  const windowMs = windowSeconds * 1000;
  const sorted = [...entries].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );

  let maxRepsPerSecond = 0;
  let peakTimestamp = sorted.length > 0 ? sorted[0].timestamp : new Date(0);

  for (let i = 0; i < sorted.length; i++) {
    const ts = sorted[i].timestamp.getTime();
    const windowStart = ts - windowMs;
    let windowReps = 0;
    for (let j = i; j >= 0; j--) {
      const t = sorted[j].timestamp.getTime();
      if (t < windowStart) break;
      windowReps += sorted[j].amount ?? 0;
    }
    const rps = windowReps / windowSeconds;
    if (rps > maxRepsPerSecond) {
      maxRepsPerSecond = rps;
      peakTimestamp = sorted[i].timestamp;
    }
  }

  return { windowSeconds, maxRepsPerSecond, peakTimestamp };
}

function buildRepSourceSummaries(entries: LogEntry[]): RepSourceSummary[] {
  const map = new Map<string, LogEntry[]>();

  for (const entry of entries) {
    const shipType = entry.repShipType ?? "Unknown";
    const module = entry.repModule ?? "Unknown";
    const key = `${shipType}||${module}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entry);
  }

  const summaries: RepSourceSummary[] = [];
  for (const [key, group] of map) {
    const [shipType, module] = key.split("||");
    const isBot = group.some((e) => e.isRepBot === true);
    const amounts = group.map((e) => e.amount ?? 0);
    const totalRepaired = amounts.reduce((a, b) => a + b, 0);
    const repCount = group.length;
    const minRep = Math.min(...amounts);
    const maxRep = Math.max(...amounts);

    summaries.push({
      shipType,
      module,
      isBot,
      totalRepaired,
      repCount,
      minRep,
      maxRep,
    });
  }

  summaries.sort((a, b) => b.totalRepaired - a.totalRepaired);
  return summaries;
}

export function analyzeReps(entries: LogEntry[]): RepAnalysisResult {
  // Incoming reps
  const incomingEntries = entries.filter((e) => e.eventType === "rep-received");
  const totalRepReceived = incomingEntries.reduce(
    (a, e) => a + (e.amount ?? 0),
    0,
  );
  const repReceivedSources = buildRepSourceSummaries(incomingEntries);
  const repReceivedByBots = repReceivedSources.filter((s) => s.isBot);
  const repReceivedByShips = repReceivedSources.filter((s) => !s.isBot);

  // Outgoing reps
  const outgoingEntries = entries.filter((e) => e.eventType === "rep-outgoing");
  const totalRepOutgoing = outgoingEntries.reduce(
    (a, e) => a + (e.amount ?? 0),
    0,
  );
  const repOutgoingTargets = buildRepSourceSummaries(outgoingEntries);

  // Compute peaks
  const peakRepIncoming30s = computePeakRepsPerSecond(incomingEntries, 30);
  const peakRepIncoming60s = computePeakRepsPerSecond(incomingEntries, 60);
  const peakRepOutgoing30s = computePeakRepsPerSecond(outgoingEntries, 30);
  const peakRepOutgoing60s = computePeakRepsPerSecond(outgoingEntries, 60);

  // Compute incoming rep time series (10s rolling window)
  const incomingRepTimeSeries = computeRepTimeSeries(incomingEntries, 10_000);

  return {
    totalRepReceived,
    repReceivedSources,
    repReceivedByBots,
    repReceivedByShips,
    peakRepIncoming30s,
    peakRepIncoming60s,
    incomingRepTimeSeries,
    totalRepOutgoing,
    repOutgoingTargets,
    peakRepOutgoing30s,
    peakRepOutgoing60s,
  };
}
