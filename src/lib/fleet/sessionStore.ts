// Session storage for fleet sessions.
// Persisted to disk as JSON so sessions survive server restarts.
// The global variable pattern also survives Next.js HMR module re-evaluation.

import { randomUUID } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import type { FleetSession, FleetLog, FleetSessionCode } from "@/types/fleet";

// ── Persistence ───────────────────────────────────────────────────────────────

const STORE_FILE = join(process.cwd(), ".fleet-sessions.json");

function loadFromDisk(): Map<string, FleetSession> {
  try {
    if (!existsSync(STORE_FILE)) return new Map();
    const raw = JSON.parse(readFileSync(STORE_FILE, "utf-8")) as Record<
      string,
      unknown
    >;
    const map = new Map<string, FleetSession>();
    for (const [id, session] of Object.entries(raw)) {
      const s = session as FleetSession & { createdAt: string };
      map.set(id, {
        ...s,
        createdAt: new Date(s.createdAt),
        logs: (s.logs ?? []).map((log) => ({
          ...(log as FleetLog & { uploadedAt: string }),
          uploadedAt: new Date((log as unknown as { uploadedAt: string }).uploadedAt),
        })),
      });
    }
    return map;
  } catch {
    return new Map();
  }
}

function saveToDisk(store: Map<string, FleetSession>): void {
  try {
    writeFileSync(
      STORE_FILE,
      JSON.stringify(Object.fromEntries(store.entries()), null, 2),
      "utf-8",
    );
  } catch {
    // Non-fatal — session still lives in memory for this process lifetime
  }
}

// ── Singleton store ───────────────────────────────────────────────────────────

declare global {
  var __fleetSessionStore: Map<string, FleetSession> | undefined;
}

// On first evaluation: load from disk. On HMR re-evaluation: reuse existing Map.
const sessionStore: Map<string, FleetSession> =
  global.__fleetSessionStore ??
  (global.__fleetSessionStore = loadFromDisk());

// ── Code generator ────────────────────────────────────────────────────────────

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

// ── Public API ────────────────────────────────────────────────────────────────

export function createSession(
  fightName?: string,
  tags: string[] = [],
): FleetSession {
  const id = randomUUID();
  const code = generateUniqueCode();
  const creator = "anonymous";
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
  saveToDisk(sessionStore);
  return session;
}

export function getSession(id: string): FleetSession | undefined {
  return sessionStore.get(id);
}

export function findSessionByCode(code: string): FleetSession | undefined {
  const normalized = code.trim().toUpperCase();
  return Array.from(sessionStore.values()).find(
    (session) => session.code.toUpperCase() === normalized,
  );
}

export function updateSession(
  id: string,
  updates: Partial<FleetSession>,
): FleetSession | null {
  const session = sessionStore.get(id);
  if (!session) return null;

  const updatedSession = { ...session, ...updates };
  sessionStore.set(id, updatedSession);
  saveToDisk(sessionStore);
  return updatedSession;
}

export function deleteSession(id: string): boolean {
  const deleted = sessionStore.delete(id);
  if (deleted) saveToDisk(sessionStore);
  return deleted;
}

export function listUserSessions(): FleetSession[] {
  return Array.from(sessionStore.values());
}

export { sessionStore };
