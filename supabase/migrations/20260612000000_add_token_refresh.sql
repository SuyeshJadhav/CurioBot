-- Add last_token_refresh column to track 24-hour auto-refresh window
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_token_refresh TIMESTAMPTZ NOT NULL DEFAULT NOW();
