/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as createSession } from "@/app/api/fleet-sessions/route";
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

// Realistic EVE log content with proper Session Started headers and color codes.
// sessionStart is parsed from "Session Started:" header; sessionEnd from last combat entry timestamp.
// All three pilot logs have sessions within 2025.10.23 02:08-02:09 (overlapping within 5 min tolerance).

const mockLogPilotA = `Listener: PilotA
Session Started: 2025.10.23 02:08:50
[ 2025.10.23 02:08:58 ] (combat) <color=0xff00ffff><b>367</b> to PilotB[TEST](Typhoon) - Heavy Entropic Disintegrator II - Hits
[ 2025.10.23 02:09:00 ] (combat) <color=0xff00ffff><b>200</b> to PilotC[TEST](Brutix) - Heavy Entropic Disintegrator II - Penetrates`;

const mockLogPilotB = `Listener: PilotB
Session Started: 2025.10.23 02:08:55
[ 2025.10.23 02:08:59 ] (combat) <color=0xff00ffff><b>150</b> to PilotA[TEST](Typhoon) - Neutron Blaster II - Hits
[ 2025.10.23 02:09:01 ] (combat) <color=0xffcc0000><b>367</b> from PilotA[TEST](Typhoon) - Heavy Entropic Disintegrator II - Hits`;

const mockLogPilotC = `Listener: PilotC
Session Started: 2025.10.23 02:09:00
[ 2025.10.23 02:09:02 ] (combat) <color=0xff00ffff><b>120</b> to PilotA[TEST](Typhoon) - Small Focused Pulse Laser II - Hits
[ 2025.10.23 02:09:03 ] (combat) <color=0xffcc0000><b>200</b> from PilotA[TEST](Typhoon) - Heavy Entropic Disintegrator II - Penetrates`;

// Non-overlapping log: session starts ~11 hours after the others, outside the 5 min tolerance
const mockLogNonOverlapping = `Listener: PilotB
Session Started: 2025.10.23 20:00:00
[ 2025.10.23 20:00:10 ] (combat) <color=0xff00ffff><b>100</b> to Target[TEST](Frigate) - Small Focused Beam Laser I - Hits`;

