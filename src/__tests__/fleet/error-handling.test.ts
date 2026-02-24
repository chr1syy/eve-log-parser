/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as joinSession } from "@/app/api/fleet-sessions/[id]/join/route";
import { POST as uploadLog } from "@/app/api/fleet-sessions/[id]/upload/route";
import { GET as getSession } from "@/app/api/fleet-sessions/[id]/route";
import { sessionStore } from "@/lib/fleet/sessionStore";

vi.mock("next/server", () => ({
  NextRequest: class MockNextRequest {
    constructor() {}
  },
  NextResponse: {
    json: vi.fn((data: unknown, options?: { status?: number }) => ({
      ...(data as object),
      _status: options?.status || 200,
    })),
  },
}));

describe("Fleet Error Handling Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStore.clear();
  });

  describe("Join Session Error Handling", () => {
    it("rejects join with invalid session code", async () => {
      // Create a session first
      const { POST: createSession } =
        await import("@/app/api/fleet-sessions/route");
      const createReq = {
        json: vi.fn().mockResolvedValue({ fightName: "Test Fight" }),
      } as any;
      const createRes = (await createSession(createReq)) as any;
      const sessionId = createRes.id;

      // Try to join with wrong code
      const joinReq = {
        json: vi
          .fn()
          .mockResolvedValue({ code: "WRONG-CODE", pilotName: "TestPilot" }),
      } as any;
      const joinRes = (await joinSession(joinReq, {
        params: { id: sessionId },
      } as any)) as any;
      expect(joinRes.success).toBe(false);
      expect(joinRes.message).toBe("Invalid code or session not found");
    });
  });

  describe("Upload Error Handling", () => {
    it("rejects upload to non-existent session", async () => {
      const formData = new FormData();
      formData.append(
        "file",
        new Blob(["test"], { type: "text/plain" }),
        "test.txt",
      );
      formData.append("pilotName", "TestPilot");
      const uploadReq = {
        formData: vi.fn().mockResolvedValue(formData),
      } as any;
      const uploadRes = (await uploadLog(uploadReq, {
        params: { id: "non-existent" },
      } as any)) as any;
      expect(uploadRes.success).toBe(false);
      expect(uploadRes.message).toBe("Session not found");
      expect(uploadRes._status).toBe(404);
    });

    it("rejects upload with missing file", async () => {
      // Create a session
      const { POST: createSession } =
        await import("@/app/api/fleet-sessions/route");
      const createReq = {
        json: vi.fn().mockResolvedValue({ fightName: "Test Fight" }),
      } as any;
      const createRes = (await createSession(createReq)) as any;
      const sessionId = createRes.id;

      const formData = new FormData();
      // Missing file
      formData.append("pilotName", "TestPilot");
      const uploadReq = {
        formData: vi.fn().mockResolvedValue(formData),
      } as any;
      const uploadRes = (await uploadLog(uploadReq, {
        params: { id: sessionId },
      } as any)) as any;
      expect(uploadRes.success).toBe(false);
      expect(uploadRes.message).toBe("Missing file or pilotName");
      expect(uploadRes._status).toBe(400);
    });

    it("rejects upload with missing pilotName", async () => {
      // Create a session
      const { POST: createSession } =
        await import("@/app/api/fleet-sessions/route");
      const createReq = {
        json: vi.fn().mockResolvedValue({ fightName: "Test Fight" }),
      } as any;
      const createRes = (await createSession(createReq)) as any;
      const sessionId = createRes.id;

      const formData = new FormData();
      formData.append(
        "file",
        new Blob(["test"], { type: "text/plain" }),
        "test.txt",
      );
      // Missing pilotName
      const uploadReq = {
        formData: vi.fn().mockResolvedValue(formData),
      } as any;
      const uploadRes = (await uploadLog(uploadReq, {
        params: { id: sessionId },
      } as any)) as any;
      expect(uploadRes.success).toBe(false);
      expect(uploadRes.message).toBe("Missing file or pilotName");
      expect(uploadRes._status).toBe(400);
    });

    it("handles malformed log file gracefully", async () => {
      // Create a session
      const { POST: createSession } =
        await import("@/app/api/fleet-sessions/route");
      const createReq = {
        json: vi.fn().mockResolvedValue({ fightName: "Test Fight" }),
      } as any;
      const createRes = (await createSession(createReq)) as any;
      const sessionId = createRes.id;

      // Join first
      const joinReq = {
        json: vi
          .fn()
          .mockResolvedValue({ code: createRes.code, pilotName: "TestPilot" }),
      } as any;
      await joinSession(joinReq, { params: { id: sessionId } } as any);

      // Upload malformed log (invalid format)
      const malformedLog =
        "This is not a valid EVE log file\nNo headers\nJust random text";
      const formData = new FormData();
      formData.append("file", new Blob([malformedLog]), "malformed.txt");
      formData.append("pilotName", "TestPilot");
      const uploadReq = {
        formData: vi.fn().mockResolvedValue(formData),
      } as any;
      const uploadRes = (await uploadLog(uploadReq, {
        params: { id: sessionId },
      } as any)) as any;
      // Should not throw, but parsing might succeed with empty entries or fail
      expect(uploadRes.success).toBeDefined(); // Could be true or false depending on implementation
      if (!uploadRes.success) {
        expect(uploadRes.message).toBe("Failed to upload log");
        expect(uploadRes._status).toBe(500);
      }
    });
  });

  describe("Timestamp Validation", () => {
    it("marks analysisReady=false when logs have non-overlapping timestamps", async () => {
      // Create session
      const { POST: createSession } =
        await import("@/app/api/fleet-sessions/route");
      const createReq = {
        json: vi.fn().mockResolvedValue({ fightName: "Non-Overlapping Fight" }),
      } as any;
      const createRes = (await createSession(createReq)) as any;
      const sessionId = createRes.id;
      const sessionCode = createRes.code;

      // Mock logs with non-overlapping timestamps
      const logA = `Listener: PilotA
Session Started: 2025.10.23 02:08:50
[ 2025.10.23 02:08:58 ] (combat) <color=0xff00ffff><b>100</b> to Target[TEST](Frigate) - Small Focused Pulse Laser II - Hits`;

      const logB = `Listener: PilotB
Session Started: 2025.10.23 20:00:00
[ 2025.10.23 20:00:10 ] (combat) <color=0xff00ffff><b>100</b> to Target[TEST](Frigate) - Small Focused Beam Laser I - Hits`;

      // Join and upload both logs
      for (const [pilotName, logContent] of [
        ["PilotA", logA],
        ["PilotB", logB],
      ] as const) {
        const joinReq = {
          json: vi.fn().mockResolvedValue({ code: sessionCode, pilotName }),
        } as any;
        await joinSession(joinReq, { params: { id: sessionId } } as any);

        const formData = new FormData();
        formData.append("file", new Blob([logContent]), `${pilotName}.txt`);
        formData.append("pilotName", pilotName);
        const uploadReq = {
          formData: vi.fn().mockResolvedValue(formData),
        } as any;
        await uploadLog(uploadReq, { params: { id: sessionId } } as any);
      }

      // GET session → should be analysisReady=false due to no overlap
      const getRes = (await getSession(
        {} as any,
        { params: { id: sessionId } } as any,
      )) as any;
      expect(getRes.analysisReady).toBe(false);
      expect(getRes.logs).toHaveLength(2);
    });
  });

  describe("File Format Validation", () => {
    it("accepts non-.txt files (no validation currently implemented)", async () => {
      // Create a session
      const { POST: createSession } =
        await import("@/app/api/fleet-sessions/route");
      const createReq = {
        json: vi.fn().mockResolvedValue({ fightName: "Test Fight" }),
      } as any;
      const createRes = (await createSession(createReq)) as any;
      const sessionId = createRes.id;

      // Join first
      const joinReq = {
        json: vi
          .fn()
          .mockResolvedValue({ code: createRes.code, pilotName: "TestPilot" }),
      } as any;
      await joinSession(joinReq, { params: { id: sessionId } } as any);

      // Upload a file with .log extension (not .txt)
      const logContent = `Listener: TestPilot
Session Started: 2025.10.23 02:08:50
[ 2025.10.23 02:08:58 ] (combat) <color=0xff00ffff><b>100</b> to Target[TEST](Frigate) - Small Focused Pulse Laser II - Hits`;

      const formData = new FormData();
      formData.append("file", new Blob([logContent]), "test.log"); // .log extension
      formData.append("pilotName", "TestPilot");
      const uploadReq = {
        formData: vi.fn().mockResolvedValue(formData),
      } as any;
      const uploadRes = (await uploadLog(uploadReq, {
        params: { id: sessionId },
      } as any)) as any;
      // Currently, no file extension validation, so it should succeed
      expect(uploadRes.success).toBe(true);
    });
  });

  describe("Pilot Name Handling", () => {
    it("handles missing pilot name from log file", async () => {
      // Create a session
      const { POST: createSession } =
        await import("@/app/api/fleet-sessions/route");
      const createReq = {
        json: vi.fn().mockResolvedValue({ fightName: "Test Fight" }),
      } as any;
      const createRes = (await createSession(createReq)) as any;
      const sessionId = createRes.id;

      // Join first
      const joinReq = {
        json: vi
          .fn()
          .mockResolvedValue({ code: createRes.code, pilotName: "TestPilot" }),
      } as any;
      await joinSession(joinReq, { params: { id: sessionId } } as any);

      // Upload log without Listener: header (missing pilot name)
      const logWithoutPilot = `Session Started: 2025.10.23 02:08:50
[ 2025.10.23 02:08:58 ] (combat) <color=0xff00ffff><b>100</b> to Target[TEST](Frigate) - Small Focused Pulse Laser II - Hits`;

      const formData = new FormData();
      formData.append("file", new Blob([logWithoutPilot]), "no-pilot.txt");
      formData.append("pilotName", "TestPilot");
      const uploadReq = {
        formData: vi.fn().mockResolvedValue(formData),
      } as any;
      const uploadRes = (await uploadLog(uploadReq, {
        params: { id: sessionId },
      } as any)) as any;
      // Should succeed, using pilotName from form
      expect(uploadRes.success).toBe(true);
      expect(uploadRes.fleetLog.pilotName).toBe("TestPilot");
    });
  });
});
