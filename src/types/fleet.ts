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
  status: "pending" | "ready" | "active" | "inactive";
  logId: string;
}

export interface EnemyStats {
  name: string;
  corp?: string;
  damageDealt: number;
  damageReceived: number;
  kills: number;
}

export interface FleetCombatAnalysis {
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalRepsGiven: number;
  participants: FleetParticipant[];
  enemies: EnemyStats[];
  fightDuration: number; // in seconds
}
