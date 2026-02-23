import type {
  FleetSession,
  FleetParticipant,
  FleetLog,
  FleetSessionCode,
} from "@/types/fleet";

// Session status constants
export const FLEET_SESSION_STATUSES = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  ARCHIVED: "ARCHIVED",
} as const;

export type FleetSessionStatus =
  (typeof FLEET_SESSION_STATUSES)[keyof typeof FLEET_SESSION_STATUSES];

// Timestamp tolerance for log uploads (±5 minutes)
export const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 300,000 ms

// Example fleet session codes
export const EXAMPLE_FLEET_SESSION_CODES: FleetSessionCode[] = [
  "FLEET-ABC123",
  "FLEET-XYZ789",
  "FLEET-DEF456",
  "FLEET-GHI012",
];

// Example fleet participants
const exampleParticipants1: FleetParticipant[] = [
  {
    pilotName: "Captain Alpha",
    shipType: "Abaddon",
    damageDealt: 150000,
    damageTaken: 50000,
    repsGiven: 25000,
    repsTaken: 30000,
    status: "active",
    logId: "log-1",
  },
  {
    pilotName: "Lieutenant Beta",
    shipType: "Raven",
    damageDealt: 120000,
    damageTaken: 60000,
    repsGiven: 20000,
    repsTaken: 25000,
    status: "active",
    logId: "log-2",
  },
];

const exampleParticipants2: FleetParticipant[] = [
  {
    pilotName: "Commander Gamma",
    shipType: "Apocalypse",
    damageDealt: 180000,
    damageTaken: 45000,
    repsGiven: 30000,
    repsTaken: 20000,
    status: "active",
    logId: "log-3",
  },
  {
    pilotName: "Sergeant Delta",
    shipType: "Drake",
    damageDealt: 100000,
    damageTaken: 55000,
    repsGiven: 15000,
    repsTaken: 35000,
    status: "active",
    logId: "log-4",
  },
  {
    pilotName: "Corporal Epsilon",
    shipType: "Hurricane",
    damageDealt: 95000,
    damageTaken: 65000,
    repsGiven: 10000,
    repsTaken: 40000,
    status: "inactive",
    logId: "log-5",
  },
];

// Example fleet logs
const exampleLogs1: FleetLog[] = [
  {
    id: "log-1",
    sessionId: "session-1",
    pilotName: "Captain Alpha",
    shipType: "Abaddon",
    logData:
      "[2026-02-23 10:00:00] (combat) 15000 from Captain Alpha - Heavy Entropic Disintegrator II - Hits",
    uploadedAt: new Date("2026-02-23T10:05:00Z"),
    pilotId: "pilot-1",
  },
  {
    id: "log-2",
    sessionId: "session-1",
    pilotName: "Lieutenant Beta",
    shipType: "Raven",
    logData:
      "[2026-02-23 10:01:00] (combat) 12000 from Lieutenant Beta - Cruise Missile Launcher II - Hits",
    uploadedAt: new Date("2026-02-23T10:06:00Z"),
    pilotId: "pilot-2",
  },
];

const exampleLogs2: FleetLog[] = [
  {
    id: "log-3",
    sessionId: "session-2",
    pilotName: "Commander Gamma",
    shipType: "Apocalypse",
    logData:
      "[2026-02-23 11:00:00] (combat) 18000 from Commander Gamma - Mega Pulse Laser II - Hits",
    uploadedAt: new Date("2026-02-23T11:05:00Z"),
    pilotId: "pilot-3",
  },
  {
    id: "log-4",
    sessionId: "session-2",
    pilotName: "Sergeant Delta",
    shipType: "Drake",
    logData:
      "[2026-02-23 11:01:00] (combat) 10000 from Sergeant Delta - Heavy Missile Launcher II - Hits",
    uploadedAt: new Date("2026-02-23T11:06:00Z"),
    pilotId: "pilot-4",
  },
  {
    id: "log-5",
    sessionId: "session-2",
    pilotName: "Corporal Epsilon",
    shipType: "Hurricane",
    logData:
      "[2026-02-23 11:02:00] (combat) 9500 from Corporal Epsilon - 425mm AutoCannon II - Hits",
    uploadedAt: new Date("2026-02-23T11:07:00Z"),
    pilotId: "pilot-5",
  },
];

// Example fleet sessions
export const EXAMPLE_FLEET_SESSIONS: FleetSession[] = [
  {
    id: "session-1",
    code: EXAMPLE_FLEET_SESSION_CODES[0],
    creator: "Captain Alpha",
    createdAt: new Date("2026-02-23T10:00:00Z"),
    participants: exampleParticipants1,
    logs: exampleLogs1,
    fightName: "Blood Raider Outpost Assault",
    tags: ["blood raiders", "outpost"],
    status: FLEET_SESSION_STATUSES.ACTIVE,
  },
  {
    id: "session-2",
    code: EXAMPLE_FLEET_SESSION_CODES[1],
    creator: "Commander Gamma",
    createdAt: new Date("2026-02-23T11:00:00Z"),
    participants: exampleParticipants2,
    logs: exampleLogs2,
    fightName: "Angel Cartel Mining Op Disruption",
    tags: ["angel cartel", "mining"],
    status: FLEET_SESSION_STATUSES.COMPLETED,
  },
];
