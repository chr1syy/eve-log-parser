/* eslint-disable @typescript-eslint/no-explicit-any */
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

// Mock NextRequest and NextResponse
vi.mock("next/server", () => ({
  NextRequest: class MockNextRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      return { json: vi.fn().mockResolvedValue(init?.body || {}) } as any;
    }
  },
  NextResponse: {
    json: vi.fn((data, options) => data),
  },
}));

describe("POST /api/fleet-sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the session store
    sessionStore.clear();
  });

  it("creates session with valid code format", async () => {
    const mockRequest = {
      json: vi
        .fn()
        .mockResolvedValue({ fightName: "Test Fight", tags: ["tag1"] }),
    } as any;

    const response = await createSession(mockRequest);

    expect(response as any).toHaveProperty("id");
    expect(response as any).toHaveProperty("code");
    expect((response as any).code).toMatch(/^FLEET-[A-Z0-9]{6}$/);
    expect(response as any).toHaveProperty("createdAt");
    expect(response as any).toHaveProperty("creator");
  });

  it("generates unique codes (no duplicates)", async () => {
    const mockRequest1 = {
      json: vi.fn().mockResolvedValue({}),
    } as any;
    const mockRequest2 = {
      json: vi.fn().mockResolvedValue({}),
    } as any;

    const response1 = await createSession(mockRequest1);
    const response2 = await createSession(mockRequest2);

    expect((response1 as any).code).not.toBe((response2 as any).code);
  });
});

describe("POST /api/fleet-sessions/[id]/join", () => {
  let sessionId: string;
  let sessionCode: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    sessionStore.clear();

    // Create a session
    const session = createSessionStore();
    sessionId = session.id;
    sessionCode = session.code;
  });

  it("accepts correct code", async () => {
    const mockRequest = {
      json: vi
        .fn()
        .mockResolvedValue({ code: sessionCode, pilotName: "Pilot One" }),
    } as any;

    const response = await joinSession(mockRequest, {
      params: { id: sessionId },
    } as any);

    expect((response as any).success).toBe(true);
  });

  it("rejects incorrect code", async () => {
    const mockRequest = {
      json: vi
        .fn()
        .mockResolvedValue({ code: "WRONG-CODE", pilotName: "Pilot One" }),
    } as any;

    const response = await joinSession(mockRequest, {
      params: { id: sessionId },
    } as any);

    expect((response as any).success).toBe(false);
    expect((response as any).message).toBe("Invalid code or session not found");
  });
});

describe("POST /api/fleet-sessions/[id]/upload", () => {
  let sessionId: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    sessionStore.clear();

    // Create a session
    const session = createSessionStore();
    sessionId = session.id;
  });

  it("accepts valid log file", async () => {
    const mockFormData = new FormData();
    mockFormData.append("file", new Blob(["log content"]), "log.txt");
    mockFormData.append("pilotName", "Test Pilot");
    mockFormData.append("shipType", "Typhoon");

    const mockRequest = {
      formData: vi.fn().mockResolvedValue(mockFormData),
    } as any;

    const response = await uploadLog(mockRequest, {
      params: { id: sessionId },
    } as any);

    expect((response as any).success).toBe(true);
    expect(response as any).toHaveProperty("fleetLog");
  });

  it("rejects invalid files", async () => {
    const mockFormData = new FormData();
    mockFormData.append("file", new Blob([""]), "empty.txt");

    const mockRequest = {
      formData: vi.fn().mockResolvedValue(mockFormData),
    } as any;

    const response = await uploadLog(mockRequest, {
      params: { id: sessionId },
    } as any);

    expect((response as any).success).toBe(false);
  });
});

describe("GET /api/fleet-sessions", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    sessionStore.clear();

    // Create a session
    createSessionStore();
  });

  it("returns user's sessions", async () => {
    const response = await listSessions();

    expect(Array.isArray(response)).toBe(true);
    expect((response as any).length).toBe(1);
    expect((response as any)[0]).toHaveProperty("participantCount");
    expect((response as any)[0]).toHaveProperty("logCount");
  });
});

describe("GET /api/fleet-sessions/[id]", () => {
  let sessionId: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    sessionStore.clear();

    // Create a session
    const session = createSessionStore();
    sessionId = session.id;
  });

  it("returns full session data", async () => {
    const response = await getSession(
      {} as any,
      { params: { id: sessionId } } as any,
    );

    expect(response as any).toHaveProperty("session");
    expect(response as any).toHaveProperty("participants");
    expect(response as any).toHaveProperty("logs");
    expect(response as any).toHaveProperty("analysisReady");
  });
});
