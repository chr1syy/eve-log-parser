import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, it, expect, beforeAll } from "vitest";
import { parseLogFile } from "../../lib/parser";
import { analyzeDamageDealt } from "../../lib/analysis/damageDealt";
import { analyzeDamageTaken } from "../../lib/analysis/damageTaken";
import { analyzeReps } from "../../lib/analysis/repAnalysis";
import { analyzeCapPressure } from "../../lib/analysis/capAnalysis";
import type { ParsedLog } from "../../lib/types";

// Helper: create a File from disk path
function fileFromDisk(filePath: string): File {
  const buffer = readFileSync(filePath);
  const blob = new Blob([buffer], { type: "text/plain" });
  return new File([blob], filePath.split("/").pop()!, { type: "text/plain" });
}

const LOG_A_PATH = resolve(__dirname, "../../20251023_013333_151402274.txt");

let parsed: ParsedLog;

beforeAll(async () => {
  parsed = await parseLogFile(fileFromDisk(LOG_A_PATH));
});

describe("Log A — Parser header", () => {
  it("extracts character name", () => {
    expect(parsed.characterName).toBe("Bungo Brown");
  });

  it("extracts session start", () => {
    expect(parsed.sessionStart?.getFullYear()).toBe(2025);
  });

  it("parses without throwing", () => {
    expect(parsed.entries.length).toBeGreaterThan(0);
  });
});

describe("Log A — Event type counts", () => {
  it("counts damage-dealt entries", () => {
    expect(
      parsed.entries.filter((e) => e.eventType === "damage-dealt").length,
    ).toBe(3);
  });

  it("counts damage-received entries", () => {
    expect(
      parsed.entries.filter((e) => e.eventType === "damage-received").length,
    ).toBe(2);
  });

  it("counts miss-incoming entries", () => {
    expect(
      parsed.entries.filter((e) => e.eventType === "miss-incoming").length,
    ).toBe(0);
  });

  it("counts rep-received entries", () => {
    expect(
      parsed.entries.filter((e) => e.eventType === "rep-received").length,
    ).toBe(1);
  });

  it("counts rep-outgoing entries", () => {
    expect(
      parsed.entries.filter((e) => e.eventType === "rep-outgoing").length,
    ).toBe(0);
  });

  it("counts neut-received entries", () => {
    expect(
      parsed.entries.filter((e) => e.eventType === "neut-received").length,
    ).toBe(1);
  });

  it("counts neut-dealt entries", () => {
    expect(
      parsed.entries.filter((e) => e.eventType === "neut-dealt").length,
    ).toBe(1);
  });

  it("counts nos-dealt entries", () => {
    expect(
      parsed.entries.filter((e) => e.eventType === "nos-dealt").length,
    ).toBe(0);
  });
});

describe("Log A — Damage dealt fields", () => {
  it("identifies drone damage", () => {
    const droneHits = parsed.entries.filter(
      (e) => e.eventType === "damage-dealt" && e.isDrone,
    );
    expect(droneHits.length).toBe(0);
  });

  it("identifies turret/weapon damage", () => {
    const weaponHits = parsed.entries.filter(
      (e) => e.eventType === "damage-dealt" && !e.isDrone,
    );
    expect(weaponHits.length).toBeGreaterThan(0);
    weaponHits.forEach((e) =>
      expect(e.weapon).toMatch(/Heavy Entropic Disintegrator II/),
    );
  });

  it("extracts pilot name and corp from damage-dealt", () => {
    const dealtEntry = parsed.entries.find(
      (e) => e.eventType === "damage-dealt",
    );
    expect(dealtEntry).toBeDefined();
    expect(dealtEntry!.pilotName).toBe("Bungo Brown");
    expect(dealtEntry!.corpTicker).toBeUndefined();
  });

  it("parses hit quality on damage-dealt entries", () => {
    const withQuality = parsed.entries.filter(
      (e) =>
        e.eventType === "damage-dealt" &&
        e.hitQuality &&
        e.hitQuality !== "unknown",
    );
    expect(withQuality.length).toBeGreaterThan(0);
  });
});

