import type { LogEntry } from "../types";

/**
 * Detect fight boundary start timestamps (ms since epoch).
 * Returns a sorted array of start timestamps (number).
 */
export function detectFightBoundaries(
  entries: LogEntry[],
  gapMs = 60_000,
): number[] {
  const sorted = [...entries].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );
  if (sorted.length === 0) return [];

  const starts: number[] = [];
  starts.push(sorted[0].timestamp.getTime());

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].timestamp.getTime();
    const curr = sorted[i].timestamp.getTime();
    if (curr - prev > gapMs) {
      starts.push(curr);
    }
  }

  return starts;
}
