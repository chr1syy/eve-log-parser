import { LogEntry } from "@/lib/types";

export interface FleetLogData {
  pilot: string;
  shipType: string;
  entries: LogEntry[];
}

export function matchLogsByTimestamp(logs: FleetLogData[]): {
  overlapping: boolean;
  overlapStart: Date | null;
  overlapEnd: Date | null;
  validationErrors: string[];
} {
  const TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes in milliseconds

  if (logs.length === 0) {
    return {
      overlapping: false,
      overlapStart: null,
      overlapEnd: null,
      validationErrors: ["No logs provided"],
    };
  }

  const ranges: Array<{ start: Date; end: Date; pilot: string }> = [];

  for (const log of logs) {
    if (log.entries.length === 0) {
      return {
        overlapping: false,
        overlapStart: null,
        overlapEnd: null,
        validationErrors: [`Log for pilot ${log.pilot} has no entries`],
      };
    }

    const timestamps = log.entries.map((e) => e.timestamp.getTime());
    const start = new Date(Math.min(...timestamps));
    const end = new Date(Math.max(...timestamps));
    ranges.push({ start, end, pilot: log.pilot });
  }

  const maxStart = new Date(Math.max(...ranges.map((r) => r.start.getTime())));
  const minEnd = new Date(Math.min(...ranges.map((r) => r.end.getTime())));

  const overlapping = maxStart.getTime() <= minEnd.getTime() + TOLERANCE_MS;

  if (!overlapping) {
    const errors: string[] = [];
    for (const range of ranges) {
      if (range.end.getTime() < maxStart.getTime() - TOLERANCE_MS) {
        errors.push(
          `Log for pilot ${range.pilot} ends too early (${range.end.toISOString()}) compared to latest start (${maxStart.toISOString()})`,
        );
      }
      if (range.start.getTime() > minEnd.getTime() + TOLERANCE_MS) {
        errors.push(
          `Log for pilot ${range.pilot} starts too late (${range.start.toISOString()}) compared to earliest end (${minEnd.toISOString()})`,
        );
      }
    }
    return {
      overlapping: false,
      overlapStart: null,
      overlapEnd: null,
      validationErrors:
        errors.length > 0
          ? errors
          : ["Logs do not overlap within 5 minute tolerance"],
    };
  }

  return {
    overlapping: true,
    overlapStart: maxStart,
    overlapEnd: minEnd,
    validationErrors: [],
  };
}

export function mergeFleetLogs(logs: FleetLogData[]): LogEntry[] {
  const allEntries: LogEntry[] = [];

  for (const log of logs) {
    for (const entry of log.entries) {
      // Add pilot metadata to each entry
      const enrichedEntry: LogEntry = {
        ...entry,
        // Set pilotName/shipType from fleet log if not already set by the parser
        pilotName: entry.pilotName ?? log.pilot,
        shipType: entry.shipType ?? log.shipType,
        // Also record fleet owner separately
        fleetPilot: log.pilot,
        fleetShipType: log.shipType,
      };
      allEntries.push(enrichedEntry);
    }
  }

  // Sort chronologically
  allEntries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Deduplicate identical events (same timestamp + same rawLine)
  const seen = new Set<string>();
  const deduped: LogEntry[] = [];

  for (const entry of allEntries) {
    const key = `${entry.timestamp.getTime()}-${entry.rawLine}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(entry);
    }
  }

  return deduped;
}
