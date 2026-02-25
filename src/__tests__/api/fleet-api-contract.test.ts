/* eslint-disable @typescript-eslint/no-explicit-any */
vi.mock("next/server", () => ({
  NextRequest: class MockNextRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      return { json: vi.fn().mockResolvedValue(init?.body || {}) } as any;
    }
  },
  NextResponse: {
    json: vi.fn((data) => data),
  },
}));

vi.mock("@/lib/fleet/sessionStore", () => ({
  createSession: vi.fn(),
  listUserSessions: vi.fn(),
  getSession: vi.fn(),
  updateSession: vi.fn(),
  sessionStore: { clear: vi.fn() },
}));

vi.mock("@/lib/parser", () => ({
  parseLogFile: vi.fn(),
}));

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  POST as createSession,
  GET as listSessions,
} from "@/app/api/fleet-sessions/route";
import { POST as joinSession } from "@/app/api/fleet-sessions/[id]/join/route";
import { POST as uploadLog } from "@/app/api/fleet-sessions/[id]/upload/route";
import { GET as getSession } from "@/app/api/fleet-sessions/[id]/route";
import {
  createSession as createSessionStore,
  getSession as getSessionStore,
  listUserSessions,
  updateSession,
  sessionStore,
} from "@/lib/fleet/sessionStore";
import { parseLogFile } from "@/lib/parser";
import type { FleetSession } from "@/types/fleet";

const createSessionStoreMock = vi.mocked(createSessionStore);
const getSessionStoreMock = vi.mocked(getSessionStore);
const listUserSessionsMock = vi.mocked(listUserSessions);
const updateSessionMock = vi.mocked(updateSession);
const parseLogFileMock = vi.mocked(parseLogFile);

