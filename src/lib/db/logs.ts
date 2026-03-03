import type { ParsedLog } from "@/lib/types";
import type { Log, LogMetadata } from "@/lib/db/models";
import { query, queryAll, queryOne } from "@/lib/db/client";

type RawLog = Omit<Log, "log_data" | "metadata"> & {
  log_data: ParsedLog | string;
  metadata: LogMetadata | string | null;
};

function parseRecord(record: RawLog): Log {
  const parsedLogData =
    typeof record.log_data === "string"
      ? (JSON.parse(record.log_data) as ParsedLog)
      : record.log_data;
  const parsedMetadata =
    record.metadata === null || record.metadata === undefined
      ? null
      : typeof record.metadata === "string"
        ? (JSON.parse(record.metadata) as LogMetadata)
        : record.metadata;

  return {
    ...record,
    log_data: parsedLogData,
    metadata: parsedMetadata,
  };
}

function computeMetadata(logData: ParsedLog): LogMetadata {
  const start = logData.sessionStart
    ? new Date(logData.sessionStart).getTime()
    : null;
  const end = logData.sessionEnd ? new Date(logData.sessionEnd).getTime() : null;
  const combatDuration =
    start !== null && end !== null && end >= start ? end - start : undefined;

  return {
    combat_duration_ms: combatDuration,
    entries_count: logData.entries.length,
  };
}

export async function createLog(params: {
  user_id: string;
  filename: string;
  log_data: ParsedLog;
  metadata?: LogMetadata | null;
}): Promise<Log> {
  const result = await queryOne<RawLog>(
    "INSERT INTO logs (user_id, filename, log_data, metadata) VALUES ($1, $2, $3, $4) RETURNING *",
    [
      params.user_id,
      params.filename,
      JSON.stringify(params.log_data),
      params.metadata ? JSON.stringify(params.metadata) : null,
    ],
  );

  if (!result) {
    throw new Error("Failed to create log");
  }

  return parseRecord(result);
}

export async function getUserLogs(userId: string): Promise<Log[]> {
  const rows = await queryAll<RawLog>(
    "SELECT * FROM logs WHERE user_id = $1 ORDER BY created_at DESC",
    [userId],
  );

  return rows.map(parseRecord);
}

export async function getLog(
  logId: string,
  userId: string,
): Promise<Log | null> {
  const row = await queryOne<RawLog>(
    "SELECT * FROM logs WHERE id = $1 AND user_id = $2 LIMIT 1",
    [logId, userId],
  );

  return row ? parseRecord(row) : null;
}

export async function deleteLog(
  logId: string,
  userId: string,
): Promise<number> {
  const result = await query(
    "DELETE FROM logs WHERE id = $1 AND user_id = $2",
    [logId, userId],
  );

  return result.rowCount ?? 0;
}

export async function updateAnonymousLog(
  sessionId: string,
  filename: string,
  logData: ParsedLog,
): Promise<Log> {
  const existing = await queryOne<{ id: string }>(
    "SELECT id FROM logs WHERE user_id = $1 AND is_anonymous = true ORDER BY created_at DESC LIMIT 1",
    [sessionId],
  );

  const metadata = computeMetadata(logData);

  if (!existing) {
    const inserted = await queryOne<RawLog>(
      "INSERT INTO logs (user_id, filename, log_data, metadata, is_anonymous) VALUES ($1, $2, $3, $4, true) RETURNING *",
      [
        sessionId,
        filename,
        JSON.stringify(logData),
        JSON.stringify(metadata),
      ],
    );

    if (!inserted) {
      throw new Error("Failed to create anonymous log");
    }

    return parseRecord(inserted);
  }

  const updated = await queryOne<RawLog>(
    "UPDATE logs SET filename = $1, log_data = $2, metadata = $3, uploaded_at = NOW() WHERE id = $4 RETURNING *",
    [filename, JSON.stringify(logData), JSON.stringify(metadata), existing.id],
  );

  if (!updated) {
    throw new Error("Failed to update anonymous log");
  }

  return parseRecord(updated);
}

export async function getAnonymousLog(
  sessionId: string,
): Promise<Log | null> {
  const row = await queryOne<RawLog>(
    "SELECT * FROM logs WHERE user_id = $1 AND is_anonymous = true ORDER BY created_at DESC LIMIT 1",
    [sessionId],
  );

  return row ? parseRecord(row) : null;
}
