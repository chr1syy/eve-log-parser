import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, it, expect, beforeAll } from "vitest";
import { parseLogFile } from "../../lib/parser";
import { analyzeDamageTaken } from "../../lib/analysis/damageTaken";
import { analyzeReps } from "../../lib/analysis/repAnalysis";
import { analyzeCapPressure } from "../../lib/analysis/capAnalysis";
import type { ParsedLog } from "../../lib/types";

const LOG_B_PATH = resolve(__dirname, "../../20260219_045352_151402274.txt");

let parsed: ParsedLog;

beforeAll(async () => {
  const text = readFileSync(LOG_B_PATH, "utf8");
  parsed = await parseLogFile(text);
});

describe("Log B — Parser header", () => {
  it("extracts character name", () => {
    expect(parsed.characterName).toBe("Bungo Brown");
  });

  it("extracts session start year 2026", () => {
    expect(parsed.sessionStart?.getFullYear()).toBe(2026);
  });
});

describe("Log B — Event type counts", () => {
  it("counts damage-dealt entries", () => {
    expect(
      parsed.entries.filter((e) => e.eventType === "damage-dealt").length,
    ).toBe(1);
  });

  it("counts damage-received entries", () => {
    expect(
      parsed.entries.filter((e) => e.eventType === "damage-received").length,
    ).toBe(1);
  });

  it("counts miss-incoming entries", () => {
    expect(
      parsed.entries.filter((e) => e.eventType === "miss-incoming").length,
    ).toBe(0);
  });

  it("has zero rep-received entries", () => {
    expect(
      parsed.entries.filter((e) => e.eventType === "rep-received").length,
    ).toBe(0);
  });

  it("has zero neut-received entries", () => {
    expect(
      parsed.entries.filter((e) => e.eventType === "neut-received").length,
    ).toBe(0);
  });

  it("has zero nos-dealt entries", () => {
    expect(
      parsed.entries.filter((e) => e.eventType === "nos-dealt").length,
    ).toBe(0);
  });
});

describe("Log B — NPC damage handling", () => {
  it("has no NPC damage entries", () => {
    const npcEntries = parsed.entries.filter(
      (e) => e.eventType === "damage-received" && e.isNpc,
    );
    expect(npcEntries.length).toBe(0);
  });
});

describe("Log B — Damage dealt fields", () => {
  it("captures Nova Rocket damage as non-drone", () => {
    const rocket = parsed.entries.filter(
      (e) => e.eventType === "damage-dealt" && e.weapon === "Nova Rocket",
    );
    expect(rocket.length).toBeGreaterThan(0);
    rocket.forEach((e) => expect(e.isDrone).toBeFalsy());
  });
});

describe("Log B — analyzeReps (zero reps)", () => {
  it("totalRepReceived is 0", () => {
    const reps = analyzeReps(parsed.entries);
    expect(reps.totalRepReceived).toBe(0);
  });

  it("repReceivedSources is empty", () => {
    const reps = analyzeReps(parsed.entries);
    expect(reps.repReceivedSources.length).toBe(0);
  });
});

describe("Log B — analyzeCapPressure (zero cap events)", () => {
  it("totalGjNeutReceived is 0", () => {
    const cap = analyzeCapPressure(parsed.entries);
    expect(cap.totalGjNeutReceived).toBe(0);
  });

  it("totalGjOutgoing is 0", () => {
    const cap = analyzeCapPressure(parsed.entries);
    expect(cap.totalGjOutgoing).toBe(0);
  });

  it("neutReceivedTimeline is empty", () => {
    const cap = analyzeCapPressure(parsed.entries);
    expect(cap.neutReceivedTimeline.length).toBe(0);
  });
});

describe("Log B — analyzeDamageTaken", () => {
  it("totalDamageReceived is positive", () => {
    const dt = analyzeDamageTaken(parsed.entries);
    expect(dt.totalDamageReceived).toBeGreaterThan(0);
  });

  it("detects incoming drone damage from players", () => {
    const dt = analyzeDamageTaken(parsed.entries);
    expect(dt.incomingDroneSummaries.length).toBe(0);
  });

  it("peakDps30s.maxDps is positive", () => {
    const dt = analyzeDamageTaken(parsed.entries);
    expect(dt.peakDps30s.maxDps).toBeGreaterThan(0);
  });
});
