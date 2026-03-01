import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import type { FleetLog } from "@/types/fleet";
import { getDisplayNameForLog } from "@/lib/fleet/sessionStore";

describe("getDisplayNameForLog", () => {
  const uploadsRoot = join(process.cwd(), "data", "uploads");
  beforeAll(() => {
    try {
      mkdirSync(uploadsRoot, { recursive: true });
    } catch {}
    try {
      mkdirSync(join(process.cwd(), "data", "logs"), { recursive: true });
    } catch {}
  });

  afterAll(() => {
    try {
      rmSync(uploadsRoot, { recursive: true, force: true });
    } catch {}
    try {
      rmSync(join(process.cwd(), "data", "logs"), {
        recursive: true,
        force: true,
      });
    } catch {}
  });

  it("prefers explicit displayName", () => {
    const log = {
      id: "abc",
      sessionId: "s1",
      displayName: "My Fancy Log",
      pilotName: "Pilot One",
      shipType: "Megathron",
      logData: JSON.stringify({ characterName: "Char One" }),
    } as unknown as FleetLog;
    expect(getDisplayNameForLog(log)).toBe("My Fancy Log");
  });

  it("falls back to pilotName then characterName then shipType then upload filename then id", () => {
    const sessionId = "s2";
    const uploadsDir = join(process.cwd(), "data", "uploads", sessionId);
    mkdirSync(uploadsDir, { recursive: true });

    const logNoDisplay = {
      id: "def12345",
      sessionId,
      pilotName: "Pilot Two",
      shipType: "Raven",
      logData: JSON.stringify({ characterName: "Char Two" }),
    } as unknown as FleetLog;
    expect(getDisplayNameForLog(logNoDisplay)).toBe("Pilot Two");

    const logNoPilot = {
      id: "def12346",
      sessionId,
      shipType: "Raven",
      logData: JSON.stringify({ characterName: "Char Two" }),
    } as unknown as FleetLog;
    expect(getDisplayNameForLog(logNoPilot)).toBe("Char Two");

    const logNoChar = {
      id: "def12347",
      sessionId,
      shipType: "Raven",
      logData: "not-json",
    } as unknown as FleetLog;
    expect(getDisplayNameForLog(logNoChar)).toBe("Raven");

    // create an uploaded file to test filename pick
    writeFileSync(join(uploadsDir, "original.log"), "contents");
    const logWithFile = {
      id: "def12348",
      sessionId,
      logData: "",
    } as unknown as FleetLog;
    expect(getDisplayNameForLog(logWithFile)).toBe("original.log");

    // cleanup handled in afterAll
  });

  it("returns filename from data/logs/<sessionId>/ when present (canonical location)", () => {
    const sessionId = "s3-logs";
    const logsDir = join(process.cwd(), "data", "logs", sessionId);
    mkdirSync(logsDir, { recursive: true });
    writeFileSync(join(logsDir, "combat.txt"), "log content");

    const log = {
      id: "aaa00001",
      sessionId,
      logData: "",
    } as unknown as FleetLog;
    expect(getDisplayNameForLog(log)).toBe("combat.txt");
  });

  it("prefers data/logs/<sessionId>/ over data/uploads/<sessionId>/", () => {
    const sessionId = "s4-prefer-logs";
    const logsDir = join(process.cwd(), "data", "logs", sessionId);
    const uploadsDir = join(process.cwd(), "data", "uploads", sessionId);
    mkdirSync(logsDir, { recursive: true });
    mkdirSync(uploadsDir, { recursive: true });
    writeFileSync(join(logsDir, "from-logs.txt"), "canonical");
    writeFileSync(join(uploadsDir, "from-uploads.log"), "legacy");

    const log = {
      id: "bbb00001",
      sessionId,
      logData: "",
    } as unknown as FleetLog;
    // Should return the file from data/logs/ not data/uploads/
    expect(getDisplayNameForLog(log)).toBe("from-logs.txt");
  });
});
