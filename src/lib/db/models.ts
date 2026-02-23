/**
 * Database Models - TypeScript interfaces matching PostgreSQL schema
 * These types represent the core database entities: User and Log
 */

import type { ParsedLog } from "../types";

/**
 * User model - represents an EVE Online character authenticated via OAuth SSO
 */
export interface User {
  id: string; // UUID
  character_id: number;
  character_name: string;
  corp_id?: number;
  corp_name?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Log model - represents a single uploaded EVE combat log
 */
export interface Log {
  id: string; // UUID
  user_id: string; // FK to users.id
  filename: string;
  uploaded_at: Date;
  log_data: ParsedLog; // Full parsed log object stored as JSONB
  metadata?: {
    combat_duration_ms?: number;
    file_size?: number;
    entries_count?: number;
    [key: string]: unknown;
  };
  created_at: Date;
}

/**
 * Query result types for common database operations
 */

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

export interface CreateUserInput {
  character_id: number;
  character_name: string;
  corp_id?: number;
  corp_name?: string;
}

export interface CreateLogInput {
  user_id: string;
  filename: string;
  log_data: ParsedLog;
  metadata?: Log["metadata"];
}
