import { describe, it, expect } from "vitest";
import {
  matchLogsByTimestamp,
  mergeFleetLogs,
  FleetLogData,
} from "@/lib/fleet/logMerging";
import { analyzeFleetCombat } from "@/lib/fleet/fleetAnalysis";
import { calculateParticipantStats } from "@/lib/fleet/participantStats";
import { FleetParticipant } from "@/types/fleet";

describe("fleet integration", () => {
  it("should execute full pipeline without errors and produce correct aggregations", () => {
    const baseTime = new Date("2023-01-01T12:00:00Z");

    // Create mock logs with overlapping timestamps
    const pilot1Log: FleetLogData = {
      pilot: "Pilot1",
      shipType: "Typhoon",
      entries: [
        {
          id: "1",
          timestamp: new Date(baseTime.getTime() + 1000),
          rawLine:
            "[ 2023.01.01 12:00:01 ] (combat) 150 from Medium Focused Pulse Laser II belonging to Pilot1 - Tempest - Hits",
          eventType: "damage-dealt",
          amount: 150,
          weapon: "Medium Focused Pulse Laser II",
          pilotName: "Pilot1",
          shipType: "Tempest",
        },
        {
          id: "2",
          timestamp: new Date(baseTime.getTime() + 2000),
          rawLine:
            "[ 2023.01.01 12:00:02 ] (combat) 200 from Medium Focused Pulse Laser II belonging to Pilot1 - Tempest - Penetrates",
          eventType: "damage-dealt",
          amount: 200,
          weapon: "Medium Focused Pulse Laser II",
          pilotName: "Pilot1",
          shipType: "Tempest",
        },
        {
          id: "3",
          timestamp: new Date(baseTime.getTime() + 3000),
          rawLine:
            "[ 2023.01.01 12:00:03 ] (combat) 50 to Pilot1 - Typhoon - Hits",
          eventType: "damage-received",
          amount: 50,
          pilotName: "Pilot1",
          shipType: "Typhoon",
        },
        {
          id: "4",
          timestamp: new Date(baseTime.getTime() + 4000),
          rawLine:
            "[ 2023.01.01 12:00:04 ] (combat) 100 from Pilot1 - Typhoon - rep-received",
          eventType: "rep-received",
          amount: 100,
          pilotName: "Pilot1",
          shipType: "Typhoon",
        },
      ],
    };

    const pilot2Log: FleetLogData = {
      pilot: "Pilot2",
      shipType: "Tempest",
      entries: [
        {
          id: "5",
          timestamp: new Date(baseTime.getTime() + 1500),
          rawLine:
            "[ 2023.01.01 12:00:01.5 ] (combat) 120 from Heavy Entropic Disintegrator II belonging to Pilot2 - Apocalypse - Hits",
          eventType: "damage-dealt",
          amount: 120,
          weapon: "Heavy Entropic Disintegrator II",
          pilotName: "Pilot2",
          shipType: "Apocalypse",
        },
        {
          id: "6",
          timestamp: new Date(baseTime.getTime() + 2500),
          rawLine:
            "[ 2023.01.01 12:00:02.5 ] (combat) 75 to Pilot2 - Tempest - Hits",
          eventType: "damage-received",
          amount: 75,
          pilotName: "Pilot2",
          shipType: "Tempest",
        },
        {
          id: "7",
          timestamp: new Date(baseTime.getTime() + 3500),
          rawLine:
            "[ 2023.01.01 12:00:03.5 ] (combat) 80 from Pilot2 - Tempest - rep-outgoing",
          eventType: "rep-outgoing",
          amount: 80,
          pilotName: "Pilot2",
          shipType: "Tempest",
        },
        {
          id: "8",
          timestamp: new Date(baseTime.getTime() + 4500),
          rawLine:
            "[ 2023.01.01 12:00:04.5 ] (combat) 60 to Pilot2 - Tempest - neut-received",
          eventType: "neut-received",
          capAmount: 60,
          pilotName: "Pilot2",
          shipType: "Tempest",
        },
        {
          id: "9",
          timestamp: new Date(baseTime.getTime() + 5000),
          rawLine:
            "[ 2023.01.01 12:00:05 ] (combat) 50 from Pilot2 - Tempest - neut-dealt",
          eventType: "neut-dealt",
          capAmount: 50,
          pilotName: "Pilot2",
          shipType: "Tempest",
        },
      ],
    };

    const pilot3Log: FleetLogData = {
      pilot: "Pilot3",
      shipType: "Apocalypse",
      entries: [
        {
          id: "9",
          timestamp: new Date(baseTime.getTime() + 2000),
          rawLine:
            "[ 2023.01.01 12:00:02 ] (combat) 180 from Dual Heavy Pulse Laser II belonging to Pilot3 - Rattlesnake - Hits",
          eventType: "damage-dealt",
          amount: 180,
          weapon: "Dual Heavy Pulse Laser II",
          pilotName: "Pilot3",
          shipType: "Rattlesnake",
        },
        {
          id: "10",
          timestamp: new Date(baseTime.getTime() + 3000),
          rawLine:
            "[ 2023.01.01 12:00:03 ] (combat) 90 to Pilot3 - Apocalypse - Hits",
          eventType: "damage-received",
          amount: 90,
          pilotName: "Pilot3",
          shipType: "Apocalypse",
        },
        {
          id: "11",
          timestamp: new Date(baseTime.getTime() + 4000),
          rawLine:
            "[ 2023.01.01 12:00:04 ] (combat) 70 from Pilot3 - Apocalypse - rep-received",
          eventType: "rep-received",
          amount: 70,
          pilotName: "Pilot3",
          shipType: "Apocalypse",
        },
      ],
    };

    const logs = [pilot1Log, pilot2Log, pilot3Log];

    // Step 1: Match logs by timestamp
    const matchResult = matchLogsByTimestamp(logs);
    expect(matchResult.overlapping).toBe(true);
    expect(matchResult.validationErrors).toEqual([]);

    // Step 2: Merge fleet logs
    const mergedEntries = mergeFleetLogs(logs);
    expect(mergedEntries).toHaveLength(12); // 4 + 5 + 3 = 12 entries
    expect(
      mergedEntries.every((entry) => entry.pilotName && entry.shipType),
    ).toBe(true);

    // Verify chronological ordering
    for (let i = 1; i < mergedEntries.length; i++) {
      expect(mergedEntries[i].timestamp.getTime()).toBeGreaterThanOrEqual(
        mergedEntries[i - 1].timestamp.getTime(),
      );
    }

    // Step 3: Create participants
    const participants: FleetParticipant[] = [
      {
        pilotName: "Pilot1",
        shipType: "Typhoon",
        damageDealt: 0,
        damageTaken: 0,
        repsGiven: 0,
        repsTaken: 0,
        status: "pending",
        logId: "log1",
      },
      {
        pilotName: "Pilot2",
        shipType: "Tempest",
        damageDealt: 0,
        damageTaken: 0,
        repsGiven: 0,
        repsTaken: 0,
        status: "pending",
        logId: "log2",
      },
      {
        pilotName: "Pilot3",
        shipType: "Apocalypse",
        damageDealt: 0,
        damageTaken: 0,
        repsGiven: 0,
        repsTaken: 0,
        status: "pending",
        logId: "log3",
      },
    ];

    // Step 4: Analyze fleet combat
    const analysis = analyzeFleetCombat(mergedEntries, participants);

    // Verify FleetCombatAnalysis structure
    expect(analysis).toHaveProperty("damageDealt");
    expect(analysis).toHaveProperty("damageTaken");
    expect(analysis).toHaveProperty("repFlows");
    expect(analysis).toHaveProperty("capPressure");
    expect(analysis).toHaveProperty("enemies");
    expect(analysis).toHaveProperty("fightDuration");

    // Step 5: Calculate participant stats
    const participantStats = calculateParticipantStats(
      mergedEntries,
      participants,
    );
    expect(participantStats).toHaveLength(3);

    // Verify aggregations are mathematically correct
    // Damage dealt: Pilot1: 150+200=350, Pilot2: 120, Pilot3: 180
    expect(analysis.damageDealt.byPilot.get("Pilot1")).toBe(350);
    expect(analysis.damageDealt.byPilot.get("Pilot2")).toBe(120);
    expect(analysis.damageDealt.byPilot.get("Pilot3")).toBe(180);

    // Damage taken: Pilot1: 50, Pilot2: 75, Pilot3: 90
    expect(analysis.damageTaken.byPilot.get("Pilot1")).toBe(50);
    expect(analysis.damageTaken.byPilot.get("Pilot2")).toBe(75);
    expect(analysis.damageTaken.byPilot.get("Pilot3")).toBe(90);

    // Rep flows
    expect(analysis.repFlows.flows).toHaveLength(1); // Pilot2 rep-outgoing
    expect(analysis.repFlows.totalRepsGiven.get("Pilot2")).toBe(80);

    // Cap pressure
    expect(analysis.capPressure.capDrained.get("Pilot2")).toBe(60);
    expect(analysis.capPressure.capDrainers).toContain("Pilot2");

    // Fight duration
    expect(analysis.fightDuration.durationSeconds).toBe(4); // From 1s to 5s (4500ms = 4.5s, but timestamps up to 4500)

    // Participant stats
    const pilot1Stats = participantStats.find((p) => p.pilotName === "Pilot1");
    expect(pilot1Stats?.damageDealt).toBe(350);
    expect(pilot1Stats?.damageTaken).toBe(50);
    expect(pilot1Stats?.repsGiven).toBe(0);
    expect(pilot1Stats?.repsTaken).toBe(100);

    const pilot2Stats = participantStats.find((p) => p.pilotName === "Pilot2");
    expect(pilot2Stats?.damageDealt).toBe(120);
    expect(pilot2Stats?.damageTaken).toBe(75);
    expect(pilot2Stats?.repsGiven).toBe(80);
    expect(pilot2Stats?.repsTaken).toBe(0);
  });
});
