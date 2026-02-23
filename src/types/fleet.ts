export type FleetSessionCode = string; // 6-character codes like "FLEET-ABC123"

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

export interface FleetLog {
  id: string;
  sessionId: string;
  pilotName: string;
  shipType: string;
  logData: string;
  uploadedAt: Date;
  pilotId: string;
}

export interface FleetParticipant {
  pilotName: string;
  shipType: string;
  damageDealt: number;
  damageTaken: number;
  repsGiven: number;
  repsTaken: number;
  status: "active" | "inactive";
  logId: string;
}

export interface FleetCombatAnalysis {
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalRepsGiven: number;
  participants: FleetParticipant[];
  enemies: string[];
  fightDuration: number; // in minutes
}
