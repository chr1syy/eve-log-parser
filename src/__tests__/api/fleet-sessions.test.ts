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
} from "@/lib/fleet/sessionStore";

// Mock NextRequest and NextResponse
const mockJson = vi.fn();
const mockNextResponse = {
  json: mockJson,
};

vi.mock("next/server", () => ({
  NextRequest: class MockNextRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      return { json: vi.fn().mockResolvedValue(init?.body || {}) } as any;
    }
  },
  NextResponse: {
    json: vi.fn((data, options) => ({
      ...data,
      status: options?.status || 200,
    })),
  },
}));

describe("POST /api/fleet-sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the session store
    const { sessionStore } = require("@/lib/fleet/sessionStore");
    sessionStore.clear();
  });

  it("creates session with valid code format", async () => {
    const mockRequest = {
      json: vi
        .fn()
        .mockResolvedValue({ fightName: "Test Fight", tags: ["tag1"] }),
    } as any;

    await createSession(mockRequest);

    expect(mockJson).toHaveBeenCalled();
    const response = mockJson.mock.calls[0][0];
    expect(response).toHaveProperty("id");
    expect(response).toHaveProperty("code");
    expect(response.code).toMatch(/^FLEET-[A-Z0-9]{6}$/);
    expect(response).toHaveProperty("createdAt");
    expect(response).toHaveProperty("creator");
  });

  it("generates unique codes (no duplicates)", async () => {
    const mockRequest1 = {
      json: vi.fn().mockResolvedValue({}),
    } as any;
    const mockRequest2 = {
      json: vi.fn().mockResolvedValue({}),
    } as any;

    await createSession(mockRequest1);
    await createSession(mockRequest2);

    const response1 = mockJson.mock.calls[0][0];
    const response2 = mockJson.mock.calls[1][0];

    expect(response1.code).not.toBe(response2.code);
  });
});

describe("POST /api/fleet-sessions/[id]/join", () => {
  let sessionId: string;
  let sessionCode: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { sessionStore } = require("@/lib/fleet/sessionStore");
    sessionStore.clear();

    // Create a session
    const session = createSessionStore();
    sessionId = session.id;
    sessionCode = session.code;
  });

  it("accepts correct code", async () => {
    const mockRequest = {
      json: vi.fn().mockResolvedValue({ code: sessionCode }),
    } as any;

    await joinSession(mockRequest, { params: { id: sessionId } } as any);

    expect(mockJson).toHaveBeenCalled();
    const response = mockJson.mock.calls[0][0];
    expect(response.success).toBe(true);
  });

  it("rejects incorrect code", async () => {
    const mockRequest = {
      json: vi.fn().mockResolvedValue({ code: "WRONG-CODE" }),
    } as any;

    await joinSession(mockRequest, { params: { id: sessionId } } as any);

    expect(mockJson).toHaveBeenCalled();
    const response = mockJson.mock.calls[0][0];
    expect(response.success).toBe(false);
    expect(response.message).toBe("Invalid code or session not found");
  });
});

describe("POST /api/fleet-sessions/[id]/upload", () => {
  let sessionId: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { sessionStore } = require("@/lib/fleet/sessionStore");
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

    await uploadLog(mockRequest, { params: { id: sessionId } } as any);

    expect(mockJson).toHaveBeenCalled();
    const response = mockJson.mock.calls[0][0];
    expect(response.success).toBe(true);
    expect(response).toHaveProperty("fleetLog");
  });

  it("rejects invalid files", async () => {
    const mockFormData = new FormData();
    mockFormData.append("file", new Blob([""]), "empty.txt");

    const mockRequest = {
      formData: vi.fn().mockResolvedValue(mockFormData),
    } as any;

    await uploadLog(mockRequest, { params: { id: sessionId } } as any);

    expect(mockJson).toHaveBeenCalled();
    const response = mockJson.mock.calls[0][0];
    expect(response.success).toBe(false);
  });
});

describe("GET /api/fleet-sessions", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { sessionStore } = require("@/lib/fleet/sessionStore");
    sessionStore.clear();

    // Create a session
    createSessionStore();
  });

  it("returns user's sessions", async () => {
    await listSessions();

    expect(mockJson).toHaveBeenCalled();
    const response = mockJson.mock.calls[0][0];
    expect(Array.isArray(response)).toBe(true);
    expect(response.length).toBe(1);
    expect(response[0]).toHaveProperty("participantCount");
    expect(response[0]).toHaveProperty("logCount");
  });
});

describe("GET /api/fleet-sessions/[id]", () => {
  let sessionId: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { sessionStore } = require("@/lib/fleet/sessionStore");
    sessionStore.clear();

    // Create a session
    const session = createSessionStore();
    sessionId = session.id;
  });

  it("returns full session data", async () => {
    await getSession({} as any, { params: { id: sessionId } } as any);

    expect(mockJson).toHaveBeenCalled();
    const response = mockJson.mock.calls[0][0];
    expect(response).toHaveProperty("session");
    expect(response).toHaveProperty("participants");
    expect(response).toHaveProperty("logs");
    expect(response).toHaveProperty("analysisReady");
  });
});
