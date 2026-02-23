/**
 * Logs Database Functions
 * Provides CRUD operations for logs with user ownership verification
 */

import { randomUUID } from "crypto";
import type { ParsedLog } from "../types";
import type { Log, CreateLogInput } from "./models";
import { query, queryOne, queryAll } from "./client";

/**
 * Create a new log for an authenticated user
 * @param input - CreateLogInput with user_id, filename, log_data, and optional metadata
 * @returns The created Log record
 */
export async function createLog(input: CreateLogInput): Promise<Log> {
  const logId = randomUUID();
  const now = new Date();

  const result = await queryOne<Log>(
    `
    INSERT INTO logs (id, user_id, filename, uploaded_at, log_data, metadata, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, user_id, filename, uploaded_at, log_data, metadata, created_at
    `,
    [
      logId,
      input.user_id,
      input.filename,
      now,
      JSON.stringify(input.log_data),
      input.metadata ? JSON.stringify(input.metadata) : null,
      now,
    ],
  );

  if (!result) {
    throw new Error("Failed to create log");
  }

  // Ensure log_data is returned as the object, not a string
  return {
    ...result,
    log_data:
      typeof result.log_data === "string"
        ? JSON.parse(result.log_data)
        : result.log_data,
    metadata:
      typeof result.metadata === "string"
        ? JSON.parse(result.metadata)
        : result.metadata,
  };
}

/**
 * Get all logs for a specific user, ordered by most recent first
 * @param userId - The user ID to fetch logs for
 * @returns Array of Log records belonging to the user
 */
export async function getUserLogs(userId: string): Promise<Log[]> {
  const results = await queryAll<Log>(
    `
    SELECT id, user_id, filename, uploaded_at, log_data, metadata, created_at
    FROM logs
    WHERE user_id = $1
    ORDER BY created_at DESC
    `,
    [userId],
  );

  return results.map((log) => ({
    ...log,
    log_data:
      typeof log.log_data === "string"
        ? JSON.parse(log.log_data)
        : log.log_data,
    metadata:
      typeof log.metadata === "string"
        ? JSON.parse(log.metadata)
        : log.metadata,
  }));
}

/**
 * Get a specific log by ID, verifying ownership
 * @param logId - The log ID to fetch
 * @param userId - The user ID (used to verify ownership)
 * @returns The Log record if it belongs to the user, or null if not found/not owned
 */
export async function getLog(
  logId: string,
  userId: string,
): Promise<Log | null> {
  const result = await queryOne<Log>(
    `
    SELECT id, user_id, filename, uploaded_at, log_data, metadata, created_at
    FROM logs
    WHERE id = $1 AND user_id = $2
    `,
    [logId, userId],
  );

  if (!result) {
    return null;
  }

  return {
    ...result,
    log_data:
      typeof result.log_data === "string"
        ? JSON.parse(result.log_data)
        : result.log_data,
    metadata:
      typeof result.metadata === "string"
        ? JSON.parse(result.metadata)
        : result.metadata,
  };
}

/**
 * Delete a log by ID, verifying ownership
 * @param logId - The log ID to delete
 * @param userId - The user ID (used to verify ownership)
 * @returns The number of rows deleted (0 if not found or not owned, 1 if deleted)
 */
export async function deleteLog(
  logId: string,
  userId: string,
): Promise<number> {
  const result = await query(
    `
    DELETE FROM logs
    WHERE id = $1 AND user_id = $2
    `,
    [logId, userId],
  );

  return result.rowCount;
}

/**
 * Update or create an anonymous log (single log per session)
 * For unauthenticated users, logs are stored with a session ID instead of user_id
 * @param sessionId - The anonymous session ID
 * @param filename - The log filename
 * @param logData - The parsed log data
 * @returns The created or updated Log record
 */
export async function updateAnonymousLog(
  sessionId: string,
  filename: string,
  logData: ParsedLog,
): Promise<Log> {
  const now = new Date();

  // For anonymous logs, we use the sessionId as user_id
  // First, check if a log already exists for this session
  const existing = await queryOne<{ id: string }>(
    `
    SELECT id FROM logs
    WHERE user_id = $1
    LIMIT 1
    `,
    [sessionId],
  );

  if (existing) {
    // Update existing anonymous log
    const result = await queryOne<Log>(
      `
      UPDATE logs
      SET filename = $1, uploaded_at = $2, log_data = $3, metadata = $4
      WHERE user_id = $5
      RETURNING id, user_id, filename, uploaded_at, log_data, metadata, created_at
      `,
      [
        filename,
        now,
        JSON.stringify(logData),
        JSON.stringify({
          combat_duration_ms: logData.stats.activeTimeMinutes
            ? logData.stats.activeTimeMinutes * 60 * 1000
            : undefined,
          entries_count: logData.entries.length,
        }),
        sessionId,
      ],
    );

    if (!result) {
      throw new Error("Failed to update anonymous log");
    }

    return {
      ...result,
      log_data:
        typeof result.log_data === "string"
          ? JSON.parse(result.log_data)
          : result.log_data,
      metadata:
        typeof result.metadata === "string"
          ? JSON.parse(result.metadata)
          : result.metadata,
    };
  } else {
    // Create new anonymous log
    const logId = randomUUID();

    const result = await queryOne<Log>(
      `
      INSERT INTO logs (id, user_id, filename, uploaded_at, log_data, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, user_id, filename, uploaded_at, log_data, metadata, created_at
      `,
      [
        logId,
        sessionId,
        filename,
        now,
        JSON.stringify(logData),
        JSON.stringify({
          combat_duration_ms: logData.stats.activeTimeMinutes
            ? logData.stats.activeTimeMinutes * 60 * 1000
            : undefined,
          entries_count: logData.entries.length,
        }),
        now,
      ],
    );

    if (!result) {
      throw new Error("Failed to create anonymous log");
    }

    return {
      ...result,
      log_data:
        typeof result.log_data === "string"
          ? JSON.parse(result.log_data)
          : result.log_data,
      metadata:
        typeof result.metadata === "string"
          ? JSON.parse(result.metadata)
          : result.metadata,
    };
  }
}

/**
 * Get an anonymous log by session ID
 * @param sessionId - The anonymous session ID
 * @returns The Log record or null if not found
 */
export async function getAnonymousLog(sessionId: string): Promise<Log | null> {
  const result = await queryOne<Log>(
    `
    SELECT id, user_id, filename, uploaded_at, log_data, metadata, created_at
    FROM logs
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [sessionId],
  );

  if (!result) {
    return null;
  }

  return {
    ...result,
    log_data:
      typeof result.log_data === "string"
        ? JSON.parse(result.log_data)
        : result.log_data,
    metadata:
      typeof result.metadata === "string"
        ? JSON.parse(result.metadata)
        : result.metadata,
  };
}
