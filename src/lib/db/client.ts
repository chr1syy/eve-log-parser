interface QueryResult {
  rows: unknown[];
  rowCount: number;
}

export async function query(
  _sql: string,
  _params?: unknown[],
): Promise<QueryResult> {
  throw new Error("Database client not configured");
}

export async function queryOne<T>(
  _sql: string,
  _params?: unknown[],
): Promise<T | null> {
  throw new Error("Database client not configured");
}

export async function queryAll<T>(
  _sql: string,
  _params?: unknown[],
): Promise<T[]> {
  throw new Error("Database client not configured");
}
