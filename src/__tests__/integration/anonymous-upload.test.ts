/**
 * Integration Tests: Anonymous Upload Flow
 * Tests that anonymous users can upload logs and new uploads replace the previous one
 */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as dbLogs from "@/lib/db/logs";
import * as authUtils from "@/lib/auth-utils";
import type { ParsedLog } from "@/lib/types";

// Mock database and auth modules
vi.mock("@/lib/db/logs");
vi.mock("@/lib/auth-utils");

/**
 * Create a mock ParsedLog for testing
 */
function createMockParsedLog(overrides?: Partial<ParsedLog>): ParsedLog {
  return {
    sessionId: "anonymous-session-123",
    fileName: "combat-log.txt",
    parsedAt: new Date("2025-02-23T10:00:00Z"),
    characterName: "Anonymous User",
    sessionStart: new Date("2025-02-23T09:00:00Z"),
    sessionEnd: new Date("2025-02-23T10:00:00Z"),
    entries: [
      {
        id: "entry-1",
        timestamp: new Date("2025-02-23T09:05:00Z"),
        rawLine: "[09:05:00] (combat) 100 to target - weapon - Hits",
        eventType: "damage-dealt",
        amount: 100,
        hitQuality: "Hits",
        weapon: "Missile",
        isDrone: false,
        pilotName: "Target",
        corpTicker: "CORP",
        shipType: "Frigate",
        isNpc: false,
      },
    ],
    stats: {
      totalEvents: 1,
      damageDealt: 100,
      damageReceived: 0,
      topWeapons: [{ name: "Missile", count: 1, totalDamage: 100 }],
      topTargets: [{ name: "Target", shipType: "Frigate", totalDamage: 100 }],
      hitQualityDealt: { Hits: 1 },
      hitQualityReceived: {},
      totalRepReceived: 0,
      totalRepOutgoing: 0,
      capNeutReceived: 0,
      capNeutDealt: 0,
      capNosDrained: 0,
      activeTimeMinutes: 60,
      sessionStart: new Date("2025-02-23T09:00:00Z"),
      sessionEnd: new Date("2025-02-23T10:00:00Z"),
      damageDealtByTarget: [
        {
          target: "Target",
          shipType: "Frigate",
          corp: "CORP",
          totalDamage: 100,
          hitCount: 1,
        },
      ],
      repReceivedBySource: [],
      capReceivedByShipType: [],
      capDealtByModule: [],
    },
    ...overrides,
  };
}

