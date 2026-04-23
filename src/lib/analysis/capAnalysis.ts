import type { LogEntry } from "../types";

export interface CapModuleSummary {
  module: string; // e.g. "Heavy Energy Neutralizer II"
  eventType: "neut-dealt" | "neut-received" | "nos-dealt" | "nos-received";
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

  // Incoming (enemies neuted/nosed you)
  totalGjNeutReceived: number; // neut-received only
  totalGjNosReceived: number; // nos-received only (enemy nos pressure)
  totalGjIncoming: number; // sum of both
  incomingByShipType: CapShipTypeSummary[]; // sorted by totalGjTaken desc
  incomingModuleSummaries: CapModuleSummary[]; // grouped by module name

  // Timeline for chart: GJ neut/nos received over time
  neutReceivedTimeline: {
    timestamp: Date;
    gjAmount: number;
    module: string;
    shipType: string;
    eventType: "neut-received" | "nos-received";
  }[];

  // Timeline for chart: GJ neut/nos dealt over time
  neutDealtTimeline: {
    timestamp: Date;
    gjAmount: number;
    module: string;
    shipType: string;
    eventType: "neut-dealt" | "nos-dealt";
  }[];
}

function buildModuleSummaries(
  entries: LogEntry[],
  eventTypeFilter:
    | "neut-received"
    | "neut-dealt"
    | "nos-dealt"
    | "nos-received"
    | { in: ReadonlyArray<CapModuleSummary["eventType"]> },
): CapModuleSummary[] {
  const map = new Map<string, LogEntry[]>();
  const matches = (et: LogEntry["capEventType"]): boolean => {
    if (typeof eventTypeFilter === "string") return et === eventTypeFilter;
    return !!et && eventTypeFilter.in.includes(et);
  };

  for (const entry of entries) {
    if (!matches(entry.capEventType)) continue;
    const capModule = entry.capModule ?? "Unknown";
    if (!map.has(capModule)) map.set(capModule, []);
    map.get(capModule)!.push(entry);
  }

  const summaries: CapModuleSummary[] = [];
  for (const [capModule, group] of map) {
    const amounts = group.map((e) => e.capAmount ?? 0);
    const totalGj = amounts.reduce((a, b) => a + b, 0);
    const hitCount = group.length;
    const maxGj = hitCount > 0 ? Math.max(...amounts) : 0;
    const minGj = hitCount > 0 ? Math.min(...amounts) : 0;
    const avgGj = hitCount > 0 ? totalGj / hitCount : 0;
    const zeroHits = amounts.filter((a) => a === 0).length;
    const firstEt = group[0]?.capEventType ?? "neut-received";
    const summaryType: CapModuleSummary["eventType"] =
      typeof eventTypeFilter === "string"
        ? eventTypeFilter
        : (firstEt as CapModuleSummary["eventType"]);

    summaries.push({
      module: capModule,
      eventType: summaryType,
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

  // Group by ship type — include both neut-received and nos-received as
  // incoming cap pressure on the pilot.
  for (const entry of entries) {
    if (
      entry.capEventType !== "neut-received" &&
      entry.capEventType !== "nos-received"
    )
      continue;
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
      const capModule = entry.capModule ?? "Unknown";
      if (!moduleMap.has(capModule)) moduleMap.set(capModule, []);
      moduleMap.get(capModule)!.push(entry);
    }

    const moduleBreakdown: CapModuleSummary[] = [];
    for (const [capModule, modGroup] of moduleMap) {
      const modAmounts = modGroup.map((e) => e.capAmount ?? 0);
      const modTotal = modAmounts.reduce((a, b) => a + b, 0);
      const modHitCount = modGroup.length;
      const modMax = modHitCount > 0 ? Math.max(...modAmounts) : 0;
      const modMin = modHitCount > 0 ? Math.min(...modAmounts) : 0;
      const modAvg = modHitCount > 0 ? modTotal / modHitCount : 0;
      const modZeroHits = modAmounts.filter((a) => a === 0).length;
      const modEt = (modGroup[0]?.capEventType ??
        "neut-received") as CapModuleSummary["eventType"];

      moduleBreakdown.push({
        module: capModule,
        eventType: modEt,
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
  const nosReceivedEntries = entries.filter(
    (e) => e.capEventType === "nos-received",
  );
  const incomingEntries = [...neutReceivedEntries, ...nosReceivedEntries];

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
  const totalGjNosReceived = nosReceivedEntries.reduce(
    (a, e) => a + (e.capAmount ?? 0),
    0,
  );
  const totalGjIncoming = totalGjNeutReceived + totalGjNosReceived;
  const incomingByShipType = buildIncomingByShipType(incomingEntries);
  const incomingModuleSummaries = buildModuleSummaries(incomingEntries, {
    in: ["neut-received", "nos-received"],
  });

  // Timeline - all incoming neut/nos events sorted by timestamp
  const neutReceivedTimeline = incomingEntries
    .map((e) => ({
      timestamp: e.timestamp,
      gjAmount: e.capAmount ?? 0,
      module: e.capModule ?? "Unknown",
      shipType: e.capShipType ?? "Unknown",
      eventType: e.capEventType as "neut-received" | "nos-received",
    }))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Timeline - all neut-dealt and nos-dealt events sorted by timestamp
  const neutDealtTimeline = [...neutDealtEntries, ...nosDealtEntries]
    .map((e) => ({
      timestamp: e.timestamp,
      gjAmount: e.capAmount ?? 0,
      module: e.capModule ?? "Unknown",
      shipType: e.capShipType ?? "Unknown",
      eventType: e.capEventType as "neut-dealt" | "nos-dealt",
    }))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return {
    totalGjNeutDealt,
    totalGjNosDrained,
    totalGjOutgoing,
    outgoingModuleSummaries,
    totalGjNeutReceived,
    totalGjNosReceived,
    totalGjIncoming,
    incomingByShipType,
    incomingModuleSummaries,
    neutReceivedTimeline,
    neutDealtTimeline,
  };
}