describe("API Contract Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the session store
    sessionStore.clear();
  });

  describe("POST /api/fleet-sessions", () => {
    it("returns { id, code, createdAt, creator }", async () => {
      const session: FleetSession = {
        id: "test-id",
        code: "FLEET-123456",
        createdAt: new Date(),
        creator: "test-creator",
        participants: [],
        logs: [],
        tags: [],
        status: "ACTIVE",
      };
      createSessionStoreMock.mockReturnValue(session as any);

      const mockRequest = {
        json: vi
          .fn()
          .mockResolvedValue({ fightName: "Test Fight", tags: ["tag1"] }),
      } as any;

      const response = await createSession(mockRequest);

      expect((response as any).id).toBeDefined();
      expect(typeof (response as any).id).toBe("string");
      expect((response as any).code).toBeDefined();
      expect(typeof (response as any).code).toBe("string");
      expect((response as any).code).toMatch(/^FLEET-[A-Z0-9]{6}$/);
      expect((response as any).createdAt).toBeInstanceOf(Date);
      expect((response as any).creator).toBeDefined();
      expect(typeof (response as any).creator).toBe("string");
    });

    it("handles 500 error on server error", async () => {
      // Mock request.json to throw error
      const mockRequest = {
        json: vi.fn().mockRejectedValue(new Error("Parse error")),
      } as any;

      const response = await createSession(mockRequest);

      expect((response as any).error).toBe("Failed to create session");
    });
  });

  describe("GET /api/fleet-sessions", () => {
    it("returns array of FleetSession with correct structure", async () => {
      const session: FleetSession = {
        id: "test-id",
        code: "FLEET-123456",
        createdAt: new Date(),
        creator: "test-creator",
        participants: [],
        logs: [],
        fightName: "Test Fight",
        tags: ["tag"],
        status: "ACTIVE",
      };
      listUserSessionsMock.mockReturnValue([session]);

      const response = await listSessions();

      expect(Array.isArray(response)).toBe(true);
      expect((response as any).length).toBe(1);

      const sessionItem = (response as any)[0];
      expect(sessionItem).toHaveProperty("id");
      expect(sessionItem).toHaveProperty("code");
      expect(sessionItem).toHaveProperty("creator");
      expect(sessionItem).toHaveProperty("createdAt");
      expect(sessionItem).toHaveProperty("participants");
      expect(sessionItem).toHaveProperty("logs");
      expect(sessionItem).toHaveProperty("fightName");
      expect(sessionItem).toHaveProperty("tags");
      expect(sessionItem).toHaveProperty("status");
      expect(sessionItem).toHaveProperty("participantCount");
      expect(typeof sessionItem.participantCount).toBe("number");
      expect(sessionItem).toHaveProperty("logCount");
      expect(typeof sessionItem.logCount).toBe("number");
    });

    it("handles 500 error on server error", async () => {
      listUserSessionsMock.mockImplementation(() => {
        throw new Error("Database error");
      });

      const response = await listSessions();

      expect((response as any).error).toBe("Failed to list sessions");
    });
  });

  describe("POST /api/fleet-sessions/[id]/upload", () => {
    let sessionId: string;

    beforeEach(async () => {
      // Create a session
      const session = {
        id: "test-session-id",
        code: "FLEET-123456",
        createdAt: new Date(),
        creator: "test-creator",
        participants: [],
        logs: [],
        fightName: "Test Fight",
        tags: [],
        status: "ACTIVE",
      };
      createSessionStoreMock.mockReturnValue(session as any);
      getSessionStoreMock.mockReturnValue(session as any);
      updateSessionMock.mockReturnValue(session as any);
      sessionId = session.id;
    });

    it("accepts multipart form data and returns FleetLog", async () => {
      parseLogFileMock.mockResolvedValue({
        sessionId: "test-session-id",
        fileName: "test-log.txt",
        parsedAt: new Date(),
        entries: [],
        stats: { totalEvents: 0 },
      } as any);

      const mockFormData = new FormData();
      mockFormData.append("file", new Blob(["log content"]), "log.txt");
      mockFormData.append("pilotName", "Test Pilot");
      mockFormData.append("shipType", "Typhoon");

      const mockRequest = {
        formData: vi.fn().mockResolvedValue(mockFormData),
      } as any;

      const response = await uploadLog(mockRequest, {
        params: Promise.resolve({ id: sessionId }),
      } as any);

      expect(response as any).toHaveProperty("success");
      expect((response as any).success).toBe(true);
      expect(response as any).toHaveProperty("fleetLog");
      const fleetLog = (response as any).fleetLog;
      expect(fleetLog).toHaveProperty("id");
      expect(fleetLog).toHaveProperty("sessionId");
      expect(fleetLog.sessionId).toBe(sessionId);
      expect(fleetLog).toHaveProperty("pilotName");
      expect(fleetLog.pilotName).toBe("Test Pilot");
      expect(fleetLog).toHaveProperty("shipType");
      expect(fleetLog.shipType).toBe("Typhoon");
      expect(fleetLog).toHaveProperty("logData");
      expect(fleetLog).toHaveProperty("uploadedAt");
      expect(fleetLog.uploadedAt).toBeInstanceOf(Date);
      expect(fleetLog).toHaveProperty("pilotId");
    });

    it("returns 404 for non-existent session", async () => {
      getSessionStoreMock.mockReturnValue(undefined);

      const mockFormData = new FormData();
      mockFormData.append("file", new Blob(["log content"]), "log.txt");
      mockFormData.append("pilotName", "Test Pilot");

      const mockRequest = {
        formData: vi.fn().mockResolvedValue(mockFormData),
      } as any;

      const response = await uploadLog(mockRequest, {
        params: Promise.resolve({ id: "non-existent" }),
      } as any);

      expect((response as any).success).toBe(false);
      expect((response as any).message).toBe("Session not found");
    });

    it("returns 400 for missing log file", async () => {
      const mockFormData = new FormData();
      // Missing pilotName

      const mockRequest = {
        formData: vi.fn().mockResolvedValue(mockFormData),
      } as any;

      const response = await uploadLog(mockRequest, {
        params: Promise.resolve({ id: sessionId }),
      } as any);

      expect((response as any).success).toBe(false);
      expect((response as any).message).toBe("Missing log file");
    });

    it("handles 500 error on parse failure", async () => {
      const mockFormData = new FormData();
      mockFormData.append("file", new Blob(["invalid"]), "log.txt");
      mockFormData.append("pilotName", "Test Pilot");

      // Mock parseLogFile to throw error
      parseLogFileMock.mockRejectedValue(new Error("Parse error"));

      const mockRequest = {
        formData: vi.fn().mockResolvedValue(mockFormData),
      } as any;

      const response = await uploadLog(mockRequest, {
        params: Promise.resolve({ id: sessionId }),
      } as any);

      expect((response as any).success).toBe(false);
      expect((response as any).message).toBe("Failed to upload log");
    });
  });

  describe("GET /api/fleet-sessions/[id]", () => {
    let sessionId: string;

    beforeEach(async () => {
      // Create a session
      const session = {
        id: "test-session-id",
        code: "FLEET-123456",
        createdAt: new Date(),
        creator: "test-creator",
        participants: [],
        logs: [],
        fightName: "Test Fight",
        tags: [],
        status: "ACTIVE",
      };
      createSessionStoreMock.mockReturnValue(session as any);
      getSessionStoreMock.mockReturnValue(session as any);
      sessionId = session.id;
    });

    it("returns { session, participants, logs, analysisReady }", async () => {
      const response = await getSession(
        {} as any,
        { params: Promise.resolve({ id: sessionId }) } as any,
      );

      expect(response as any).toHaveProperty("session");
      expect((response as any).session).toHaveProperty("id");
      expect(response as any).toHaveProperty("participants");
      expect(Array.isArray((response as any).participants)).toBe(true);
      expect(response as any).toHaveProperty("logs");
      expect(Array.isArray((response as any).logs)).toBe(true);
      expect(response as any).toHaveProperty("analysisReady");
      expect(typeof (response as any).analysisReady).toBe("boolean");
    });

    it("returns 404 for non-existent session", async () => {
      getSessionStoreMock.mockReturnValue(undefined);

      const response = await getSession(
        {} as any,
        { params: Promise.resolve({ id: "non-existent" }) } as any,
      );

      expect(response as any).toHaveProperty("error");
      expect((response as any).error).toBe("Session not found");
    });

    it("handles 500 error on server error", async () => {
      // Mock getSession to throw error
      getSessionStoreMock.mockImplementation(() => {
        throw new Error("DB error");
      });

      const response = await getSession(
        {} as any,
        { params: Promise.resolve({ id: sessionId }) } as any,
      );

      expect((response as any).error).toBe("Failed to retrieve session");
    });
  });

  describe("POST /api/fleet-sessions/[id]/join", () => {
    let sessionId: string;
    let sessionCode: string;

    beforeEach(async () => {
      // Create a session
      const session = {
        id: "test-session-id",
        code: "FLEET-123456",
        createdAt: new Date(),
        creator: "test-creator",
        participants: [],
        logs: [],
        fightName: "Test Fight",
        tags: [],
        status: "ACTIVE",
      };
      createSessionStoreMock.mockReturnValue(session as any);
      getSessionStoreMock.mockReturnValue(session as any);
      updateSessionMock.mockReturnValue(session as any);
      sessionId = session.id;
      sessionCode = session.code;
    });

    it("accepts correct code", async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          code: sessionCode,
          pilotName: "Test Pilot",
          shipType: "Typhoon",
        }),
      } as any;

      const response = await joinSession(mockRequest, {
        params: Promise.resolve({ id: sessionId }),
      } as any);

      expect((response as any).success).toBe(true);
      expect((response as any).message).toBe("Joined session successfully");
      expect(response as any).toHaveProperty("session");
    });

    it("rejects incorrect code", async () => {
      const mockRequest = {
        json: vi
          .fn()
          .mockResolvedValue({ code: "WRONG", pilotName: "Test Pilot" }),
      } as any;

      const response = await joinSession(mockRequest, {
        params: Promise.resolve({ id: sessionId }),
      } as any);

      expect((response as any).success).toBe(false);
      expect((response as any).message).toBe(
        "Invalid code or session not found",
      );
    });

    it("returns 400 for missing required fields", async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({}), // Missing code and pilotName
      } as any;

      const response = await joinSession(mockRequest, {
        params: Promise.resolve({ id: sessionId }),
      } as any);
      expect((response as any).success).toBe(false);
      expect((response as any).message).toBe("Pilot name is required");
    });
  });
});
