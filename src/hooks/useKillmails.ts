"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { ParsedLog } from "@/lib/types";
import type { MatchedKillmail } from "@/lib/analysis/killmailMatcher";
import type { ResolvedKillmail } from "@/lib/esi/types";

interface KillmailApiMatch {
  candidateIndex: number;
  killmail: {
    killmailId: number;
    killmailHash: string;
    killmailTime: string;
    victim: ResolvedKillmail["victim"];
    attackers: ResolvedKillmail["attackers"];
    zkbPoints: number;
    zkbValue: number;
    zkillUrl: string;
  };
  confidence: "high" | "medium" | "low";
  score: number;
  matchReasons: string[];
}

export interface UseKillmailsResult {
  matches: MatchedKillmail[];
  isLoading: boolean;
  error: string | null;
  fetch: () => void;
  hasCandidates: boolean;
}

export function useKillmails(
  activeLog: ParsedLog | null,
): UseKillmailsResult {
  const { character } = useAuth();
  const [matches, setMatches] = useState<MatchedKillmail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevSessionRef = useRef<string | undefined>(undefined);

  const currentSessionId = activeLog?.sessionId;

  // Reset state when activeLog changes (synchronous check avoids effect-based setState)
  if (prevSessionRef.current !== currentSessionId) {
    prevSessionRef.current = currentSessionId;
    if (matches.length > 0) setMatches([]);
    if (error !== null) setError(null);
    if (isLoading) setIsLoading(false);
  }

  const candidates = useMemo(
    () =>
      (activeLog?.entries ?? []).filter(
        (e) => e.eventType === "kill-candidate",
      ),
    [activeLog],
  );

  const hasCandidates = candidates.length > 0;

  const fetchKillmails = useCallback(() => {
    if (!activeLog || candidates.length === 0) return;

    const characterId = character?.id ? Number(character.id) : undefined;

    const body = {
      characterName: activeLog.characterName ?? "",
      characterId: characterId && !isNaN(characterId) ? characterId : undefined,
      candidates: candidates.map((c) => ({
        timestamp: c.timestamp.toISOString(),
        target: c.killCandidateTarget,
        weapon: c.killCandidateWeapon,
        isLoss: c.killCandidateIsLoss,
      })),
      sessionStart: (activeLog.sessionStart ?? activeLog.entries[0]?.timestamp ?? new Date()).toISOString(),
      sessionEnd: (activeLog.sessionEnd ?? activeLog.entries[activeLog.entries.length - 1]?.timestamp ?? new Date()).toISOString(),
    };

    setIsLoading(true);
    setError(null);

    window
      .fetch("/api/killmails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Request failed (${res.status})`);
        }
        return res.json();
      })
      .then((data: { matches: KillmailApiMatch[] }) => {
        const resolved: MatchedKillmail[] = data.matches.map((m) => ({
          candidateEntry: candidates[m.candidateIndex],
          killmail: {
            killmailId: m.killmail.killmailId,
            killmailHash: m.killmail.killmailHash,
            killmailTime: new Date(m.killmail.killmailTime),
            victim: m.killmail.victim,
            attackers: m.killmail.attackers,
            zkbPoints: m.killmail.zkbPoints,
            zkbValue: m.killmail.zkbValue,
            zkillUrl: m.killmail.zkillUrl,
          },
          confidence: m.confidence,
          score: m.score,
          matchReasons: m.matchReasons,
        }));
        setMatches(resolved);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [activeLog, candidates, character]);

  return { matches, isLoading, error, fetch: fetchKillmails, hasCandidates };
}
