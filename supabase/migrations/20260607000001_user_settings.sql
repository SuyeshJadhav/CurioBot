-- Create user_settings table for storing user preference configurations
CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Seed default settings for the system wonder user
INSERT INTO user_settings (user_id, settings)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '{"reading_time":"5min","knowledge_level":"intermediate","topic_novelty":"wildcard","model":"gemini-3.1-flash-lite"}'::jsonb
)
ON CONFLICT (user_id) DO NOTHING;

-- Migrate existing settings from library_collections to user_settings if any exist
INSERT INTO user_settings (user_id, settings, created_at)
SELECT user_id, description::jsonb, created_at
FROM library_collections
WHERE name = '__settings__'
ON CONFLICT (user_id) DO UPDATE
SET settings = EXCLUDED.settings;

-- Clean up settings records from library_collections
DELETE FROM library_collections
WHERE name = '__settings__';
