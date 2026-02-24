/**
 * Session code used to identify a fleet session in URLs and APIs.
 *
 * Fields:
 * @property {string} value (required) Code string in the format "FLEET-XXXXXX".
 *
 * Required fields: value.
 * Optional fields: none.
 *
 * Imported by: `src/lib/fleet/sessionStore.ts`, `src/app/api/fleet-sessions/route.ts`.
 *
 * @example
 * ```ts
 * const code: FleetSessionCode = "FLEET-ABC123";
 * ```
 */
export type FleetSessionCode = string;

/**
 * Core fleet session record that ties participants and uploaded logs together.
 *
 * Fields:
 * @property {string} id (required) Unique session identifier.
 * @property {FleetSessionCode} code (required) Public-facing session code.
 * @property {string} creator (required) Pilot or user name who created the session.
 * @property {Date} createdAt (required) Timestamp for when the session was created.
 * @property {FleetParticipant[]} participants (required) Participants included in the session.
 * @property {FleetLog[]} logs (required) Uploaded logs tied to the session.
 * @property {string} fightName (optional) Human-friendly label for the fight.
 * @property {string[]} tags (required) Tags applied to the session for filtering.
 * @property {"PENDING" | "ACTIVE" | "COMPLETED" | "ARCHIVED"} status (required) Session lifecycle status.
 *
 * Required fields: id, code, creator, createdAt, participants, logs, tags, status.
 * Optional fields: fightName.
 *
 * Imported by: `src/contexts/FleetContext.tsx`, `src/app/fleet/page.tsx`,
 * `src/app/fleet/create/page.tsx`, `src/app/fleet/[sessionId]/page.tsx`,
 * `src/app/api/fleet-sessions/[id]/route.ts`, `src/components/fleet/FleetAnalysisTabs.tsx`,
 * `src/__tests__/components/fleet/FleetAnalysisTabs.test.tsx`,
 * `src/__tests__/components/fleet/integration.test.tsx`,
 * `src/__tests__/contexts/FleetContext.test.tsx`.
 *
 * @example
 * ```ts
 * const session: FleetSession = {
 *   id: "session_123",
 *   code: "FLEET-ABC123",
 *   creator: "Raze Darel",
 *   createdAt: new Date("2026-02-23T18:00:00Z"),
 *   participants: [],
 *   logs: [],
 *   tags: ["hq", "armor"],
 *   status: "PENDING",
 * };
 * ```
 */
export interface FleetSession {
  id: string;
  code: FleetSessionCode;
  creator: string;
  createdAt: Date;
  participants: FleetParticipant[];
  logs: FleetLog[];
  fightName?: string;
  tags: string[];
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
}

/**
 * Raw log upload associated with a fleet session and a specific pilot.
 *
 * Fields:
 * @property {string} id (required) Unique log identifier.
 * @property {string} sessionId (required) Session identifier the log belongs to.
 * @property {string} pilotName (required) Character name associated with the log.
 * @property {string} shipType (required) Ship name reported in the log.
 * @property {string} logData (required) Raw log file contents as a string.
 * @property {Date} uploadedAt (required) Timestamp for when the log was uploaded.
 * @property {string} pilotId (required) Stable pilot identifier from the session roster.
 *
 * Required fields: id, sessionId, pilotName, shipType, logData, uploadedAt, pilotId.
 * Optional fields: none.
 *
 * Imported by: `src/contexts/FleetContext.tsx`, `src/app/fleet/[sessionId]/page.tsx`,
 * `src/app/api/fleet-sessions/[id]/route.ts`, `src/app/api/fleet-sessions/[id]/upload/route.ts`,
 * `src/__tests__/contexts/FleetContext.test.tsx`.
 *
 * @example
 * ```ts
 * const log: FleetLog = {
 *   id: "log_456",
 *   sessionId: "session_123",
 *   pilotName: "Raze Darel",
 *   shipType: "Megathron",
 *   logData: "[ 2026.02.23 18:02:14 ] (combat) ...",
 *   uploadedAt: new Date("2026-02-23T18:05:00Z"),
 *   pilotId: "pilot_razedarel",
 * };
 * ```
 */
export interface FleetLog {
  id: string;
  sessionId: string;
  pilotName: string;
  shipType: string;
  logData: string;
  uploadedAt: Date;
  pilotId: string;
}