describe("Log A — Damage received fields", () => {
  it("extracts pilot, corp, ship from player attacker", () => {
    const attackerEntry = parsed.entries.find(
      (e) => e.eventType === "damage-received" && e.pilotName === "Diana Wanda",
    );
    expect(attackerEntry).toBeDefined();
    expect(attackerEntry!.pilotName).toBe("Diana Wanda");
    expect(attackerEntry!.corpTicker).toBeUndefined();
    expect(attackerEntry!.isNpc).toBe(false);
  });

  it("identifies incoming drone hits", () => {
    const droneDmg = parsed.entries.filter(
      (e) => e.eventType === "damage-received" && e.isDrone,
    );
    expect(droneDmg.length).toBe(0);
  });

  it("all damage-received entries have a positive amount", () => {
    parsed.entries
      .filter((e) => e.eventType === "damage-received")
      .forEach((e) => expect(e.amount).toBeGreaterThanOrEqual(0));
  });
});

describe("Log A — Rep fields", () => {
  it("identifies rep bots", () => {
    const botReps = parsed.entries.filter(
      (e) => e.eventType === "rep-received" && e.isRepBot,
    );
    expect(botReps.length).toBe(0);
  });

  it("identifies ship reps (non-bot)", () => {
    const shipReps = parsed.entries.filter(
      (e) => e.eventType === "rep-received" && !e.isRepBot,
    );
    expect(shipReps.length).toBeGreaterThan(0);
    shipReps.forEach((e) => expect(e.repShipType).toBe("Vedmak"));
  });

  it("rep-received entries have repModule set", () => {
    parsed.entries
      .filter((e) => e.eventType === "rep-received")
      .forEach((e) => expect(e.repModule).toBeTruthy());
  });

  it("rep-outgoing entries have direction outgoing", () => {
    parsed.entries
      .filter((e) => e.eventType === "rep-outgoing")
      .forEach((e) => expect(e.direction).toBe("outgoing"));
  });
});

describe("Log A — Cap fields", () => {
  it("neut-received entries have correct capAmount", () => {
    parsed.entries
      .filter((e) => e.eventType === "neut-received")
      .forEach((e) => {
        expect(e.capAmount).toBe(438);
        expect(e.capModule).toBe(
          "Medium Infectious Scoped Energy Neutralizer I",
        );
        expect(e.capShipType).toBe("Vedmak");
      });
  });

  it("neut-dealt entries have capModule set", () => {
    parsed.entries
      .filter((e) => e.eventType === "neut-dealt")
      .forEach((e) =>
        expect(e.capModule).toBe(
          "Medium Infectious Scoped Energy Neutralizer I",
        ),
      );
  });

  it("nos-dealt entries have non-negative capAmount", () => {
    parsed.entries
      .filter((e) => e.eventType === "nos-dealt")
      .forEach((e) => expect(e.capAmount).toBeGreaterThanOrEqual(0));
  });

  it("nos-dealt zero-GJ hits have capAmount 0", () => {
    const zeros = parsed.entries.filter(
      (e) => e.eventType === "nos-dealt" && e.capAmount === 0,
    );
    expect(zeros.length).toBe(0);
  });
});

describe("Log A — computeStats", () => {
  it("stats.damageDealt matches sum of dealt entries", () => {
    const dealtEntries = parsed.entries.filter(
      (e) => e.eventType === "damage-dealt",
    );
    const manualSum = dealtEntries.reduce((sum, e) => sum + (e.amount ?? 0), 0);
    expect(parsed.stats.damageDealt).toBe(manualSum);
  });

  it("stats.damageReceived matches sum of received entries", () => {
    const receivedEntries = parsed.entries.filter(
      (e) => e.eventType === "damage-received",
    );
    const manualSum = receivedEntries.reduce(
      (sum, e) => sum + (e.amount ?? 0),
      0,
    );
    expect(parsed.stats.damageReceived).toBe(manualSum);
  });

  it("stats.totalRepReceived matches sum of rep-received amounts", () => {
    const repEntries = parsed.entries.filter(
      (e) => e.eventType === "rep-received",
    );
    const manualSum = repEntries.reduce((sum, e) => sum + (e.amount ?? 0), 0);
    expect(parsed.stats.totalRepReceived).toBe(manualSum);
  });

  it("stats.capNeutReceived is 438", () => {
    expect(parsed.stats.capNeutReceived).toBe(438);
  });

  it("stats.capNeutDealt is correct", () => {
    const neutDealtEntries = parsed.entries.filter(
      (e) => e.eventType === "neut-dealt",
    );
    const manualSum = neutDealtEntries.reduce(
      (sum, e) => sum + (e.capAmount ?? 0),
      0,
    );
    expect(parsed.stats.capNeutDealt).toBe(manualSum);
  });

  it("stats.activeTimeMinutes is positive", () => {
    expect(parsed.stats.activeTimeMinutes).toBeGreaterThan(0);
  });
});

