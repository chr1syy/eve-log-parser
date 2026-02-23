// In-memory session storage for fleet sessions
// TODO: Replace with persistent storage (database) in production

import type { FleetSession, FleetSessionCode } from "@/types/fleet";

const sessionStore = new Map<string, FleetSession>();

function generateUniqueCode(): FleetSessionCode {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code: string;
  do {
    code = "FLEET-";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (Array.from(sessionStore.values()).some((s) => s.code === code));
  return code as FleetSessionCode;
}

export function createSession(
  fightName?: string,
  tags: string[] = [],
): FleetSession {
  const { randomUUID } = require("crypto"); // Node.js crypto
  const id = randomUUID();
  const code = generateUniqueCode();
  const creator = "anonymous"; // TODO: Get from auth context
  const createdAt = new Date();

  const session: FleetSession = {
    id,
    code,
    creator,
    createdAt,
    participants: [],
    logs: [],
    fightName,
    tags,
    status: "PENDING",
  };

  sessionStore.set(id, session);
  return session;
}

export function getSession(id: string): FleetSession | undefined {
  return sessionStore.get(id);
}

export function updateSession(
  id: string,
  updates: Partial<FleetSession>,
): FleetSession | null {
  const session = sessionStore.get(id);
  if (!session) return null;

  const updatedSession = { ...session, ...updates };
  sessionStore.set(id, updatedSession);
  return updatedSession;
}

export function deleteSession(id: string): boolean {
  return sessionStore.delete(id);
}

export function listUserSessions(): FleetSession[] {
  // TODO: Filter by user when auth is implemented
  return Array.from(sessionStore.values());
}

// Export the store for direct access if needed
export { sessionStore };
