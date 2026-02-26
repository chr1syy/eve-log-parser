import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { join } from "path";
import { writeFileSync, rmSync, existsSync } from "fs";
import {
  createSession,
  updateSession,
  updateLogMetadata,
  getSession,
  deleteSession,
} from "@/lib/fleet/sessionStore";

const STORE_FILE = join(process.cwd(), ".fleet-sessions.json");

describe("updateLogMetadata", () => {
  beforeAll(() => {
    // Ensure a clean on-disk store for predictable behavior.
    try {
      if (existsSync(STORE_FILE)) rmSync(STORE_FILE);
    } catch {}
  });

  afterAll(() => {
    // Cleanup any persisted store created by the tests.
    try {
      if (existsSync(STORE_FILE)) rmSync(STORE_FILE);
    } catch {}
  });

  it("updates an existing log's metadata and preserves uploadedAt", () => {
    const session = createSession("test-fight");

    const originalUploaded = new Date();
    const log = {
      id: "log-123",
      sessionId: session.id,
      pilotName: "Orig Pilot",
      shipType: "Raven",
      logData: "",
      uploadedAt: originalUploaded,
      pilotId: "pilot-1",
    } as any;

    // Attach the log to the session
    updateSession(session.id, { logs: [log] });

    const updated = updateLogMetadata(session.id, log.id, {
      displayName: "Renamed Log",
      pilotName: "New Pilot",
    });

    expect(updated).not.toBeNull();
    expect(updated?.displayName).toBe("Renamed Log");
    expect(updated?.pilotName).toBe("New Pilot");
    // uploadedAt must remain unchanged
    expect(new Date(updated!.uploadedAt).getTime()).toBe(
      originalUploaded.getTime(),
    );

    // Ensure session in store reflects update
    const reloaded = getSession(session.id)!;
    const storedLog = reloaded.logs.find((l) => l.id === log.id)!;
    expect(storedLog.displayName).toBe("Renamed Log");

    // cleanup
    deleteSession(session.id);
  });

  it("returns null when session or log not found", () => {
    const missingSession = updateLogMetadata("no-session", "no-log", {
      displayName: "x",
    });
    expect(missingSession).toBeNull();

    const session = createSession("another");
    // no logs attached
    const missingLog = updateLogMetadata(session.id, "no-log", {
      displayName: "x",
    });
    expect(missingLog).toBeNull();
    deleteSession(session.id);
  });
});
