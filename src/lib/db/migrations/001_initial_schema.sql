-- EVE Log Parser: Initial Database Schema
-- Created: 2026-02-23
-- Manages authenticated users and their EVE log uploads

-- Users table: stores EVE Online character information for authenticated users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id BIGINT NOT NULL UNIQUE,
  character_name VARCHAR(255) NOT NULL,
  corp_id BIGINT,
  corp_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on character_id for fast lookups by EVE character ID
CREATE INDEX IF NOT EXISTS idx_users_character_id ON users(character_id);

-- Logs table: stores uploaded EVE logs with full log data and metadata
CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  log_data JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on user_id for fast lookups of logs by user
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);

-- Index on user_id and created_at for efficient chronological queries
CREATE INDEX IF NOT EXISTS idx_logs_user_created ON logs(user_id, created_at DESC);

-- Comment on schema design
COMMENT ON TABLE users IS 'EVE Online character accounts authenticated via OAuth 2.0 SSO';
COMMENT ON TABLE logs IS 'Combat and game logs uploaded by authenticated users, stored with full parsed data';
COMMENT ON COLUMN logs.log_data IS 'Complete parsed log as JSONB (ParsedLog structure)';
COMMENT ON COLUMN logs.metadata IS 'Optional metadata: combat duration, file size, etc.';
