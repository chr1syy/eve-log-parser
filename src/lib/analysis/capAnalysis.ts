import type { LogEntry } from "../types";

export interface CapModuleSummary {
  module: string; // e.g. "Heavy Energy Neutralizer II"
  eventType: "neut-dealt" | "neut-received" | "nos-dealt";
  hitCount: number;
  totalGj: number;
  maxGj: number;
  minGj: number;
  avgGj: number;
  zeroHits: number; // hits where GJ = 0 (dry cap / out of range)
}

export interface CapShipTypeSummary {
  shipType: string; // enemy ship type
  totalGjTaken: number; // total cap they removed from you
  hitCount: number;
  moduleBreakdown: CapModuleSummary[];
}

export interface CapAnalysis {
  // Outgoing (you neuted/drained enemies)
  totalGjNeutDealt: number; // neut-dealt only
  totalGjNosDrained: number; // nos-dealt only (abs values)
  totalGjOutgoing: number; // sum of both
  outgoingModuleSummaries: CapModuleSummary[]; // grouped by module, sorted by totalGj desc

  // Incoming (enemies neuted you)
  totalGjNeutReceived: number;
  incomingByShipType: CapShipTypeSummary[]; // sorted by totalGjTaken desc
  incomingModuleSummaries: CapModuleSummary[]; // grouped by module name

  // Timeline for chart: GJ neut received over time
  neutReceivedTimeline: {
    timestamp: Date;
    gjAmount: number;
    module: string;
    shipType: string;
  }[];
}

function buildModuleSummaries(
  entries: LogEntry[],
  eventTypeFilter: "neut-received" | "neut-dealt" | "nos-dealt",
): CapModuleSummary[] {
  const map = new Map<string, LogEntry[]>();

  for (const entry of entries) {
    if (entry.capEventType !== eventTypeFilter) continue;
    const moduleName = entry.capModule ?? "Unknown";
    if (!map.has(moduleName)) map.set(moduleName, []);
    map.get(moduleName)!.push(entry);
  }

  const summaries: CapModuleSummary[] = [];
  for (const [moduleName, group] of map) {
    const amounts = group.map((e) => e.capAmount ?? 0);
    const totalGj = amounts.reduce((a, b) => a + b, 0);
    const hitCount = group.length;
    const maxGj = hitCount > 0 ? Math.max(...amounts) : 0;
    const minGj = hitCount > 0 ? Math.min(...amounts) : 0;
    const avgGj = hitCount > 0 ? totalGj / hitCount : 0;
    const zeroHits = amounts.filter((a) => a === 0).length;

    summaries.push({
      module: moduleName,
      eventType: eventTypeFilter,
      hitCount,
      totalGj,
      maxGj,
      minGj,
      avgGj,
      zeroHits,
    });
  }

  summaries.sort((a, b) => b.totalGj - a.totalGj);
  return summaries;
}

function buildIncomingByShipType(entries: LogEntry[]): CapShipTypeSummary[] {
  const map = new Map<string, LogEntry[]>();

  // Group by ship type
  for (const entry of entries) {
    if (entry.capEventType !== "neut-received") continue;
    const shipType = entry.capShipType ?? "Unknown";
    if (!map.has(shipType)) map.set(shipType, []);
    map.get(shipType)!.push(entry);
  }

  const summaries: CapShipTypeSummary[] = [];
  for (const [shipType, group] of map) {
    const amounts = group.map((e) => e.capAmount ?? 0);
    const totalGjTaken = amounts.reduce((a, b) => a + b, 0);
    const hitCount = group.length;

    // Build module breakdown for this ship type
    const moduleMap = new Map<string, LogEntry[]>();
    for (const entry of group) {
      const moduleName = entry.capModule ?? "Unknown";
      if (!moduleMap.has(moduleName)) moduleMap.set(moduleName, []);
      moduleMap.get(moduleName)!.push(entry);
    }

    const moduleBreakdown: CapModuleSummary[] = [];
    for (const [moduleName, modGroup] of moduleMap) {
      const modAmounts = modGroup.map((e) => e.capAmount ?? 0);
      const modTotal = modAmounts.reduce((a, b) => a + b, 0);
      const modHitCount = modGroup.length;
      const modMax = modHitCount > 0 ? Math.max(...modAmounts) : 0;
      const modMin = modHitCount > 0 ? Math.min(...modAmounts) : 0;
      const modAvg = modHitCount > 0 ? modTotal / modHitCount : 0;
      const modZeroHits = modAmounts.filter((a) => a === 0).length;

      moduleBreakdown.push({
        module: moduleName,
        eventType: "neut-received",
        hitCount: modHitCount,
        totalGj: modTotal,
        maxGj: modMax,
        minGj: modMin,
        avgGj: modAvg,
        zeroHits: modZeroHits,
      });
    }

    moduleBreakdown.sort((a, b) => b.totalGj - a.totalGj);

    summaries.push({
      shipType,
      totalGjTaken,
      hitCount,
      moduleBreakdown,
    });
  }

  summaries.sort((a, b) => b.totalGjTaken - a.totalGjTaken);
  return summaries;
}

export function analyzeCapPressure(entries: LogEntry[]): CapAnalysis {
  // Outgoing calculations
  const neutDealtEntries = entries.filter(
    (e) => e.capEventType === "neut-dealt",
  );
  const nosDealtEntries = entries.filter((e) => e.capEventType === "nos-dealt");
  const neutReceivedEntries = entries.filter(
    (e) => e.capEventType === "neut-received",
  );

  const totalGjNeutDealt = neutDealtEntries.reduce(
    (a, e) => a + (e.capAmount ?? 0),
    0,
  );
  const totalGjNosDrained = nosDealtEntries.reduce(
    (a, e) => a + (e.capAmount ?? 0),
    0,
  );
  const totalGjOutgoing = totalGjNeutDealt + totalGjNosDrained;

  // Build outgoing module summaries (both neuts and nos separately)
  const neutDealtSummaries = buildModuleSummaries(
    neutDealtEntries,
    "neut-dealt",
  );
  const nosDealtSummaries = buildModuleSummaries(nosDealtEntries, "nos-dealt");
  const outgoingModuleSummaries = [
    ...neutDealtSummaries,
    ...nosDealtSummaries,
  ].sort((a, b) => b.totalGj - a.totalGj);

  // Incoming calculations
  const totalGjNeutReceived = neutReceivedEntries.reduce(
    (a, e) => a + (e.capAmount ?? 0),
    0,
  );
  const incomingByShipType = buildIncomingByShipType(neutReceivedEntries);
  const incomingModuleSummaries = buildModuleSummaries(
    neutReceivedEntries,
    "neut-received",
  );

  // Timeline - all neut-received events sorted by timestamp
  const neutReceivedTimeline = neutReceivedEntries
    .map((e) => ({
      timestamp: e.timestamp,
      gjAmount: e.capAmount ?? 0,
      module: e.capModule ?? "Unknown",
      shipType: e.capShipType ?? "Unknown",
    }))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return {
    totalGjNeutDealt,
    totalGjNosDrained,
    totalGjOutgoing,
    outgoingModuleSummaries,
    totalGjNeutReceived,
    incomingByShipType,
    incomingModuleSummaries,
    neutReceivedTimeline,
  };
}
