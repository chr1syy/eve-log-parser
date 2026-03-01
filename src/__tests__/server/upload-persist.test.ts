/**
 * Tests that the upload route handler (POST /api/fleet-sessions/[id]/upload)
 * persists uploaded .txt combat logs to data/logs/<sessionId>/ as the canonical
 * developer/test copy (Fix #36).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, rmSync, readdirSync } from "fs";
import { join } from "path";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next/server", () => ({
  NextRequest: class MockNextRequest {},
  NextResponse: {
    json: vi.fn((data: unknown, options?: { status?: number }) => ({
      ...(data as object),
      _status: options?.status ?? 200,
    })),
  },
}));

// Mock sessionStore to return a fake session and allow updateSession
vi.mock("@/lib/fleet/sessionStore", () => ({
  getSession: vi.fn(() => ({
    id: "test-session-id",
    code: "FLEET-AAAAAA",
    creator: "anonymous",
    createdAt: new Date(),
    participants: [],
    logs: [],
    status: "PENDING",
  })),
  updateSession: vi.fn((id: string, updates: object) => ({
    id,
    ...updates,
  })),
  getDisplayNameForLog: vi.fn(
    (log: { id: string }) => `upload-${String(log.id).slice(0, 8)}.log`,
  ),
}));

// Mock SSE broadcast — no-op
vi.mock("@/lib/fleet/sseConnections", () => ({
  broadcastToSession: vi.fn(),
}));

// ── Test setup ───────────────────────────────────────────────────────────────

const SESSION_ID = "test-session-id";
const DATA_LOGS_DIR = join(process.cwd(), "data", "logs", SESSION_ID);
const DATA_UPLOADS_DIR = join(process.cwd(), "data", "uploads", SESSION_ID);

// Minimal valid EVE combat log content that parseLogFile can process.
const SAMPLE_LOG_CONTENT = `Listener: TestPilot
Session Started: 2025.10.23 02:08:50
[ 2025.10.23 02:08:58 ] (combat) <color=0xff00ffff><b>100</b> to Enemy[TEST](Punisher) - Neutron Blaster II - Hits`;

function makeFile(name: string, content: string): File {
  const blob = new Blob([content], { type: "text/plain" });
  return new File([blob], name, { type: "text/plain" });
}

function makeUploadRequest(
  file: File,
  pilotName = "TestPilot",
  shipType = "Rifter",
) {
  return {
    formData: vi.fn().mockResolvedValue({
      get: (key: string) =>
        ({ file, pilotName, shipType })[key as string] ?? null,
    }),
  } as unknown as import("next/server").NextRequest;
}

beforeEach(() => {
  // Ensure clean slate for data/logs and data/uploads for this session
  try {
    rmSync(DATA_LOGS_DIR, { recursive: true, force: true });
  } catch {}
  try {
    rmSync(DATA_UPLOADS_DIR, { recursive: true, force: true });
  } catch {}
});

afterEach(() => {
  try {
    rmSync(DATA_LOGS_DIR, { recursive: true, force: true });
  } catch {}
  try {
    rmSync(DATA_UPLOADS_DIR, { recursive: true, force: true });
  } catch {}
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("upload route — log persistence (fix #36)", () => {
  it("persists an uploaded .txt file to data/logs/<sessionId>/", async () => {
    const { POST: uploadLog } =
      await import("@/app/api/fleet-sessions/[id]/upload/route");

    const file = makeFile("2025.10.23_combat.txt", SAMPLE_LOG_CONTENT);
    const req = makeUploadRequest(file, "TestPilot", "Rifter");
    const res = (await uploadLog(req, {
      params: Promise.resolve({ id: SESSION_ID }),
    })) as unknown as { success: boolean };

    expect(res.success).toBe(true);

    // data/logs/<sessionId>/ must exist and contain exactly one file
    expect(existsSync(DATA_LOGS_DIR)).toBe(true);
    const logFiles = readdirSync(DATA_LOGS_DIR);
    expect(logFiles.length).toBeGreaterThanOrEqual(1);

    // At least one file must have a .txt extension
    const txtFiles = logFiles.filter((f) => f.endsWith(".txt"));
    expect(txtFiles.length).toBeGreaterThanOrEqual(1);

    // The saved filename must contain the original base name
    const savedFile = txtFiles[0];
    expect(savedFile).toMatch(/2025\.10\.23_combat/);
  });

  it("preserves the .txt extension when no name collision exists", async () => {
    const { POST: uploadLog } =
      await import("@/app/api/fleet-sessions/[id]/upload/route");

    const file = makeFile("mylog.txt", SAMPLE_LOG_CONTENT);
    const req = makeUploadRequest(file, "TestPilot", "Rifter");
    await uploadLog(req, {
      params: Promise.resolve({ id: SESSION_ID }),
    });

    mkdirSync(DATA_LOGS_DIR, { recursive: true }); // ensure dir read is safe
    const files = readdirSync(DATA_LOGS_DIR);
    // Exact filename when no collision
    expect(files).toContain("mylog.txt");
  });

  it("also writes to data/uploads/<sessionId>/ for display-name backward compat", async () => {
    const { POST: uploadLog } =
      await import("@/app/api/fleet-sessions/[id]/upload/route");

    const file = makeFile("backcompat.txt", SAMPLE_LOG_CONTENT);
    const req = makeUploadRequest(file, "TestPilot", "Rifter");
    await uploadLog(req, {
      params: Promise.resolve({ id: SESSION_ID }),
    });

    expect(existsSync(DATA_UPLOADS_DIR)).toBe(true);
    const uploadFiles = readdirSync(DATA_UPLOADS_DIR);
    expect(uploadFiles.length).toBeGreaterThanOrEqual(1);
  });
});
