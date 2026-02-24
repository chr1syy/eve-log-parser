import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as createSession } from "@/app/api/fleet-sessions/route";
import { POST as joinSession } from "@/app/api/fleet-sessions/[id]/join/route";
import { POST as uploadLog } from "@/app/api/fleet-sessions/[id]/upload/route";
import { GET as getSession } from "@/app/api/fleet-sessions/[id]/route";
import {
  createSession as createSessionStore,
  getSession as getSessionStore,
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

// Mock log content for testing
const mockLogPilotA = `[ 2025.10.23 02:08:58 ] (combat) <b>367</b> <color=0x77ffffff><font size=10>to</font> <b><color=0xffffffff>PilotB[TEST](Typhoon)</b><font size=10><color=0x77ffffff> - Heavy Entropic Disintegrator II - Hits
[ 2025.10.23 02:09:00 ] (combat) <b>256</b><color=0x77ffffff><font size=10> remote armor repaired to </font><b><color=0xffffffff><fontsize=12><color=0xFFFFFF00><b> <u>PilotC</u></b></color></fontsize></b></fontsize></b><color=0x77ffffff><font size=10> - Medium Remote Armor Repairer II</font>`;

const mockLogPilotB = `[ 2025.10.23 02:08:59 ] (combat) <b>200</b> <color=0x77ffffff><font size=10>to</font> <b><color=0xffffffff>PilotA[TEST](Brutix)</b><font size=10><color=0x77ffffff> - Neutron Blaster II - Hits
[ 2025.10.23 02:09:01 ] (combat) <b>300</b><color=0x77ffffff><font size=10> remote armor repaired to </font><b><color=0xffffffff><fontsize=12><color=0xFFFFFF00><b> <u>PilotA</u></b></color></fontsize></b></fontsize></b><color=0x77ffffff><font size=10> - Medium Remote Armor Repairer II</font>`;

const mockLogPilotC = `[ 2025.10.23 02:09:02 ] (combat) <b>150</b> <color=0x77ffffff><font size=10>to</font> <b><color=0xffffffff>PilotA[TEST](Brutix)</b><font size=10><color=0x77ffffff> - Small Focused Pulse Laser II - Hits
[ 2025.10.23 02:09:03 ] (combat) <b>400</b><color=0x77ffffff><font size=10> remote armor repaired to </font><b><color=0xffffffff><fontsize=12><color=0xFFFFFF00><b> <u>PilotB</u></b></color></fontsize></b></fontsize></b><color=0x77ffffff><font size=10> - Medium Remote Armor Repairer II</font>`;

const mockLogNonOverlapping = `[ 2025.10.23 03:00:00 ] (combat) <b>100</b> <color=0x77ffffff><font size=10>to</font> <b><color=0xffffffff>Target[TEST](Frigate)</b><font size=10><color=0x77ffffff> - Small Focused Beam Laser I - Hits`;

describe("Fleet Workflow E2E Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the session store
    const { sessionStore } = require("@/lib/fleet/sessionStore");
    sessionStore.clear();
  });

  describe("Scenario 1: Create Session & Single Upload", () => {
    it("creates session and uploads log successfully", async () => {
      // Create session
      const createRequest = {
        json: vi
          .fn()
          .mockResolvedValue({ fightName: "Test Fight", tags: ["test"] }),
      } as any;

      await createSession(createRequest);
      const createResponse = mockJson.mock.calls[0][0];
      expect(createResponse.code).toMatch(/^FLEET-[A-Z0-9]{6}$/);
      const sessionId = createResponse.id;

      // Upload log
      const mockFormData = new FormData();
      mockFormData.append("file", new Blob([mockLogPilotA]), "log.txt");
      mockFormData.append("pilotName", "PilotA");
      mockFormData.append("shipType", "Typhoon");

      const uploadRequest = {
        formData: vi.fn().mockResolvedValue(mockFormData),
      } as any;

      await uploadLog(uploadRequest, { params: { id: sessionId } } as any);
      const uploadResponse = mockJson.mock.calls[1][0];
      expect(uploadResponse.success).toBe(true);

      // Get session
      await getSession({} as any, { params: { id: sessionId } } as any);
      const getResponse = mockJson.mock.calls[2][0];
      expect(getResponse.analysisReady).toBe(true);
      expect(getResponse.session).toBeDefined();
      expect(getResponse.analysis).toBeDefined();
      expect(getResponse.analysis.totalDamageDealt).toBeGreaterThan(0);
    });
  });

  describe("Scenario 2: Multiple Pilots Upload", () => {
    it("handles multiple overlapping logs correctly", async () => {
      // Create session
      const createRequest = {
        json: vi.fn().mockResolvedValue({ fightName: "Multi Pilot Fight" }),
      } as any;

      await createSession(createRequest);
      const createResponse = mockJson.mock.calls[0][0];
      const sessionId = createResponse.id;

      // Upload log A
      const formDataA = new FormData();
      formDataA.append("file", new Blob([mockLogPilotA]), "logA.txt");
      formDataA.append("pilotName", "PilotA");
      formDataA.append("shipType", "Typhoon");

      const uploadRequestA = {
        formData: vi.fn().mockResolvedValue(formDataA),
      } as any;

      await uploadLog(uploadRequestA, { params: { id: sessionId } } as any);

      // Upload log B
      const formDataB = new FormData();
      formDataB.append("file", new Blob([mockLogPilotB]), "logB.txt");
      formDataB.append("pilotName", "PilotB");
      formDataB.append("shipType", "Brutix");

      const uploadRequestB = {
        formData: vi.fn().mockResolvedValue(formDataB),
      } as any;

      await uploadLog(uploadRequestB, { params: { id: sessionId } } as any);

      // Upload log C
      const formDataC = new FormData();
      formDataC.append("file", new Blob([mockLogPilotC]), "logC.txt");
      formDataC.append("pilotName", "PilotC");
      formDataC.append("shipType", "Punisher");

      const uploadRequestC = {
        formData: vi.fn().mockResolvedValue(formDataC),
      } as any;

      await uploadLog(uploadRequestC, { params: { id: sessionId } } as any);

      // Get session
      await getSession({} as any, { params: { id: sessionId } } as any);
      const getResponse = mockJson.mock.calls[3][0];
      expect(getResponse.analysisReady).toBe(true);
      expect(getResponse.participants).toHaveLength(3);
      expect(
        getResponse.participants.some((p: any) => p.pilotName === "PilotA"),
      ).toBe(true);
      expect(
        getResponse.participants.some((p: any) => p.pilotName === "PilotB"),
      ).toBe(true);
      expect(
        getResponse.participants.some((p: any) => p.pilotName === "PilotC"),
      ).toBe(true);

      // Verify damage aggregation
      const totalDamage = getResponse.participants.reduce(
        (sum: number, p: any) => sum + p.stats.damageDealt,
        0,
      );
      expect(getResponse.analysis.totalDamageDealt).toBe(totalDamage);
    });
  });

  describe("Scenario 3: Non-Overlapping Logs (Error)", () => {
    it("marks analysis as not ready for non-overlapping logs", async () => {
      // Create session
      const createRequest = {
        json: vi.fn().mockResolvedValue({ fightName: "Non-Overlapping Fight" }),
      } as any;

      await createSession(createRequest);
      const createResponse = mockJson.mock.calls[0][0];
      const sessionId = createResponse.id;

      // Upload first log
      const formDataA = new FormData();
      formDataA.append("file", new Blob([mockLogPilotA]), "logA.txt");
      formDataA.append("pilotName", "PilotA");
      formDataA.append("shipType", "Typhoon");

      const uploadRequestA = {
        formData: vi.fn().mockResolvedValue(formDataA),
      } as any;

      await uploadLog(uploadRequestA, { params: { id: sessionId } } as any);

      // Upload non-overlapping log
      const formDataB = new FormData();
      formDataB.append("file", new Blob([mockLogNonOverlapping]), "logB.txt");
      formDataB.append("pilotName", "PilotB");
      formDataB.append("shipType", "Brutix");

      const uploadRequestB = {
        formData: vi.fn().mockResolvedValue(formDataB),
      } as any;

      await uploadLog(uploadRequestB, { params: { id: sessionId } } as any);

      // Get session
      await getSession({} as any, { params: { id: sessionId } } as any);
      const getResponse = mockJson.mock.calls[2][0];
      expect(getResponse.analysisReady).toBe(false);
      // Note: In a real implementation, there should be a warning or error about timestamp mismatch
    });
  });

  describe("Scenario 4: Join Session by Code", () => {
    it("allows joining with correct code and rejects with wrong code", async () => {
      // Create session
      const createRequest = {
        json: vi.fn().mockResolvedValue({ fightName: "Join Test Fight" }),
      } as any;

      await createSession(createRequest);
      const createResponse = mockJson.mock.calls[0][0];
      const sessionId = createResponse.id;
      const sessionCode = createResponse.code;

      // Join with correct code
      const joinRequestCorrect = {
        json: vi.fn().mockResolvedValue({ code: sessionCode }),
      } as any;

      await joinSession(joinRequestCorrect, {
        params: { id: sessionId },
      } as any);
      const joinResponseCorrect = mockJson.mock.calls[1][0];
      expect(joinResponseCorrect.success).toBe(true);

      // Join with wrong code
      const joinRequestWrong = {
        json: vi.fn().mockResolvedValue({ code: "WRONG-CODE" }),
      } as any;

      await joinSession(joinRequestWrong, { params: { id: sessionId } } as any);
      const joinResponseWrong = mockJson.mock.calls[2][0];
      expect(joinResponseWrong.success).toBe(false);
      expect(joinResponseWrong.message).toBe(
        "Invalid code or session not found",
      );
    });
  });
});