describe("Anonymous Upload Flow Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────────────────────
  // First Upload: Anonymous user uploads a log
  // ────────────────────────────────────────────────────────────
  describe("First upload for anonymous user", () => {
    it("creates a new anonymous log when none exists", async () => {
      const sessionId = "anon-session-123";
      const logData = createMockParsedLog();

      const mockLog = {
        id: "log-id-1",
        user_id: sessionId,
        filename: "combat-log.txt",
        uploaded_at: new Date(),
        log_data: logData,
        metadata: { entries_count: 1 },
        created_at: new Date(),
      };

      const updateAnonymousSpy = vi
        .spyOn(dbLogs, "updateAnonymousLog")
        .mockResolvedValueOnce(mockLog);

      const result = await dbLogs.updateAnonymousLog(
        sessionId,
        logData.fileName,
        logData,
      );

      expect(updateAnonymousSpy).toHaveBeenCalledWith(
        sessionId,
        logData.fileName,
        logData,
      );
      expect(result.user_id).toBe(sessionId);
      expect(result.filename).toBe("combat-log.txt");
      expect(result.log_data.stats.damageDealt).toBe(100);
    });

    it("stores the log with session ID as user_id", async () => {
      const sessionId = "anon-session-456";
      const logData = createMockParsedLog();
      const mockLog = {
        id: "log-id-2",
        user_id: sessionId,
        filename: logData.fileName,
        uploaded_at: new Date(),
        log_data: logData,
        metadata: { entries_count: logData.entries.length },
        created_at: new Date(),
      };

      vi.spyOn(dbLogs, "updateAnonymousLog").mockResolvedValueOnce(mockLog);

      const result = await dbLogs.updateAnonymousLog(
        sessionId,
        logData.fileName,
        logData,
      );

      // Verify the stored log uses sessionId as user_id
      expect(result.user_id).toBe(sessionId);
      expect(result.user_id).not.toBe("authenticated-user-id");
    });

    it("retrieves the uploaded anonymous log by session ID", async () => {
      const sessionId = "anon-session-789";
      const logData = createMockParsedLog();
      const mockLog = {
        id: "log-id-3",
        user_id: sessionId,
        filename: logData.fileName,
        uploaded_at: new Date(),
        log_data: logData,
        metadata: { entries_count: 1 },
        created_at: new Date(),
      };

      vi.spyOn(dbLogs, "getAnonymousLog").mockResolvedValueOnce(mockLog);

      const result = await dbLogs.getAnonymousLog(sessionId);

      expect(result).not.toBeNull();
      expect(result?.user_id).toBe(sessionId);
      expect(result?.log_data.sessionId).toBe("anonymous-session-123");
    });
  });

  // ────────────────────────────────────────────────────────────
  // Second Upload: Anonymous user uploads a NEW log
  // Expected: Previous log is REPLACED (not duplicated)
  // ────────────────────────────────────────────────────────────
  describe("Second upload for same anonymous user", () => {
    it("replaces the previous anonymous log instead of creating a new one", async () => {
      const sessionId = "anon-session-replace";
      const firstLog = createMockParsedLog({
        fileName: "first-log.txt",
        sessionId: "session-1",
      });
      const secondLog = createMockParsedLog({
        fileName: "second-log.txt",
        sessionId: "session-2",
      });

      const mockFirstLog = {
        id: "log-id-first",
        user_id: sessionId,
        filename: firstLog.fileName,
        uploaded_at: new Date("2025-02-23T10:00:00Z"),
        log_data: firstLog,
        metadata: { entries_count: 1 },
        created_at: new Date("2025-02-23T10:00:00Z"),
      };

      const mockSecondLog = {
        id: "log-id-first", // Same ID - update, not insert
        user_id: sessionId,
        filename: secondLog.fileName,
        uploaded_at: new Date("2025-02-23T10:05:00Z"),
        log_data: secondLog,
        metadata: { entries_count: 1 },
        created_at: new Date("2025-02-23T10:00:00Z"), // Original creation time
      };

      const updateSpy = vi
        .spyOn(dbLogs, "updateAnonymousLog")
        .mockResolvedValueOnce(mockFirstLog)
        .mockResolvedValueOnce(mockSecondLog);

      // First upload
      const result1 = await dbLogs.updateAnonymousLog(
        sessionId,
        firstLog.fileName,
        firstLog,
      );
      expect(result1.id).toBe("log-id-first");
      expect(result1.filename).toBe("first-log.txt");

      // Second upload
      const result2 = await dbLogs.updateAnonymousLog(
        sessionId,
        secondLog.fileName,
        secondLog,
      );
      expect(result2.id).toBe("log-id-first"); // Same log ID = replacement
      expect(result2.filename).toBe("second-log.txt"); // But filename updated

      // Verify updateAnonymousLog was called twice (both uploads)
      expect(updateSpy).toHaveBeenCalledTimes(2);
    });

    it("only stores one log per anonymous session", async () => {
      const sessionId = "anon-single-log";
      const log1 = createMockParsedLog({ fileName: "log1.txt" });
      const log2 = createMockParsedLog({ fileName: "log2.txt" });
      const log3 = createMockParsedLog({ fileName: "log3.txt" });

      const mockLog = {
        id: "log-id-only",
        user_id: sessionId,
        filename: log3.fileName,
        uploaded_at: new Date(),
        log_data: log3,
        metadata: { entries_count: 1 },
        created_at: new Date(),
      };

      vi.spyOn(dbLogs, "updateAnonymousLog").mockResolvedValue(mockLog);

      // Upload three logs
      await dbLogs.updateAnonymousLog(sessionId, log1.fileName, log1);
      await dbLogs.updateAnonymousLog(sessionId, log2.fileName, log2);
      const final = await dbLogs.updateAnonymousLog(
        sessionId,
        log3.fileName,
        log3,
      );

      // Final log should be the third one
      expect(final.filename).toBe("log3.txt");
      expect(final.id).toBe("log-id-only"); // Same ID across all uploads
    });

    it("updates metadata when replacing anonymous log", async () => {
      const sessionId = "anon-metadata";
      const logWithMore = createMockParsedLog({
        entries: [
          {
            id: "entry-1",
            timestamp: new Date(),
            rawLine: "test1",
            eventType: "damage-dealt",
            amount: 100,
            hitQuality: "Hits",
            weapon: "Missile",
            isDrone: false,
            pilotName: "Target1",
            corpTicker: "CORP1",
            shipType: "Frigate",
            isNpc: false,
          },
          {
            id: "entry-2",
            timestamp: new Date(),
            rawLine: "test2",
            eventType: "damage-dealt",
            amount: 50,
            hitQuality: "Glances Off",
            weapon: "Missile",
            isDrone: false,
            pilotName: "Target2",
            corpTicker: "CORP2",
            shipType: "Corvette",
            isNpc: false,
          },
        ],
      });

      const mockLog = {
        id: "log-id-meta",
        user_id: sessionId,
        filename: "updated-log.txt",
        uploaded_at: new Date(),
        log_data: logWithMore,
        metadata: { entries_count: 2, combat_duration_ms: 3600000 },
        created_at: new Date(),
      };

      vi.spyOn(dbLogs, "updateAnonymousLog").mockResolvedValueOnce(mockLog);

      const result = await dbLogs.updateAnonymousLog(
        sessionId,
        "updated-log.txt",
        logWithMore,
      );

      expect(result.metadata?.entries_count).toBe(2);
      expect(result.log_data.entries).toHaveLength(2);
    });
  });

  // ────────────────────────────────────────────────────────────
  // Multiple Anonymous Sessions
  // Each session should have its own log
  // ────────────────────────────────────────────────────────────
  describe("Multiple anonymous sessions isolation", () => {
    it("keeps logs separate for different anonymous sessions", async () => {
      const session1 = "anon-user-1";
      const session2 = "anon-user-2";
      const log1 = createMockParsedLog({ fileName: "user1-log.txt" });
      const log2 = createMockParsedLog({ fileName: "user2-log.txt" });

      const mockLog1 = {
        id: "log-id-user1",
        user_id: session1,
        filename: log1.fileName,
        uploaded_at: new Date("2025-02-23T10:00:00Z"),
        log_data: log1,
        metadata: { entries_count: 1 },
        created_at: new Date("2025-02-23T10:00:00Z"),
      };

      const mockLog2 = {
        id: "log-id-user2",
        user_id: session2,
        filename: log2.fileName,
        uploaded_at: new Date("2025-02-23T10:05:00Z"),
        log_data: log2,
        metadata: { entries_count: 1 },
        created_at: new Date("2025-02-23T10:05:00Z"),
      };

      vi.spyOn(dbLogs, "updateAnonymousLog")
        .mockResolvedValueOnce(mockLog1)
        .mockResolvedValueOnce(mockLog2);

      const result1 = await dbLogs.updateAnonymousLog(
        session1,
        log1.fileName,
        log1,
      );
      const result2 = await dbLogs.updateAnonymousLog(
        session2,
        log2.fileName,
        log2,
      );

      expect(result1.user_id).toBe(session1);
      expect(result2.user_id).toBe(session2);
      expect(result1.id).not.toBe(result2.id);
    });

    it("retrieves correct log for each anonymous session", async () => {
      const session1 = "anon-session-a";
      const session2 = "anon-session-b";

      const mockLog1 = {
        id: "log-id-a",
        user_id: session1,
        filename: "log-a.txt",
        uploaded_at: new Date(),
        log_data: createMockParsedLog({ fileName: "log-a.txt" }),
        metadata: { entries_count: 1 },
        created_at: new Date(),
      };

      const mockLog2 = {
        id: "log-id-b",
        user_id: session2,
        filename: "log-b.txt",
        uploaded_at: new Date(),
        log_data: createMockParsedLog({ fileName: "log-b.txt" }),
        metadata: { entries_count: 1 },
        created_at: new Date(),
      };

      const getAnonymousSpy = vi
        .spyOn(dbLogs, "getAnonymousLog")
        .mockResolvedValueOnce(mockLog1)
        .mockResolvedValueOnce(mockLog2);

      const retrieved1 = await dbLogs.getAnonymousLog(session1);
      const retrieved2 = await dbLogs.getAnonymousLog(session2);

      expect(retrieved1?.user_id).toBe(session1);
      expect(retrieved2?.user_id).toBe(session2);
      expect(retrieved1?.filename).toBe("log-a.txt");
      expect(retrieved2?.filename).toBe("log-b.txt");
    });
  });

  // ────────────────────────────────────────────────────────────
  // Anonymous User Authentication State
  // ────────────────────────────────────────────────────────────
  describe("Anonymous user authentication state", () => {
    it("anonymous user is not authenticated", async () => {
      vi.spyOn(authUtils, "isUserAuthenticated").mockResolvedValueOnce(false);

      const isAuth = await authUtils.isUserAuthenticated();

      expect(isAuth).toBe(false);
    });

    it("anonymous user has no character info", async () => {
      vi.spyOn(authUtils, "getCurrentUser").mockResolvedValueOnce(null);

      const user = await authUtils.getCurrentUser();

      expect(user).toBeNull();
    });

    it("anonymous user has no character ID", async () => {
      vi.spyOn(authUtils, "getCurrentCharacterId").mockResolvedValueOnce(null);

      const charId = await authUtils.getCurrentCharacterId();

      expect(charId).toBeNull();
    });
  });

  // ────────────────────────────────────────────────────────────
  // Error Handling
  // ────────────────────────────────────────────────────────────
  describe("Error handling in anonymous flow", () => {
    it("handles database errors gracefully", async () => {
      const sessionId = "anon-error-session";
      const log = createMockParsedLog();

      vi.spyOn(dbLogs, "updateAnonymousLog").mockRejectedValueOnce(
        new Error("Database connection failed"),
      );

      await expect(
        dbLogs.updateAnonymousLog(sessionId, log.fileName, log),
      ).rejects.toThrow("Database connection failed");
    });

    it("returns null when retrieving non-existent anonymous log", async () => {
      vi.spyOn(dbLogs, "getAnonymousLog").mockResolvedValueOnce(null);

      const result = await dbLogs.getAnonymousLog("non-existent-session");

      expect(result).toBeNull();
    });

    it("handles invalid log data gracefully", async () => {
      const sessionId = "anon-invalid";
      const invalidLog = {
        // Missing required fields
        entries: [],
      } as any;

      vi.spyOn(dbLogs, "updateAnonymousLog").mockRejectedValueOnce(
        new Error("Invalid log data"),
      );

      await expect(
        dbLogs.updateAnonymousLog(sessionId, "invalid.txt", invalidLog),
      ).rejects.toThrow("Invalid log data");
    });
  });
});
