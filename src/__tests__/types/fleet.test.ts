import { describe, it, expect } from "vitest";
import type {
  FleetSession,
  FleetLog,
  FleetParticipant,
  FleetCombatAnalysis,
  FleetSessionCode,
} from "@/types/fleet";

// ────────────────────────────────────────────────────────────
// FleetSession
// ────────────────────────────────────────────────────────────
describe("FleetSession", () => {
  it("instantiates with required fields", () => {
    const session: FleetSession = {
      id: "session-123",
      code: "FLEET-ABC123" as FleetSessionCode,
      creator: "John Doe",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      participants: [],
      logs: [],
      tags: [],
      status: "PENDING",
    };

    expect(session.id).toBe("session-123");
    expect(session.code).toBe("FLEET-ABC123");
    expect(session.creator).toBe("John Doe");
    expect(session.createdAt).toBeInstanceOf(Date);
    expect(session.participants).toEqual([]);
    expect(session.logs).toEqual([]);
    expect(session.tags).toEqual([]);
    expect(session.status).toBe("PENDING");
    expect(session.fightName).toBeUndefined();
  });

  it("accepts optional fightName and tags", () => {
    const session: FleetSession = {
      id: "session-124",
      code: "FLEET-DEF456" as FleetSessionCode,
      creator: "Jane Doe",
      createdAt: new Date(),
      participants: [],
      logs: [],
      fightName: "Angel Cartel Assault",
      tags: ["pvp", "angel"],
      status: "ACTIVE",
    };

    expect(session.fightName).toBe("Angel Cartel Assault");
    expect(session.tags).toEqual(["pvp", "angel"]);
  });
});

// ────────────────────────────────────────────────────────────
// FleetLog
// ────────────────────────────────────────────────────────────
describe("FleetLog", () => {
  it("instantiates with pilot info", () => {
    const log: FleetLog = {
      id: "log-123",
      sessionId: "session-123",
      pilotName: "Pilot One",
      shipType: "Typhoon",
      logData: "sample log data",
      uploadedAt: new Date("2024-01-01T00:00:00Z"),
      pilotId: "pilot-uuid",
    };

    expect(log.id).toBe("log-123");
    expect(log.sessionId).toBe("session-123");
    expect(log.pilotName).toBe("Pilot One");
    expect(log.shipType).toBe("Typhoon");
    expect(log.logData).toBe("sample log data");
    expect(log.uploadedAt).toBeInstanceOf(Date);
    expect(log.pilotId).toBe("pilot-uuid");
  });
});

// ────────────────────────────────────────────────────────────
// FleetParticipant
// ────────────────────────────────────────────────────────────
describe("FleetParticipant", () => {
  it("instantiates with aggregate stats", () => {
    const participant: FleetParticipant = {
      pilotName: "Pilot One",
      shipType: "Typhoon",
      damageDealt: 1500,
      damageTaken: 800,
      repsGiven: 500,
      repsTaken: 300,
      status: "active",
      logId: "log-123",
    };

    expect(participant.pilotName).toBe("Pilot One");
    expect(participant.shipType).toBe("Typhoon");
    expect(participant.damageDealt).toBe(1500);
    expect(participant.damageTaken).toBe(800);
    expect(participant.repsGiven).toBe(500);
    expect(participant.repsTaken).toBe(300);
    expect(participant.status).toBe("active");
    expect(participant.logId).toBe("log-123");
  });

  it("accepts inactive status", () => {
    const participant: FleetParticipant = {
      pilotName: "Pilot Two",
      shipType: "Brutix",
      damageDealt: 0,
      damageTaken: 0,
      repsGiven: 0,
      repsTaken: 0,
      status: "inactive",
      logId: "log-124",
    };

    expect(participant.status).toBe("inactive");
  });
});

// ────────────────────────────────────────────────────────────
// FleetCombatAnalysis
// ────────────────────────────────────────────────────────────
describe("FleetCombatAnalysis", () => {
  it("has correct structure", () => {
    const analysis: FleetCombatAnalysis = {
      totalDamageDealt: 3000,
      totalDamageTaken: 1500,
      totalRepsGiven: 1000,
      participants: [
        {
          pilotName: "Pilot One",
          shipType: "Typhoon",
          damageDealt: 1500,
          damageTaken: 800,
          repsGiven: 500,
          repsTaken: 300,
          status: "active",
          logId: "log-123",
        },
      ],
      enemies: [
        {
          name: "Angel Frigate",
          damageDealt: 1200,
          damageReceived: 600,
          kills: 1,
        },
        {
          name: "Angel Cruiser",
          damageDealt: 800,
          damageReceived: 400,
          kills: 0,
        },
      ],
      fightDuration: 45,
    };

    expect(analysis.totalDamageDealt).toBe(3000);
    expect(analysis.totalDamageTaken).toBe(1500);
    expect(analysis.totalRepsGiven).toBe(1000);
    expect(analysis.participants).toHaveLength(1);
    expect(analysis.enemies.map((e) => e.name)).toEqual([
      "Angel Frigate",
      "Angel Cruiser",
    ]);
    expect(analysis.fightDuration).toBe(45);
  });
});
