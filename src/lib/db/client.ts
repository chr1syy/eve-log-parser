interface QueryResult {
  rows: unknown[];
  rowCount: number;
}

export async function query(
  sql: string,
  params?: unknown[],
): Promise<QueryResult> {
  void sql;
  void params;
  throw new Error("Database client not configured");
}

export async function queryOne<T>(
  sql: string,
  params?: unknown[],
): Promise<T | null> {
  void sql;
  void params;
  throw new Error("Database client not configured");
}

export async function queryAll<T>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  void sql;
  void params;
  throw new Error("Database client not configured");
}
