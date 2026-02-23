-- EVE Log Parser: Complete Database Initialization
-- Database: eve_logs
-- Purpose: Initialize all tables, indexes, and schema for EVE SSO integration with multi-character log management
-- Version: 1.0.0
-- Created: 2026-02-23

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Stores authenticated EVE Online characters from OAuth 2.0 SSO
-- Each user record represents a unique character authenticated via EVE Online
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id BIGINT NOT NULL UNIQUE,
  character_name VARCHAR(255) NOT NULL,
  corp_id BIGINT,
  corp_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on character_id for fast OAuth lookups by EVE character ID
-- Used when creating new sessions or verifying character ownership
CREATE INDEX IF NOT EXISTS idx_users_character_id ON users(character_id);

-- Comment on table and columns
COMMENT ON TABLE users IS 'EVE Online character accounts authenticated via OAuth 2.0 SSO. One record per authenticated character.';
COMMENT ON COLUMN users.id IS 'Unique identifier (UUID) for the user record in application database';
COMMENT ON COLUMN users.character_id IS 'EVE Online character ID (unique, indexed for fast OAuth lookups)';
COMMENT ON COLUMN users.character_name IS 'EVE Online character name (display name)';
COMMENT ON COLUMN users.corp_id IS 'EVE Online corporation ID at time of authentication';
COMMENT ON COLUMN users.corp_name IS 'EVE Online corporation name at time of authentication';
COMMENT ON COLUMN users.created_at IS 'Timestamp when character first authenticated with application';
COMMENT ON COLUMN users.updated_at IS 'Timestamp of last session or profile update';

-- ============================================================================
-- LOGS TABLE
-- ============================================================================
-- Stores EVE Online combat and game logs uploaded by authenticated users
-- Each log represents a single file upload with complete parsed data and metadata
CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  log_data JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on user_id for fast log lookups by user
-- Used for: "SELECT * FROM logs WHERE user_id = ?"
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);

-- Composite index on (user_id, created_at DESC) for efficient chronological queries
-- Used for: "SELECT * FROM logs WHERE user_id = ? ORDER BY created_at DESC LIMIT n"
-- This is the primary query pattern for displaying user's log history
CREATE INDEX IF NOT EXISTS idx_logs_user_created ON logs(user_id, created_at DESC);

-- Comment on table and columns
COMMENT ON TABLE logs IS 'Combat and game logs uploaded by authenticated users. Stores full parsed log data and associated metadata. Deleted automatically when user is deleted (CASCADE).';
COMMENT ON COLUMN logs.id IS 'Unique identifier (UUID) for the log record';
COMMENT ON COLUMN logs.user_id IS 'Foreign key reference to users.id. Enforces cascade delete.';
COMMENT ON COLUMN logs.filename IS 'Original filename of the uploaded log file (e.g., "2026-02-23_combat.log")';
COMMENT ON COLUMN logs.uploaded_at IS 'Timestamp when log was uploaded by user (user-facing upload time)';
COMMENT ON COLUMN logs.log_data IS 'Complete parsed log as JSONB (ParsedLog structure). Contains all combat events, participants, timeline data.';
COMMENT ON COLUMN logs.metadata IS 'Optional JSON metadata extracted from log: combat_duration, file_size_bytes, total_damage, participants_count, etc.';
COMMENT ON COLUMN logs.created_at IS 'Timestamp when log record was created in database (insertion time)';

-- ============================================================================
-- SCHEMA DESIGN NOTES
-- ============================================================================
-- CASCADE DELETE: When a user is deleted, all associated logs are automatically deleted.
-- No orphaned logs remain in the database.
--
-- JSONB Storage: log_data is stored as JSONB for efficient querying and indexing of
-- nested combat data. Metadata is optional and can vary per log.
--
-- Indexes Strategy:
--   - idx_users_character_id: Fast OAuth lookups (user registration/login verification)
--   - idx_logs_user_id: Basic user log listing
--   - idx_logs_user_created: Optimized for paginated history view with chronological ordering
--
-- Scaling Considerations:
--   - For very large deployments, consider partitioning logs by user_id or time range
--   - Monitor index size and query performance as log volume grows
--   - Archive old logs to separate tables if needed (e.g., logs_archive_2025)
