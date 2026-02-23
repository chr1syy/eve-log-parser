/**
 * Database Client - PostgreSQL connection pool management
 * Handles connection initialization, query execution, and cleanup
 */

import { Pool, type PoolClient, type QueryResult } from "pg";

let pool: Pool | null = null;

/**
 * Get or initialize the PostgreSQL connection pool
 */
function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
        "Configure it in .env.local or your deployment environment.",
    );
  }

  pool = new Pool({
    connectionString,
    // Connection pool settings
    max: 20, // Maximum connections in the pool
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Fail if can't connect within 5s
  });

  // Log pool errors (but don't throw - the application can continue)
  pool.on("error", (err) => {
    console.error("[DB Pool] Unexpected error on idle client", err);
  });

  return pool;
}

/**
 * Execute a query and return results
 */
export async function query<T = unknown>(
  text: string,
  values?: unknown[],
): Promise<QueryResult<T>> {
  const p = getPool();
  try {
    const result = await p.query<T>(text, values);
    return {
      rows: result.rows,
      rowCount: result.rowCount ?? 0,
    };
  } catch (err) {
    console.error("[DB Query] Error executing query:", {
      text,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Execute a query and return a single row or null
 */
export async function queryOne<T = unknown>(
  text: string,
  values?: unknown[],
): Promise<T | null> {
  const result = await query<T>(text, values);
  return result.rows[0] ?? null;
}

/**
 * Execute a query and return all rows
 */
export async function queryAll<T = unknown>(
  text: string,
  values?: unknown[],
): Promise<T[]> {
  const result = await query<T>(text, values);
  return result.rows;
}

/**
 * Begin a transaction
 */
export async function getClient(): Promise<PoolClient> {
  const p = getPool();
  return p.connect();
}

/**
 * Execute a query within a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Verify database connection is working
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const p = getPool();
    const result = await p.query("SELECT NOW()");
    return result.rows.length > 0;
  } catch (err) {
    console.error("[DB] Connection check failed:", err);
    return false;
  }
}

/**
 * Shutdown the connection pool gracefully
 */
export async function shutdown(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Initialize the database schema (run migrations)
 * In production, migrations should be run via proper migration tools
 */
export async function initializeSchema(): Promise<void> {
  const schemaPath = require("path").join(
    __dirname,
    "migrations/001_initial_schema.sql",
  );

  try {
    const fs = require("fs");
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
    await query(schemaSql);
    console.log("[DB] Schema initialized successfully");
  } catch (err) {
    console.error("[DB] Schema initialization failed:", err);
    throw err;
  }
}