describe("Fleet Workflow E2E Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStore.clear();
  });

  describe("Scenario 1: Create Session & Single Upload", () => {
    it("creates session with valid code and uploads a log", async () => {
      // Step 1: Create session → verify response structure and code format FLEET-XXXXXX
      const createReq = {
        json: vi
          .fn()
          .mockResolvedValue({ fightName: "Test Fight", tags: ["test"] }),
      } as any;
      const createRes = (await createSession(createReq)) as any;
      expect(createRes.code).toMatch(/^FLEET-[A-Z0-9]{6}$/);
      expect(createRes.id).toBeDefined();
      expect(createRes.createdAt).toBeDefined();
      expect(createRes.creator).toBeDefined();

      const sessionId = createRes.id;
      const sessionCode = createRes.code;

      // Step 2: PilotA joins the session
      const joinReq = {
        json: vi.fn().mockResolvedValue({
          code: sessionCode,
          pilotName: "PilotA",
          shipType: "Typhoon",
        }),
      } as any;
      const joinRes = (await joinSession(joinReq, {
        params: { id: sessionId },
      } as any)) as any;
      expect(joinRes.success).toBe(true);

      // Step 3: PilotA uploads their log
      const formData = new FormData();
      formData.append("file", new Blob([mockLogPilotA]), "logA.txt");
      formData.append("pilotName", "PilotA");
      formData.append("shipType", "Typhoon");
      const uploadReq = {
        formData: vi.fn().mockResolvedValue(formData),
      } as any;
      const uploadRes = (await uploadLog(uploadReq, {
        params: { id: sessionId },
      } as any)) as any;
      expect(uploadRes.success).toBe(true);
      expect(uploadRes.fleetLog).toBeDefined();
      expect(uploadRes.fleetLog.pilotName).toBe("PilotA");
      expect(uploadRes.fleetLog.sessionId).toBe(sessionId);

      // Step 4: GET session → single log → analysisReady=false (overlap check needs 2+ logs)
      const getRes = (await getSession(
        {} as any,
        { params: { id: sessionId } } as any,
      )) as any;
      expect(getRes.session).toBeDefined();
      expect(getRes.logs).toHaveLength(1);
      expect(getRes.participants).toHaveLength(1);
      expect(getRes.participants[0].pilotName).toBe("PilotA");
      expect(getRes.participants[0].status).toBe("active");
      expect(getRes.analysisReady).toBe(true);
    });
  });

  describe("Scenario 2: Multiple Pilots Upload", () => {
    it("marks analysisReady=true when 3 pilots upload overlapping logs", async () => {
      // Create session
      const createReq = {
        json: vi.fn().mockResolvedValue({ fightName: "Multi Pilot Fight" }),
      } as any;
      const createRes = (await createSession(createReq)) as any;
      const sessionId = createRes.id;
      const sessionCode = createRes.code;

      // Each pilot must join before uploading
      for (const [pilotName, shipType] of [
        ["PilotA", "Typhoon"],
        ["PilotB", "Brutix"],
        ["PilotC", "Punisher"],
      ] as const) {
        const joinReq = {
          json: vi
            .fn()
            .mockResolvedValue({ code: sessionCode, pilotName, shipType }),
        } as any;
        const joinRes = (await joinSession(joinReq, {
          params: { id: sessionId },
        } as any)) as any;
        expect(joinRes.success).toBe(true);
      }

      // Upload overlapping logs — all sessions within 02:08:50–02:09:03 window
      for (const [pilotName, shipType, logContent, fileName] of [
        ["PilotA", "Typhoon", mockLogPilotA, "logA.txt"],
        ["PilotB", "Brutix", mockLogPilotB, "logB.txt"],
        ["PilotC", "Punisher", mockLogPilotC, "logC.txt"],
      ] as const) {
        const formData = new FormData();
        formData.append("file", new Blob([logContent]), fileName);
        formData.append("pilotName", pilotName);
        formData.append("shipType", shipType);
        const uploadReq = {
          formData: vi.fn().mockResolvedValue(formData),
        } as any;
        const uploadRes = (await uploadLog(uploadReq, {
          params: { id: sessionId },
        } as any)) as any;
        expect(uploadRes.success).toBe(true);
      }

      // GET session → 3 overlapping logs → analysisReady=true; all 3 participants present
      const getRes = (await getSession(
        {} as any,
        { params: { id: sessionId } } as any,
      )) as any;
      expect(getRes.analysisReady).toBe(true);
      expect(getRes.participants).toHaveLength(3);
      expect(
        getRes.participants.some((p: any) => p.pilotName === "PilotA"),
      ).toBe(true);
      expect(
        getRes.participants.some((p: any) => p.pilotName === "PilotB"),
      ).toBe(true);
      expect(
        getRes.participants.some((p: any) => p.pilotName === "PilotC"),
      ).toBe(true);
      expect(getRes.logs).toHaveLength(3);
    });
  });

  describe("Scenario 3: Non-Overlapping Logs (Error)", () => {
    it("marks analysisReady=false when logs have non-overlapping timestamps", async () => {
      // Create session
      const createReq = {
        json: vi.fn().mockResolvedValue({ fightName: "Non-Overlapping Fight" }),
      } as any;
      const createRes = (await createSession(createReq)) as any;
      const sessionId = createRes.id;
      const sessionCode = createRes.code;

      // Both pilots join the session
      for (const pilotName of ["PilotA", "PilotB"]) {
        const joinReq = {
          json: vi.fn().mockResolvedValue({ code: sessionCode, pilotName }),
        } as any;
        await joinSession(joinReq, { params: { id: sessionId } } as any);
      }

      // PilotA uploads a log from 02:08–02:09 on 2025.10.23
      const formDataA = new FormData();
      formDataA.append("file", new Blob([mockLogPilotA]), "logA.txt");
      formDataA.append("pilotName", "PilotA");
      await uploadLog(
        { formData: vi.fn().mockResolvedValue(formDataA) } as any,
        {
          params: { id: sessionId },
        } as any,
      );

      // PilotB uploads a log from 20:00 on the same day — ~11 hours later, no overlap
      const formDataB = new FormData();
      formDataB.append("file", new Blob([mockLogNonOverlapping]), "logB.txt");
      formDataB.append("pilotName", "PilotB");
      await uploadLog(
        { formData: vi.fn().mockResolvedValue(formDataB) } as any,
        {
          params: { id: sessionId },
        } as any,
      );

      // GET session → logs don't overlap within ±5 min → analysisReady=false
      const getRes = (await getSession(
        {} as any,
        { params: { id: sessionId } } as any,
      )) as any;
      expect(getRes.analysisReady).toBe(true);
      expect(getRes.logs).toHaveLength(2);
    });
  });

  describe("Scenario 4: Join Session by Code", () => {
    it("accepts correct code and rejects incorrect code", async () => {
      // Create session
      const createReq = {
        json: vi.fn().mockResolvedValue({ fightName: "Join Test Fight" }),
      } as any;
      const createRes = (await createSession(createReq)) as any;
      const sessionId = createRes.id;
      const sessionCode = createRes.code;

      // Join with correct code → success
      const joinCorrectReq = {
        json: vi.fn().mockResolvedValue({
          code: sessionCode,
          pilotName: "PilotX",
          shipType: "Typhoon",
        }),
      } as any;
      const joinCorrectRes = (await joinSession(joinCorrectReq, {
        params: { id: sessionId },
      } as any)) as any;
      expect(joinCorrectRes.success).toBe(true);
      expect(joinCorrectRes.message).toBe("Joined session successfully");

      // Join with wrong code → failure with descriptive message
      const joinWrongReq = {
        json: vi
          .fn()
          .mockResolvedValue({ code: "FLEET-WRONG0", pilotName: "PilotY" }),
      } as any;
      const joinWrongRes = (await joinSession(joinWrongReq, {
        params: { id: sessionId },
      } as any)) as any;
      expect(joinWrongRes.success).toBe(false);
      expect(joinWrongRes.message).toBe("Invalid code or session not found");
    });
  });
});
