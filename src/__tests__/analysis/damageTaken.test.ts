import { describe, it, expect } from "vitest";
import { analyzeDamageTaken } from "../../lib/analysis/damageTaken";
import type { LogEntry } from "../../lib/types";

describe("analyzeDamageTaken", () => {
  it("includes shipType in incoming weapon summaries", () => {
    const entries: LogEntry[] = [
      {
        id: "1",
        timestamp: new Date(),
        rawLine: "",
        eventType: "damage-received",
        pilotName: "Attacker1",
        shipType: "Typhoon",
        weapon: "Nova Missile",
        isDrone: false,
        amount: 150,
        hitQuality: "Hits",
      },
      {
        id: "2",
        timestamp: new Date(),
        rawLine: "",
        eventType: "damage-received",
        pilotName: "Attacker2",
        shipType: "Proteus",
        weapon: "Heavy Entropic Disintegrator II",
        isDrone: false,
        amount: 200,
        hitQuality: "Penetrates",
      },
      {
        id: "3",
        timestamp: new Date(),
        rawLine: "",
        eventType: "damage-received",
        pilotName: "NPC",
        shipType: "Arch Gistii Thug",
        weapon: "Nova Rocket",
        isDrone: false,
        amount: 100,
        hitQuality: "Grazes",
      },
    ];
    const result = analyzeDamageTaken(entries);
    expect(result.incomingWeaponSummaries.length).toBe(3);

    const typhoonSummary = result.incomingWeaponSummaries.find(
      (summary) => summary.shipType === "Typhoon",
    );
    const proteusSummary = result.incomingWeaponSummaries.find(
      (summary) => summary.shipType === "Proteus",
    );
    const archGistiiThugSummary = result.incomingWeaponSummaries.find(
      (summary) => summary.shipType === "Arch Gistii Thug",
    );

    expect(typhoonSummary?.shipType).toBe("Typhoon");
    expect(proteusSummary?.shipType).toBe("Proteus");
    expect(archGistiiThugSummary?.shipType).toBe("Arch Gistii Thug");
  });

  it("includes shipType in incoming drone summaries", () => {
    const entries: LogEntry[] = [
      {
        id: "1",
        timestamp: new Date(),
        rawLine: "",
        eventType: "damage-received",
        pilotName: "Attacker1",
        shipType: "Typhoon",
        weapon: "Wasp II",
        isDrone: true,
        amount: 50,
        hitQuality: "Hits",
      },
    ];
    const result = analyzeDamageTaken(entries);
    expect(result.incomingDroneSummaries.length).toBe(1);
    expect(result.incomingDroneSummaries[0].shipType).toBe("Typhoon");
  });

  it("handles missing shipType gracefully", () => {
    const entries: LogEntry[] = [
      {
        id: "1",
        timestamp: new Date(),
        rawLine: "",
        eventType: "damage-received",
        pilotName: "Attacker1",
        weapon: "Nova Missile",
        isDrone: false,
        amount: 150,
        hitQuality: "Hits",
      },
    ];
    const result = analyzeDamageTaken(entries);
    expect(result.incomingWeaponSummaries[0].shipType).toBeUndefined();
  });
});
