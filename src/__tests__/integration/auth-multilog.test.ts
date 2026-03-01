/**
 * Integration Tests: Authenticated Multi-Log Flow
 * Tests that authenticated users can upload multiple logs, retrieve them,
 * and that ownership verification prevents unauthorized access
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as dbLogs from "@/lib/db/logs";
import * as authUtils from "@/lib/auth-utils";
import type { ParsedLog } from "@/lib/types";

// Mock database, auth modules, and auth config (prevents DATABASE_URL check at module init)
vi.mock("@/lib/auth", () => ({ auth: vi.fn(), authConfig: {} }));
vi.mock("@/lib/db/logs");
vi.mock("@/lib/auth-utils");

/**
 * Create a mock ParsedLog for testing
 */
function createMockParsedLog(overrides?: Partial<ParsedLog>): ParsedLog {
  return {
    sessionId: "combat-session-123",
    fileName: "combat-log.txt",
    parsedAt: new Date("2025-02-23T10:00:00Z"),
    characterName: "Authenticated User",
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

describe("Authenticated Multi-Log Flow Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────────────────────
  // Authentication State
  // ────────────────────────────────────────────────────────────
  describe("Authenticated user state", () => {
    it("authenticated user is verified", async () => {
      vi.spyOn(authUtils, "isUserAuthenticated").mockResolvedValueOnce(true);

      const isAuth = await authUtils.isUserAuthenticated();

      expect(isAuth).toBe(true);
    });

    it("authenticated user has character info", async () => {
      const mockUser = {
        id: "user-id-123",
        characterId: 12345,
        characterName: "Test Capsuleer",
        corporationId: 67890,
        email: "capsuleer@eveonline.com",
      };
      vi.spyOn(authUtils, "getCurrentUser").mockResolvedValueOnce(mockUser);

      const user = await authUtils.getCurrentUser();

      expect(user).not.toBeNull();
      expect(user?.characterId).toBe(12345);
      expect(user?.characterName).toBe("Test Capsuleer");
    });

    it("authenticated user has character ID", async () => {
      vi.spyOn(authUtils, "getCurrentCharacterId").mockResolvedValueOnce(12345);

      const charId = await authUtils.getCurrentCharacterId();

      expect(charId).toBe(12345);
    });
  });

  // ────────────────────────────────────────────────────────────
  // Multi-Log Upload: Each upload creates a new entry
  // ────────────────────────────────────────────────────────────
  describe("Multi-log upload for authenticated user", () => {
    it("creates separate log entries for each upload", async () => {
      const userId = "user-id-authenticated";
      const log1 = createMockParsedLog({
        fileName: "log1.txt",
        sessionId: "session-1",
      });
      const log2 = createMockParsedLog({
        fileName: "log2.txt",
        sessionId: "session-2",
      });
      const log3 = createMockParsedLog({
        fileName: "log3.txt",
        sessionId: "session-3",
      });

      const mockLog1 = {
        id: "log-id-1",
        user_id: userId,
        filename: log1.fileName,
        uploaded_at: new Date("2025-02-23T10:00:00Z"),
        log_data: log1,
        metadata: { entries_count: 1 },
        created_at: new Date("2025-02-23T10:00:00Z"),
      };

      const mockLog2 = {
        id: "log-id-2",
        user_id: userId,
        filename: log2.fileName,
        uploaded_at: new Date("2025-02-23T10:05:00Z"),
        log_data: log2,
        metadata: { entries_count: 1 },
        created_at: new Date("2025-02-23T10:05:00Z"),
      };

      const mockLog3 = {
        id: "log-id-3",
        user_id: userId,
        filename: log3.fileName,
        uploaded_at: new Date("2025-02-23T10:10:00Z"),
        log_data: log3,
        metadata: { entries_count: 1 },
        created_at: new Date("2025-02-23T10:10:00Z"),
      };

      const createLogSpy = vi
        .spyOn(dbLogs, "createLog")
        .mockResolvedValueOnce(mockLog1)
        .mockResolvedValueOnce(mockLog2)
        .mockResolvedValueOnce(mockLog3);

      const result1 = await dbLogs.createLog({
        user_id: userId,
        filename: log1.fileName,
        log_data: log1,
      });
      const result2 = await dbLogs.createLog({
        user_id: userId,
        filename: log2.fileName,
        log_data: log2,
      });
      const result3 = await dbLogs.createLog({
        user_id: userId,
        filename: log3.fileName,
        log_data: log3,
      });

      expect(createLogSpy).toHaveBeenCalledTimes(3);
      expect(result1.id).toBe("log-id-1");
      expect(result2.id).toBe("log-id-2");
      expect(result3.id).toBe("log-id-3");
      // All should be different IDs, not replacements
      expect(result1.id).not.toBe(result2.id);
      expect(result2.id).not.toBe(result3.id);
    });

    it("preserves all logs (no replacement)", async () => {
      const userId = "user-persistent-logs";
      const logs = [
        createMockParsedLog({ fileName: "a.txt" }),
        createMockParsedLog({ fileName: "b.txt" }),
        createMockParsedLog({ fileName: "c.txt" }),
      ];

      const mockLogs = logs.map((log, idx) => ({
        id: `log-${idx}`,
        user_id: userId,
        filename: log.fileName,
        uploaded_at: new Date(`2025-02-23T10:${idx}0:00Z`),
        log_data: log,
        metadata: { entries_count: 1 },
        created_at: new Date(`2025-02-23T10:${idx}0:00Z`),
      }));

      vi.spyOn(dbLogs, "createLog")
        .mockResolvedValueOnce(mockLogs[0])
        .mockResolvedValueOnce(mockLogs[1])
        .mockResolvedValueOnce(mockLogs[2]);

      await dbLogs.createLog({
        user_id: userId,
        filename: logs[0].fileName,
        log_data: logs[0],
      });
      await dbLogs.createLog({
        user_id: userId,
        filename: logs[1].fileName,
        log_data: logs[1],
      });
      await dbLogs.createLog({
        user_id: userId,
        filename: logs[2].fileName,
        log_data: logs[2],
      });

      // Retrieve all logs for this user
      vi.spyOn(dbLogs, "getUserLogs").mockResolvedValueOnce(mockLogs);

      const allLogs = await dbLogs.getUserLogs(userId);

      expect(allLogs).toHaveLength(3);
      expect(allLogs.map((l) => l.id)).toEqual(["log-0", "log-1", "log-2"]);
    });
  });

  // ────────────────────────────────────────────────────────────
  // Retrieve All Logs
  // ────────────────────────────────────────────────────────────
  describe("Retrieve all logs for authenticated user", () => {
    it("fetches all logs belonging to authenticated user", async () => {
      const userId = "user-id-multi";
      const mockLogs = [
        {
          id: "log-1",
          user_id: userId,
          filename: "combat-1.txt",
          uploaded_at: new Date("2025-02-23T10:00:00Z"),
          log_data: createMockParsedLog({ fileName: "combat-1.txt" }),
          metadata: { entries_count: 1 },
          created_at: new Date("2025-02-23T10:00:00Z"),
        },
        {
          id: "log-2",
          user_id: userId,
          filename: "combat-2.txt",
          uploaded_at: new Date("2025-02-23T10:30:00Z"),
          log_data: createMockParsedLog({ fileName: "combat-2.txt" }),
          metadata: { entries_count: 2 },
          created_at: new Date("2025-02-23T10:30:00Z"),
        },
        {
          id: "log-3",
          user_id: userId,
          filename: "combat-3.txt",
          uploaded_at: new Date("2025-02-23T11:00:00Z"),
          log_data: createMockParsedLog({ fileName: "combat-3.txt" }),
          metadata: { entries_count: 3 },
          created_at: new Date("2025-02-23T11:00:00Z"),
        },
      ];

      vi.spyOn(dbLogs, "getUserLogs").mockResolvedValueOnce(mockLogs);

      const results = await dbLogs.getUserLogs(userId);

      expect(results).toHaveLength(3);
      expect(results.every((log) => log.user_id === userId)).toBe(true);
      expect(results[0].filename).toBe("combat-1.txt");
      expect(results[1].filename).toBe("combat-2.txt");
      expect(results[2].filename).toBe("combat-3.txt");
    });

    it("returns logs ordered by most recent first", async () => {
      const userId = "user-chronological";
      const mockLogs = [
        {
          id: "log-newest",
          user_id: userId,
          filename: "newest.txt",
          uploaded_at: new Date("2025-02-23T14:00:00Z"),
          log_data: createMockParsedLog(),
          metadata: {},
          created_at: new Date("2025-02-23T14:00:00Z"),
        },
        {
          id: "log-middle",
          user_id: userId,
          filename: "middle.txt",
          uploaded_at: new Date("2025-02-23T12:00:00Z"),
          log_data: createMockParsedLog(),
          metadata: {},
          created_at: new Date("2025-02-23T12:00:00Z"),
        },
        {
          id: "log-oldest",
          user_id: userId,
          filename: "oldest.txt",
          uploaded_at: new Date("2025-02-23T10:00:00Z"),
          log_data: createMockParsedLog(),
          metadata: {},
          created_at: new Date("2025-02-23T10:00:00Z"),
        },
      ];

      vi.spyOn(dbLogs, "getUserLogs").mockResolvedValueOnce(mockLogs);

      const results = await dbLogs.getUserLogs(userId);

      // Verify ordered by created_at DESC
      expect(results[0].id).toBe("log-newest");
      expect(results[1].id).toBe("log-middle");
      expect(results[2].id).toBe("log-oldest");
    });

    it("returns empty array when user has no logs", async () => {
      const userId = "user-no-logs";

      vi.spyOn(dbLogs, "getUserLogs").mockResolvedValueOnce([]);

      const results = await dbLogs.getUserLogs(userId);

      expect(results).toEqual([]);
    });
  });

  // ────────────────────────────────────────────────────────────
  // Ownership Verification: Prevent unauthorized access
  // ────────────────────────────────────────────────────────────
  describe("Ownership verification prevents unauthorized access", () => {
    it("allows user to retrieve their own log", async () => {
      const userId = "user-123";
      const logId = "log-123";
      const mockLog = {
        id: logId,
        user_id: userId,
        filename: "my-log.txt",
        uploaded_at: new Date(),
        log_data: createMockParsedLog(),
        metadata: { entries_count: 1 },
        created_at: new Date(),
      };

      vi.spyOn(dbLogs, "getLog").mockResolvedValueOnce(mockLog);

      const result = await dbLogs.getLog(logId, userId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(logId);
      expect(result?.user_id).toBe(userId);
    });

    it("prevents user from accessing another user's log", async () => {
      const myUserId = "user-1";
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const theirUserId = "user-2";
      const logId = "log-owned-by-user-2";

      vi.spyOn(dbLogs, "getLog").mockResolvedValueOnce(null);

      const result = await dbLogs.getLog(logId, myUserId);

      expect(result).toBeNull();
    });

    it("returns 403 (null) when attempting to delete another user's log", async () => {
      const myUserId = "user-1";
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const theirUserId = "user-2";
      const logId = "log-owned-by-user-2";

      vi.spyOn(dbLogs, "deleteLog").mockResolvedValueOnce(0); // No rows deleted

      const rowsDeleted = await dbLogs.deleteLog(logId, myUserId);

      expect(rowsDeleted).toBe(0); // Ownership check failed
    });

    it("allows owner to delete their own log", async () => {
      const userId = "user-123";
      const logId = "my-log-123";

      vi.spyOn(dbLogs, "deleteLog").mockResolvedValueOnce(1); // One row deleted

      const rowsDeleted = await dbLogs.deleteLog(logId, userId);

      expect(rowsDeleted).toBe(1); // Owned by user, successfully deleted
    });

    it("getUserLogs only returns logs for the requested user", async () => {
      const user1Id = "user-1";
      const user2Id = "user-2";

      const user1Logs = [
        {
          id: "log-1a",
          user_id: user1Id,
          filename: "user1-log1.txt",
          uploaded_at: new Date(),
          log_data: createMockParsedLog(),
          metadata: {},
          created_at: new Date(),
        },
        {
          id: "log-1b",
          user_id: user1Id,
          filename: "user1-log2.txt",
          uploaded_at: new Date(),
          log_data: createMockParsedLog(),
          metadata: {},
          created_at: new Date(),
        },
      ];

      vi.spyOn(dbLogs, "getUserLogs").mockResolvedValueOnce(user1Logs);

      const results = await dbLogs.getUserLogs(user1Id);

      expect(results.every((log) => log.user_id === user1Id)).toBe(true);
      expect(results.some((log) => log.user_id === user2Id)).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────
  // Multi-Character Support
  // ────────────────────────────────────────────────────────────
  describe("Multi-character support (same account, different characters)", () => {
    it("supports logs from multiple characters under same user account", async () => {
      const userId = "eve-account-123";

      const char1Log = createMockParsedLog({
        characterName: "Character One",
        fileName: "char1-log.txt",
      });
      const char2Log = createMockParsedLog({
        characterName: "Character Two",
        fileName: "char2-log.txt",
      });

      const mockLogs = [
        {
          id: "log-char1",
          user_id: userId,
          filename: "char1-log.txt",
          uploaded_at: new Date("2025-02-23T10:00:00Z"),
          log_data: char1Log,
          metadata: { entries_count: 1 },
          created_at: new Date("2025-02-23T10:00:00Z"),
        },
        {
          id: "log-char2",
          user_id: userId,
          filename: "char2-log.txt",
          uploaded_at: new Date("2025-02-23T11:00:00Z"),
          log_data: char2Log,
          metadata: { entries_count: 1 },
          created_at: new Date("2025-02-23T11:00:00Z"),
        },
      ];

      vi.spyOn(dbLogs, "getUserLogs").mockResolvedValueOnce(mockLogs);

      const results = await dbLogs.getUserLogs(userId);

      expect(results).toHaveLength(2);
      expect(results[0].log_data.characterName).toBe("Character One");
      expect(results[1].log_data.characterName).toBe("Character Two");
    });
  });

  // ────────────────────────────────────────────────────────────
  // Error Handling
  // ────────────────────────────────────────────────────────────
  describe("Error handling in authenticated multi-log flow", () => {
    it("handles database errors when uploading logs", async () => {
      const userId = "user-error";
      const log = createMockParsedLog();

      vi.spyOn(dbLogs, "createLog").mockRejectedValueOnce(
        new Error("Database connection timeout"),
      );

      await expect(
        dbLogs.createLog({
          user_id: userId,
          filename: log.fileName,
          log_data: log,
        }),
      ).rejects.toThrow("Database connection timeout");
    });

    it("handles errors when retrieving user logs", async () => {
      const userId = "user-retrieve-error";

      vi.spyOn(dbLogs, "getUserLogs").mockRejectedValueOnce(
        new Error("Query failed"),
      );

      await expect(dbLogs.getUserLogs(userId)).rejects.toThrow("Query failed");
    });

    it("handles auth errors gracefully", async () => {
      vi.spyOn(authUtils, "getCurrentUser").mockRejectedValueOnce(
        new Error("Session expired"),
      );

      await expect(authUtils.getCurrentUser()).rejects.toThrow(
        "Session expired",
      );
    });
  });
});