/**
 * Aggregated participant metrics used in fleet analysis and UI summaries.
 *
 * Fields:
 * @property {string} pilotName (required) Character name for the participant.
 * @property {string} shipType (required) Ship the participant flew.
 * @property {number} damageDealt (required) Total damage dealt by the participant.
 * @property {number} damageTaken (required) Total damage received by the participant.
 * @property {number} repsGiven (required) Total remote repairs applied by the participant.
 * @property {number} repsTaken (required) Total remote repairs received by the participant.
 * @property {"pending" | "ready" | "active" | "inactive"} status (required) Readiness or activity state.
 * @property {string} logId (required) Identifier of the participant log upload.
 *
 * Required fields: pilotName, shipType, damageDealt, damageTaken, repsGiven, repsTaken, status, logId.
 * Optional fields: none.
 *
 * Imported by: `src/lib/fleet/fleetAnalysis.ts`, `src/lib/fleet/participantStats.ts`,
 * `src/lib/fleet/constants.ts`, `src/contexts/FleetContext.tsx`,
 * `src/components/fleet/FleetParticipantsTable.tsx`, `src/components/fleet/FleetOverviewTab.tsx`,
 * `src/app/fleet/[sessionId]/page.tsx`, `src/app/api/fleet-sessions/[id]/route.ts`,
 * `src/app/api/fleet-sessions/[id]/join/route.ts`,
 * `src/__tests__/components/fleet/FleetParticipantsTable.test.tsx`,
 * `src/__tests__/contexts/FleetContext.test.tsx`, `src/__tests__/fleet/integration.test.ts`,
 * `src/__tests__/lib/fleet/fleetAnalysis.test.ts`, `src/__tests__/lib/fleet/participantStats.test.ts`,
 * `src/__tests__/fleet/data-consistency.test.ts`, `src/__tests__/types/fleet.test.ts`.
 *
 * @example
 * ```ts
 * const participant: FleetParticipant = {
 *   pilotName: "Raze Darel",
 *   shipType: "Megathron",
 *   damageDealt: 4200,
 *   damageTaken: 900,
 *   repsGiven: 1200,
 *   repsTaken: 450,
 *   status: "active",
 *   logId: "log_456",
 * };
 * ```
 */
export interface FleetParticipant {
  pilotName: string;
  shipType: string;
  damageDealt: number;
  damageTaken: number;
  repsGiven: number;
  repsTaken: number;
  status: "pending" | "ready" | "active" | "inactive";
  logId: string;
}

/**
 * Aggregate enemy combat statistics for summary tables.
 *
 * Fields:
 * @property {string} name (required) Enemy pilot name.
 * @property {string} corp (optional) Enemy corporation ticker or name.
 * @property {number} damageDealt (required) Damage dealt by the enemy to the fleet.
 * @property {number} damageReceived (required) Damage received by the enemy.
 * @property {number} kills (required) Count of kills attributed to the enemy.
 *
 * Required fields: name, damageDealt, damageReceived, kills.
 * Optional fields: corp.
 *
 * Imported by: `src/components/fleet/FleetEnemiesTable.tsx`,
 * `src/__tests__/components/fleet/FleetEnemiesTable.test.tsx`.
 *
 * @example
 * ```ts
 * const enemy: EnemyStats = {
 *   name: "Hostile Vex",
 *   corp: "BAD",
 *   damageDealt: 1800,
 *   damageReceived: 900,
 *   kills: 1,
 * };
 * ```
 */
export interface EnemyStats {
  name: string;
  corp?: string;
  damageDealt: number;
  damageReceived: number;
  kills: number;
}

/**
 * High-level fleet combat rollup produced by analysis helpers.
 *
 * Fields:
 * @property {number} totalDamageDealt (required) Sum of damage dealt by all participants.
 * @property {number} totalDamageTaken (required) Sum of damage received by all participants.
 * @property {number} totalRepsGiven (required) Sum of repairs given by all participants.
 * @property {FleetParticipant[]} participants (required) Participant rollups.
 * @property {EnemyStats[]} enemies (required) Enemy rollups.
 * @property {number} fightDuration (required) Duration of the fight in seconds.
 *
 * Required fields: totalDamageDealt, totalDamageTaken, totalRepsGiven, participants, enemies, fightDuration.
 * Optional fields: none.
 *
 * Imported by: `src/components/fleet/FleetOverviewTab.tsx`,
 * `src/components/fleet/FleetAnalysisTabs.tsx`,
 * `src/__tests__/components/fleet/FleetOverviewTab.test.tsx`.
 *
 * @example
 * ```ts
 * const analysis: FleetCombatAnalysis = {
 *   totalDamageDealt: 9000,
 *   totalDamageTaken: 4100,
 *   totalRepsGiven: 2200,
 *   participants: [],
 *   enemies: [],
 *   fightDuration: 780,
 * };
 * ```
 */
export interface FleetCombatAnalysis {
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalRepsGiven: number;
  participants: FleetParticipant[];
  enemies: EnemyStats[];
  fightDuration: number;
}