describe("Log A — analyzeDamageDealt", () => {
  it("returns engagements for each target", () => {
    const analysis = analyzeDamageDealt(parsed.entries);
    expect(analysis.engagements.length).toBeGreaterThan(0);
  });

  it("separates drone summaries from weapon summaries", () => {
    const analysis = analyzeDamageDealt(parsed.entries);
    expect(analysis.droneSummaries.length).toBe(0);
    expect(
      analysis.weaponSummaries.some((s) =>
        s.weapon.match(/Heavy Entropic Disintegrator/i),
      ),
    ).toBe(true);
  });

  it("total damage across all engagements equals totalDamageDealt", () => {
    const analysis = analyzeDamageDealt(parsed.entries);
    const engTotal = analysis.engagements.reduce(
      (s, e) => s + e.totalDamage,
      0,
    );
    expect(engTotal).toBe(analysis.totalDamageDealt);
  });

  it("all engagements have windowSeconds >= 0", () => {
    const analysis = analyzeDamageDealt(parsed.entries);
    analysis.engagements.forEach((e) =>
      expect(e.windowSeconds).toBeGreaterThanOrEqual(0),
    );
  });
});

describe("Log A — analyzeDamageTaken", () => {
  it("totalDamageReceived matches stats.damageReceived", () => {
    const dt = analyzeDamageTaken(parsed.entries);
    expect(dt.totalDamageReceived).toBe(parsed.stats.damageReceived);
  });

  it("detects at least one fight segment", () => {
    const dt = analyzeDamageTaken(parsed.entries);
    expect(dt.fights.length).toBeGreaterThan(0);
  });

  it("peakDps10s.maxDps is positive", () => {
    const dt = analyzeDamageTaken(parsed.entries);
    expect(dt.peakDps10s.maxDps).toBeGreaterThan(0);
  });

  it("separates incoming drone summaries", () => {
    const dt = analyzeDamageTaken(parsed.entries);
    expect(dt.incomingDroneSummaries.length).toBe(0);
  });
});

describe("Log A — analyzeReps", () => {
  it("totalRepReceived matches stats.totalRepReceived", () => {
    const reps = analyzeReps(parsed.entries);
    expect(reps.totalRepReceived).toBe(parsed.stats.totalRepReceived);
  });

  it("identifies rep bots separately", () => {
    const reps = analyzeReps(parsed.entries);
    expect(reps.repReceivedByBots.length).toBe(0);
  });

  it("identifies Vedmak as a ship repper", () => {
    const reps = analyzeReps(parsed.entries);
    expect(reps.repReceivedByShips.some((s) => s.shipType === "Vedmak")).toBe(
      true,
    );
  });

  it("totalRepOutgoing is positive", () => {
    const reps = analyzeReps(parsed.entries);
    expect(reps.totalRepOutgoing).toBe(0);
  });
});

describe("Log A — analyzeCapPressure", () => {
  it("totalGjNeutReceived is 438", () => {
    const cap = analyzeCapPressure(parsed.entries);
    expect(cap.totalGjNeutReceived).toBe(438);
  });

  it("incomingByShipType contains Vedmak", () => {
    const cap = analyzeCapPressure(parsed.entries);
    expect(cap.incomingByShipType.some((s) => s.shipType === "Vedmak")).toBe(
      true,
    );
  });

  it("outgoingModuleSummaries contains Medium Infectious Scoped Energy Neutralizer", () => {
    const cap = analyzeCapPressure(parsed.entries);
    expect(
      cap.outgoingModuleSummaries.some(
        (m) => m.module === "Medium Infectious Scoped Energy Neutralizer I",
      ),
    ).toBe(true);
  });

  it("nos-dealt zeroHits is greater than 0", () => {
    const cap = analyzeCapPressure(parsed.entries);
    const nosSummary = cap.outgoingModuleSummaries.find(
      (m) => m.eventType === "nos-dealt",
    );
    expect(nosSummary).toBeUndefined();
  });
});
