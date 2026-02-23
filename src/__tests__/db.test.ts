/**
 * Unit Tests for Database Functions
 * Tests CRUD operations for logs with user ownership verification
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Log } from "@/lib/db/models";
import type { ParsedLog } from "@/lib/types";
import {
  createLog,
  getUserLogs,
  getLog,
  deleteLog,
  updateAnonymousLog,
  getAnonymousLog,
} from "@/lib/db/logs";
import * as dbClient from "@/lib/db/client";

// Mock the database client
vi.mock("@/lib/db/client", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  queryAll: vi.fn(),
}));

// Helper to create mock ParsedLog data
function createMockParsedLog(overrides?: Partial<ParsedLog>): ParsedLog {
  return {
    sessionId: "test-session-123",
    fileName: "test-log.txt",
    parsedAt: new Date("2025-02-23T10:00:00Z"),
    characterName: "Test Character",
    sessionStart: new Date("2025-02-23T09:00:00Z"),
    sessionEnd: new Date("2025-02-23T10:00:00Z"),
    entries: [
      {
        id: "entry-1",
        timestamp: new Date("2025-02-23T09:00:00Z"),
        rawLine:
          "[09:00:00] (combat) 100 from Test <color=0xff00ffff>Target</color> - Missile - Hits",
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

// Helper to create mock Log data
function createMockLog(overrides?: Partial<Log>): Log {
  return {
    id: "log-id-123",
    user_id: "user-id-123",
    filename: "test-log.txt",
    uploaded_at: new Date("2025-02-23T10:00:00Z"),
    log_data: createMockParsedLog(),
    metadata: {
      combat_duration_ms: 3600000,
      file_size: 5000,
      entries_count: 1,
    },
    created_at: new Date("2025-02-23T10:00:00Z"),
    ...overrides,
  };
}

describe("Database Logs Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────────────────────
  // createLog
  // ────────────────────────────────────────────────────────────
  describe("createLog", () => {
    it("creates a new log and returns it with parsed JSON data", async () => {
      const mockLog = createMockLog();
      const mockQueryOne = vi
        .spyOn(dbClient, "queryOne")
        .mockResolvedValueOnce({
          ...mockLog,
          log_data: JSON.stringify(mockLog.log_data),
          metadata: JSON.stringify(mockLog.metadata),
        });

      const result = await createLog({
        user_id: mockLog.user_id,
        filename: mockLog.filename,
        log_data: mockLog.log_data,
        metadata: mockLog.metadata,
      });

      expect(mockQueryOne).toHaveBeenCalledOnce();
      expect(result.id).toBeDefined();
      expect(result.user_id).toBe(mockLog.user_id);
      expect(result.filename).toBe(mockLog.filename);
      expect(typeof result.log_data).toBe("object");
      expect(result.log_data.stats.damageDealt).toBe(100);
    });

    it("parses stringified JSON data and metadata", async () => {
      const mockLog = createMockLog();
      vi.spyOn(dbClient, "queryOne").mockResolvedValueOnce({
        ...mockLog,
        log_data: JSON.stringify(mockLog.log_data),
        metadata: JSON.stringify(mockLog.metadata),
      });

      const result = await createLog({
        user_id: mockLog.user_id,
        filename: mockLog.filename,
        log_data: mockLog.log_data,
        metadata: mockLog.metadata,
      });

      expect(result.metadata?.entries_count).toBe(1);
      expect(result.log_data.stats.totalEvents).toBe(1);
    });

    it("handles null metadata", async () => {
      const mockLog = createMockLog();
      vi.spyOn(dbClient, "queryOne").mockResolvedValueOnce({
        ...mockLog,
        metadata: null,
        log_data: JSON.stringify(mockLog.log_data),
      });

      const result = await createLog({
        user_id: mockLog.user_id,
        filename: mockLog.filename,
        log_data: mockLog.log_data,
      });

      expect(result.metadata).toBeNull();
    });

    it("throws error if database insert fails", async () => {
      vi.spyOn(dbClient, "queryOne").mockResolvedValueOnce(null);

      await expect(
        createLog({
          user_id: "user-id-123",
          filename: "test.txt",
          log_data: createMockParsedLog(),
        }),
      ).rejects.toThrow("Failed to create log");
    });
  });

  // ────────────────────────────────────────────────────────────
  // getUserLogs
  // ────────────────────────────────────────────────────────────
  describe("getUserLogs", () => {
    it("returns all logs for a user ordered by most recent first", async () => {
      const mockLogs = [
        createMockLog({
          id: "log-1",
          created_at: new Date("2025-02-23T10:00:00Z"),
        }),
        createMockLog({
          id: "log-2",
          created_at: new Date("2025-02-23T09:00:00Z"),
        }),
        createMockLog({
          id: "log-3",
          created_at: new Date("2025-02-23T08:00:00Z"),
        }),
      ];

      vi.spyOn(dbClient, "queryAll").mockResolvedValueOnce(
        mockLogs.map((log) => ({
          ...log,
          log_data: JSON.stringify(log.log_data),
          metadata: JSON.stringify(log.metadata),
        })),
      );

      const results = await getUserLogs("user-id-123");

      expect(results).toHaveLength(3);
      expect(results[0].id).toBe("log-1");
      expect(results[1].id).toBe("log-2");
      expect(results[2].id).toBe("log-3");
      expect(typeof results[0].log_data).toBe("object");
    });

    it("returns empty array when user has no logs", async () => {
      vi.spyOn(dbClient, "queryAll").mockResolvedValueOnce([]);

      const results = await getUserLogs("user-id-no-logs");

      expect(results).toEqual([]);
    });

    it("parses JSON data for all returned logs", async () => {
      const mockLog1 = createMockLog({ id: "log-1" });
      const mockLog2 = createMockLog({ id: "log-2" });

      vi.spyOn(dbClient, "queryAll").mockResolvedValueOnce([
        {
          ...mockLog1,
          log_data: JSON.stringify(mockLog1.log_data),
          metadata: JSON.stringify(mockLog1.metadata),
        },
        {
          ...mockLog2,
          log_data: JSON.stringify(mockLog2.log_data),
          metadata: JSON.stringify(mockLog2.metadata),
        },
      ]);

      const results = await getUserLogs("user-id-123");

      results.forEach((log) => {
        expect(typeof log.log_data).toBe("object");
        expect(typeof log.metadata).toBe("object");
        expect(log.log_data.stats).toBeDefined();
      });
    });
  });

  // ────────────────────────────────────────────────────────────
  // getLog (ownership verification)
  // ────────────────────────────────────────────────────────────
  describe("getLog", () => {
    it("retrieves a specific log if user owns it", async () => {
      const mockLog = createMockLog();
      vi.spyOn(dbClient, "queryOne").mockResolvedValueOnce({
        ...mockLog,
        log_data: JSON.stringify(mockLog.log_data),
        metadata: JSON.stringify(mockLog.metadata),
      });

      const result = await getLog("log-id-123", "user-id-123");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("log-id-123");
      expect(result?.user_id).toBe("user-id-123");
      expect(typeof result?.log_data).toBe("object");
    });

    it("returns null if log does not belong to user", async () => {
      vi.spyOn(dbClient, "queryOne").mockResolvedValueOnce(null);

      const result = await getLog("log-id-123", "different-user-id");

      expect(result).toBeNull();
    });

    it("returns null if log does not exist", async () => {
      vi.spyOn(dbClient, "queryOne").mockResolvedValueOnce(null);

      const result = await getLog("non-existent-log", "user-id-123");

      expect(result).toBeNull();
    });

    it("verifies ownership by querying with both logId and userId", async () => {
      const mockLog = createMockLog();
      const queryOneSpy = vi.spyOn(dbClient, "queryOne").mockResolvedValueOnce({
        ...mockLog,
        log_data: JSON.stringify(mockLog.log_data),
        metadata: JSON.stringify(mockLog.metadata),
      });

      await getLog("log-id-123", "user-id-123");

      const callArgs = queryOneSpy.mock.calls[0];
      expect(callArgs[1]).toContain("log-id-123");
      expect(callArgs[1]).toContain("user-id-123");
    });
  });

  // ────────────────────────────────────────────────────────────
  // deleteLog (ownership verification)
  // ────────────────────────────────────────────────────────────
  describe("deleteLog", () => {
    it("deletes a log if user owns it and returns row count", async () => {
      const querySpy = vi.spyOn(dbClient, "query").mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      const result = await deleteLog("log-id-123", "user-id-123");

      expect(result).toBe(1);
      expect(querySpy).toHaveBeenCalledOnce();
    });

    it("returns 0 if log does not belong to user", async () => {
      vi.spyOn(dbClient, "query").mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await deleteLog("log-id-123", "different-user-id");

      expect(result).toBe(0);
    });

    it("returns 0 if log does not exist", async () => {
      vi.spyOn(dbClient, "query").mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await deleteLog("non-existent-log", "user-id-123");

      expect(result).toBe(0);
    });

    it("prevents access to other users logs via ownership check", async () => {
      const querySpy = vi.spyOn(dbClient, "query").mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await deleteLog("log-owned-by-other-user", "my-user-id");

      expect(result).toBe(0);
      const callArgs = querySpy.mock.calls[0];
      expect(callArgs[1]).toContain("log-owned-by-other-user");
      expect(callArgs[1]).toContain("my-user-id");
    });
  });

  // ────────────────────────────────────────────────────────────
  // updateAnonymousLog
  // ────────────────────────────────────────────────────────────
  describe("updateAnonymousLog", () => {
    it("creates a new anonymous log if none exists", async () => {
      const mockLog = createMockLog();
      const queryOneSpy = vi.spyOn(dbClient, "queryOne");

      // First call: check if log exists (returns null)
      // Second call: insert new log
      queryOneSpy.mockResolvedValueOnce(null).mockResolvedValueOnce({
        ...mockLog,
        log_data: JSON.stringify(mockLog.log_data),
        metadata: JSON.stringify(mockLog.metadata),
      });

      const result = await updateAnonymousLog(
        "session-123",
        "test.txt",
        mockLog.log_data,
      );

      expect(result).not.toBeNull();
      expect(result.user_id).toBe("session-123");
      expect(result.filename).toBe("test.txt");
      expect(typeof result.log_data).toBe("object");
    });

    it("updates existing anonymous log with new data", async () => {
      const mockLog = createMockLog();
      const existingLog = { id: "log-id-123" };
      const queryOneSpy = vi.spyOn(dbClient, "queryOne");

      // First call: check if log exists (returns existing)
      // Second call: update log
      queryOneSpy.mockResolvedValueOnce(existingLog).mockResolvedValueOnce({
        ...mockLog,
        log_data: JSON.stringify(mockLog.log_data),
        metadata: JSON.stringify(mockLog.metadata),
      });

      const result = await updateAnonymousLog(
        "session-123",
        "updated.txt",
        mockLog.log_data,
      );

      expect(result).not.toBeNull();
      expect(result.user_id).toBe("session-123");
      expect(result.filename).toBe("updated.txt");
    });

    it("sets metadata with combat duration and entries count", async () => {
      const mockLog = createMockLog();
      const queryOneSpy = vi.spyOn(dbClient, "queryOne");

      queryOneSpy
        .mockResolvedValueOnce(null) // log doesn't exist
        .mockResolvedValueOnce({
          ...mockLog,
          log_data: JSON.stringify(mockLog.log_data),
          metadata: JSON.stringify({
            combat_duration_ms: 3600000,
            entries_count: 1,
          }),
        });

      const result = await updateAnonymousLog(
        "session-123",
        "test.txt",
        mockLog.log_data,
      );

      expect(result.metadata?.entries_count).toBe(
        mockLog.log_data.entries.length,
      );
      expect(result.metadata?.combat_duration_ms).toBeDefined();
    });

    it("throws error if insert fails", async () => {
      const mockLog = createMockLog();
      const queryOneSpy = vi.spyOn(dbClient, "queryOne");

      queryOneSpy.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      await expect(
        updateAnonymousLog("session-123", "test.txt", mockLog.log_data),
      ).rejects.toThrow("Failed to create anonymous log");
    });

    it("throws error if update fails", async () => {
      const mockLog = createMockLog();
      const queryOneSpy = vi.spyOn(dbClient, "queryOne");

      queryOneSpy
        .mockResolvedValueOnce({ id: "existing-log" })
        .mockResolvedValueOnce(null);

      await expect(
        updateAnonymousLog("session-123", "test.txt", mockLog.log_data),
      ).rejects.toThrow("Failed to update anonymous log");
    });
  });

  // ────────────────────────────────────────────────────────────
  // getAnonymousLog
  // ────────────────────────────────────────────────────────────
  describe("getAnonymousLog", () => {
    it("retrieves the most recent anonymous log for a session", async () => {
      const mockLog = createMockLog();
      vi.spyOn(dbClient, "queryOne").mockResolvedValueOnce({
        ...mockLog,
        log_data: JSON.stringify(mockLog.log_data),
        metadata: JSON.stringify(mockLog.metadata),
      });

      const result = await getAnonymousLog("session-123");

      expect(result).not.toBeNull();
      expect(result?.user_id).toBe("session-123");
      expect(typeof result?.log_data).toBe("object");
    });

    it("returns null if no anonymous log exists for session", async () => {
      vi.spyOn(dbClient, "queryOne").mockResolvedValueOnce(null);

      const result = await getAnonymousLog("non-existent-session");

      expect(result).toBeNull();
    });

    it("parses JSON data correctly", async () => {
      const mockLog = createMockLog();
      vi.spyOn(dbClient, "queryOne").mockResolvedValueOnce({
        ...mockLog,
        log_data: JSON.stringify(mockLog.log_data),
        metadata: JSON.stringify(mockLog.metadata),
      });

      const result = await getAnonymousLog("session-123");

      expect(typeof result?.log_data).toBe("object");
      expect(result?.log_data.stats.damageDealt).toBe(100);
      expect(result?.metadata?.entries_count).toBe(1);
    });
  });

  // ────────────────────────────────────────────────────────────
  // Ownership Verification Integration
  // ────────────────────────────────────────────────────────────
  describe("Ownership verification", () => {
    it("prevents users from accessing logs belonging to other users", async () => {
      vi.spyOn(dbClient, "queryOne").mockResolvedValueOnce(null);

      const result = await getLog("other-users-log", "my-user-id");

      expect(result).toBeNull();
    });

    it("prevents users from deleting logs belonging to other users", async () => {
      vi.spyOn(dbClient, "query").mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await deleteLog("other-users-log", "my-user-id");

      expect(result).toBe(0);
    });

    it("getUserLogs only returns logs for the specified user", async () => {
      const userLogs = [
        createMockLog({ id: "log-1", user_id: "user-123" }),
        createMockLog({ id: "log-2", user_id: "user-123" }),
      ];

      vi.spyOn(dbClient, "queryAll").mockResolvedValueOnce(
        userLogs.map((log) => ({
          ...log,
          log_data: JSON.stringify(log.log_data),
          metadata: JSON.stringify(log.metadata),
        })),
      );

      const results = await getUserLogs("user-123");

      expect(results.every((log) => log.user_id === "user-123")).toBe(true);
    });
  });
});
