import { NextResponse } from "next/server";
import {
  resolveCharacterIds,
  fetchRecentKillmails,
  resolveKillmails,
} from "@/lib/esi/esiClient";
import { matchKillmails } from "@/lib/analysis/killmailMatcher";
import type { LogEntry } from "@/lib/types";

interface KillmailCandidate {
  timestamp: string;
  target?: string;
  weapon?: string;
  isLoss?: boolean;
}

interface KillmailRequestBody {
  characterName: string;
  characterId?: number;
  candidates: KillmailCandidate[];
  sessionStart: string;
  sessionEnd: string;
}

export async function POST(req: Request) {
  let body: KillmailRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { characterName, characterId: providedCharacterId, candidates, sessionStart, sessionEnd } = body;

  if (!characterName || typeof characterName !== "string") {
    return NextResponse.json(
      { error: "characterName is required" },
      { status: 400 },
    );
  }

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return NextResponse.json(
      { error: "candidates must be a non-empty array" },
      { status: 400 },
    );
  }

  if (!sessionStart || !sessionEnd) {
    return NextResponse.json(
      { error: "sessionStart and sessionEnd are required" },
      { status: 400 },
    );
  }

  // Resolve character ID
  let characterId: number;
  if (providedCharacterId != null) {
    characterId = providedCharacterId;
  } else {
    try {
      const resolved = await resolveCharacterIds([characterName]);
      const id = resolved.get(characterName);
      if (id == null) {
        return NextResponse.json(
          { error: `Could not resolve character: ${characterName}` },
          { status: 404 },
        );
      }
      characterId = id;
    } catch {
      return NextResponse.json(
        { error: "Failed to resolve character from ESI" },
        { status: 502 },
      );
    }
  }

  // Calculate time window in hours
  const start = new Date(sessionStart).getTime() - 5 * 60 * 1000;
  const end = new Date(sessionEnd).getTime() + 5 * 60 * 1000;
  const windowHours = Math.min(Math.ceil((end - start) / (1000 * 60 * 60)), 168);

  try {
    // Fetch killmails from zKillboard
    const zkillEntries = await fetchRecentKillmails(characterId, windowHours);

    // Resolve full killmail details from ESI
    const resolvedKillmails = await resolveKillmails(zkillEntries);

    // Reconstruct LogEntry[] from candidates
    const entries: LogEntry[] = candidates.map((c, i) => ({
      id: `candidate-${i}`,
      timestamp: new Date(c.timestamp),
      rawLine: "",
      eventType: "kill-candidate" as const,
      killCandidateTarget: c.target,
      killCandidateWeapon: c.weapon,
      killCandidateIsLoss: c.isLoss,
    }));

    // Run the matcher
    const matches = matchKillmails(entries, resolvedKillmails, characterId);

    // Serialize results
    const serialized = matches.map((m) => ({
      candidateIndex: parseInt(m.candidateEntry.id.replace("candidate-", ""), 10),
      killmail: {
        killmailId: m.killmail.killmailId,
        killmailHash: m.killmail.killmailHash,
        killmailTime: m.killmail.killmailTime.toISOString(),
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

    return NextResponse.json({ matches: serialized });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch killmail data from upstream APIs" },
      { status: 502 },
    );
  }
}
