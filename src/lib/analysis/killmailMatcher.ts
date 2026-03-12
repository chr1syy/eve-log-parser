import type { LogEntry } from "../types";
import type { ResolvedKillmail } from "../esi/types";

export interface MatchedKillmail {
  candidateEntry: LogEntry;
  killmail: ResolvedKillmail;
  confidence: "high" | "medium" | "low";
  score: number; // 0-1
  matchReasons: string[];
}

const TIME_WINDOW_MS = 120_000;
const TIMESTAMP_WEIGHT = 0.4;
const PARTICIPATION_WEIGHT = 0.6;
const MIN_SCORE = 0.2;

/**
 * Match kill-candidate log entries against resolved killmails.
 * Uses greedy 1:1 assignment — each killmail is matched to at most one candidate.
 */
export function matchKillmails(
  candidates: LogEntry[],
  killmails: ResolvedKillmail[],
  characterId: number,
): MatchedKillmail[] {
  if (candidates.length === 0 || killmails.length === 0) return [];

  // Score all candidate-killmail pairs
  const pairs: {
    candidateIdx: number;
    killmailIdx: number;
    score: number;
    reasons: string[];
  }[] = [];

  for (let ci = 0; ci < candidates.length; ci++) {
    const candidate = candidates[ci];
    const candidateTime = candidate.timestamp.getTime();

    for (let ki = 0; ki < killmails.length; ki++) {
      const km = killmails[ki];
      const kmTime = km.killmailTime.getTime();
      const timeDiffMs = Math.abs(candidateTime - kmTime);

      if (timeDiffMs > TIME_WINDOW_MS) continue;

      const reasons: string[] = [];

      // Timestamp proximity score
      const timestampScore = 1 - timeDiffMs / TIME_WINDOW_MS;
      const timeDiffSec = Math.round(timeDiffMs / 1000);
      reasons.push(`timestamp within ${timeDiffSec}s`);

      // Character participation score
      const onKillmail = km.attackers.some(
        (a) => a.character_id === characterId,
      );
      const participationScore = onKillmail ? 1.0 : 0.0;
      if (onKillmail) reasons.push("character on killmail");

      const score =
        TIMESTAMP_WEIGHT * timestampScore +
        PARTICIPATION_WEIGHT * participationScore;

      if (score > MIN_SCORE) {
        pairs.push({ candidateIdx: ci, killmailIdx: ki, score, reasons });
      }
    }
  }

  // Sort by score descending for greedy assignment
  pairs.sort((a, b) => b.score - a.score);

  const usedCandidates = new Set<number>();
  const usedKillmails = new Set<number>();
  const results: MatchedKillmail[] = [];

  for (const pair of pairs) {
    if (
      usedCandidates.has(pair.candidateIdx) ||
      usedKillmails.has(pair.killmailIdx)
    )
      continue;

    usedCandidates.add(pair.candidateIdx);
    usedKillmails.add(pair.killmailIdx);

    let confidence: "high" | "medium" | "low";
    if (pair.score >= 0.8) confidence = "high";
    else if (pair.score >= 0.5) confidence = "medium";
    else confidence = "low";

    results.push({
      candidateEntry: candidates[pair.candidateIdx],
      killmail: killmails[pair.killmailIdx],
      confidence,
      score: pair.score,
      matchReasons: pair.reasons,
    });
  }

  return results;
}
