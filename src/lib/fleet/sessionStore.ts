// Session storage for fleet sessions.
// Persisted to disk as JSON so sessions survive server restarts.
// The global variable pattern also survives Next.js HMR module re-evaluation.

import { randomUUID } from "crypto";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
} from "fs";
import { join } from "path";
import type { FleetSession, FleetLog, FleetSessionCode } from "@/types/fleet";
// Note: avoid duplicate fs imports

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
          uploadedAt: new Date(
            (log as unknown as { uploadedAt: string }).uploadedAt,
          ),
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
  global.__fleetSessionStore ?? (global.__fleetSessionStore = loadFromDisk());

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

export function updateLogMetadata(
  sessionId: string,
  logId: string,
  updates: Partial<Pick<FleetLog, "displayName" | "pilotName" | "shipType">>,
): FleetLog | null {
  const session = sessionStore.get(sessionId);
  if (!session) return null;

  const idx = session.logs.findIndex((l) => l.id === logId);
  if (idx === -1) return null;

  const existing = session.logs[idx];
  const updated: FleetLog = { ...existing, ...updates };
  // Ensure uploadedAt remains unchanged
  updated.uploadedAt = existing.uploadedAt;

  const newLogs = [...session.logs];
  newLogs[idx] = updated;

  const updatedSession: FleetSession = { ...session, logs: newLogs };
  sessionStore.set(sessionId, updatedSession);
  saveToDisk(sessionStore);
  return updated;
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

// Helper: derive a human-friendly display name for a FleetLog.
// Order of preference: explicit displayName -> pilotName -> parsed log.characterName -> shipType
// -> original uploaded filename in data/logs/<sessionId> (most-recent) then data/uploads/<sessionId>
// -> upload-<short-id>.log
export function getDisplayNameForLog(log: FleetLog): string {
  if (!log)
    return `upload-${(Math.random() + 1).toString(36).substring(7)}.log`;

  if (log.displayName && String(log.displayName).trim().length > 0) {
    return String(log.displayName).trim();
  }

  if (log.pilotName && String(log.pilotName).trim().length > 0) {
    return String(log.pilotName).trim();
  }

  // Try to parse characterName from log.logData (stored as JSON string of ParsedLog)
  try {
    if (log.logData) {
      const parsed = JSON.parse(log.logData) as { characterName?: string };
      if (
        parsed?.characterName &&
        String(parsed.characterName).trim().length > 0
      ) {
        return String(parsed.characterName).trim();
      }
    }
  } catch {
    // ignore parse errors
  }

  if (log.shipType && String(log.shipType).trim().length > 0) {
    return String(log.shipType).trim();
  }

  // Probe data/logs/<sessionId>/ first (canonical location), then data/uploads/<sessionId>/ for
  // backward compatibility with sessions created before Phase 01 of fix #36.
  // Helper: return the most-recently-modified filename from a directory, or null.
  const pickLatestFile = (dir: string): string | null => {
    try {
      if (!existsSync(dir)) return null;
      const files = readdirSync(dir).filter((f: string) => {
        try {
          return statSync(join(dir, f)).isFile();
        } catch {
          return false;
        }
      });
      if (files.length === 0) return null;
      if (files.length === 1) return files[0];
      let latest = files[0];
      let latestTime = 0;
      for (const f of files) {
        try {
          const mtime = statSync(join(dir, f)).mtime.getTime();
          if (mtime > latestTime) {
            latestTime = mtime;
            latest = f;
          }
        } catch {
          // ignore
        }
      }
      return latest;
    } catch {
      return null;
    }
  };

  const logsDir = join(process.cwd(), "data", "logs", log.sessionId);
  const uploadsDir = join(process.cwd(), "data", "uploads", log.sessionId);
  const filenameFromLogs = pickLatestFile(logsDir);
  if (filenameFromLogs) return filenameFromLogs;
  const filenameFromUploads = pickLatestFile(uploadsDir);
  if (filenameFromUploads) return filenameFromUploads;

  // final fallback
  return `upload-${String(log.id).slice(0, 8)}.log`;
}
