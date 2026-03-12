import { describe, it, expect } from "vitest";
import { matchKillmails } from "@/lib/analysis/killmailMatcher";
import type { LogEntry } from "@/lib/types";
import type { ResolvedKillmail } from "@/lib/esi/types";

const BASE_TIME = new Date("2026-03-12T18:00:00Z");
const CHARACTER_ID = 12345;

function makeCandidate(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: "candidate-1",
    timestamp: BASE_TIME,
    rawLine: "(notify) Some kill notification",
    eventType: "kill-candidate",
    killCandidateTarget: "Typhoon",
    ...overrides,
  };
}

function makeKillmail(overrides: Partial<ResolvedKillmail> & { killmailTime?: Date } = {}): ResolvedKillmail {
  return {
    killmailId: 1001,
    killmailHash: "abc123",
    killmailTime: BASE_TIME,
    victim: {
      character_id: 99999,
      corporation_id: 88888,
      ship_type_id: 645,
      damage_taken: 50000,
    },
    attackers: [
      {
        character_id: CHARACTER_ID,
        corporation_id: 77777,
        ship_type_id: 17726,
        weapon_type_id: 3170,
        damage_done: 25000,
        final_blow: true,
      },
    ],
    zkbPoints: 10,
    zkbValue: 200000000,
    zkillUrl: "https://zkillboard.com/kill/1001/",
    ...overrides,
  };
}

describe("matchKillmails", () => {
  it("returns high confidence when timestamp matches exactly and character is on killmail", () => {
    const candidates = [makeCandidate()];
    const killmails = [makeKillmail()];

    const results = matchKillmails(candidates, killmails, CHARACTER_ID);

    expect(results).toHaveLength(1);
    expect(results[0].confidence).toBe("high");
    expect(results[0].score).toBeCloseTo(1.0);
    expect(results[0].matchReasons).toContain("timestamp within 0s");
    expect(results[0].matchReasons).toContain("character on killmail");
  });

  it("returns low/medium confidence when timestamp matches but character is NOT on killmail", () => {
    const candidates = [makeCandidate()];
    const killmails = [
      makeKillmail({
        attackers: [
          {
            character_id: 55555, // different character
            corporation_id: 77777,
            ship_type_id: 17726,
            weapon_type_id: 3170,
            damage_done: 25000,
            final_blow: true,
          },
        ],
      }),
    ];

    const results = matchKillmails(candidates, killmails, CHARACTER_ID);

    expect(results).toHaveLength(1);
    // Without participation (0.6 weight), max score is 0.4 (timestamp only)
    expect(results[0].score).toBeCloseTo(0.4);
    expect(results[0].confidence).toBe("low");
    expect(results[0].matchReasons).not.toContain("character on killmail");
  });

  it("returns no match when timestamp is outside ±120s window", () => {
    const candidates = [makeCandidate()];
    const killmails = [
      makeKillmail({
        killmailTime: new Date(BASE_TIME.getTime() + 121_000), // 121s later
      }),
    ];

    const results = matchKillmails(candidates, killmails, CHARACTER_ID);

    expect(results).toHaveLength(0);
  });

  it("handles multiple candidates matching different killmails with greedy 1:1 assignment", () => {
    const t1 = BASE_TIME;
    const t2 = new Date(BASE_TIME.getTime() + 60_000); // 60s later

    const candidates = [
      makeCandidate({ id: "c1", timestamp: t1 }),
      makeCandidate({ id: "c2", timestamp: t2 }),
    ];
    const killmails = [
      makeKillmail({ killmailId: 1001, killmailTime: t1 }),
      makeKillmail({ killmailId: 1002, killmailTime: t2 }),
    ];

    const results = matchKillmails(candidates, killmails, CHARACTER_ID);

    expect(results).toHaveLength(2);

    // Each killmail matched to its closest candidate
    const km1001 = results.find((r) => r.killmail.killmailId === 1001)!;
    const km1002 = results.find((r) => r.killmail.killmailId === 1002)!;
    expect(km1001.candidateEntry.id).toBe("c1");
    expect(km1002.candidateEntry.id).toBe("c2");
  });

  it("does not reuse a killmail for multiple candidates (greedy assignment)", () => {
    // Two candidates near the same time, only one killmail
    const candidates = [
      makeCandidate({ id: "c1", timestamp: BASE_TIME }),
      makeCandidate({ id: "c2", timestamp: new Date(BASE_TIME.getTime() + 5000) }),
    ];
    const killmails = [makeKillmail()];

    const results = matchKillmails(candidates, killmails, CHARACTER_ID);

    expect(results).toHaveLength(1);
    // Best match (exact timestamp) should win
    expect(results[0].candidateEntry.id).toBe("c1");
  });

  it("returns empty array for empty candidates", () => {
    const results = matchKillmails([], [makeKillmail()], CHARACTER_ID);
    expect(results).toEqual([]);
  });

  it("returns empty array for empty killmails", () => {
    const results = matchKillmails([makeCandidate()], [], CHARACTER_ID);
    expect(results).toEqual([]);
  });

  it("returns empty array for both empty", () => {
    const results = matchKillmails([], [], CHARACTER_ID);
    expect(results).toEqual([]);
  });

  it("includes meaningful matchReasons strings", () => {
    const candidates = [
      makeCandidate({
        timestamp: new Date(BASE_TIME.getTime() + 15_000), // 15s offset
      }),
    ];
    const killmails = [makeKillmail()];

    const results = matchKillmails(candidates, killmails, CHARACTER_ID);

    expect(results).toHaveLength(1);
    expect(results[0].matchReasons).toContain("timestamp within 15s");
    expect(results[0].matchReasons).toContain("character on killmail");
  });

  it("filters out matches with score <= 0.2", () => {
    // A killmail at 110s away with no character match:
    // timestampScore = 1 - 110000/120000 ≈ 0.083
    // participationScore = 0
    // total = 0.4 * 0.083 + 0.6 * 0 ≈ 0.033 → below 0.2, filtered
    const candidates = [makeCandidate()];
    const killmails = [
      makeKillmail({
        killmailTime: new Date(BASE_TIME.getTime() + 110_000),
        attackers: [
          {
            character_id: 55555,
            corporation_id: 77777,
            ship_type_id: 17726,
            weapon_type_id: 3170,
            damage_done: 25000,
            final_blow: true,
          },
        ],
      }),
    ];

    const results = matchKillmails(candidates, killmails, CHARACTER_ID);
    expect(results).toHaveLength(0);
  });

  it("assigns medium confidence for borderline scores", () => {
    // 60s offset with character on killmail:
    // timestampScore = 1 - 60000/120000 = 0.5
    // participationScore = 1.0
    // total = 0.4 * 0.5 + 0.6 * 1.0 = 0.8 → high
    // Use 70s offset:
    // timestampScore = 1 - 70000/120000 ≈ 0.417
    // total = 0.4 * 0.417 + 0.6 * 1.0 ≈ 0.767 → medium
    const candidates = [
      makeCandidate({
        timestamp: new Date(BASE_TIME.getTime() + 70_000),
      }),
    ];
    const killmails = [makeKillmail()];

    const results = matchKillmails(candidates, killmails, CHARACTER_ID);

    expect(results).toHaveLength(1);
    expect(results[0].confidence).toBe("medium");
    expect(results[0].score).toBeGreaterThanOrEqual(0.5);
    expect(results[0].score).toBeLessThan(0.8);
  });
});
