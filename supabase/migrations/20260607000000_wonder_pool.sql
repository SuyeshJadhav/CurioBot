-- Add rabbit_holes and tldr columns to the articles table if they do not exist
ALTER TABLE articles ADD COLUMN IF NOT EXISTS rabbit_holes jsonb;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS tldr text;

-- Create wonder_pool table for pre-generating articles
CREATE TABLE IF NOT EXISTS wonder_pool (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  summary text,
  domain text,
  article text,
  rabbit_holes jsonb,
  created_at timestamp with time zone default now(),
  used_at timestamp with time zone
);

-- Ensure a default system wonder user exists in the users table
INSERT INTO users (id, email, username, password_hash)
VALUES ('00000000-0000-0000-0000-000000000000', 'system-wonder@curiobot.ai', 'system-wonder', 'system-generated-hash-disabled-login')
ON CONFLICT (id) DO NOTHING;

-- Insert default settings for the system wonder user
INSERT INTO library_collections (user_id, name, description)
VALUES ('00000000-0000-0000-0000-000000000000', '__settings__', '{"reading_time":"5min","knowledge_level":"intermediate","topic_novelty":"wildcard","model":"gemini-3.1-flash-lite"}')
ON CONFLICT DO NOTHING;
