# CurioBot Production Deployment Guide

Follow this guide to set up the production environment variables, apply the database migrations, and deploy the backend to Railway and frontend to Vercel.

---

## 1. Supabase Database Migrations

You can apply the database migrations either by running the Supabase CLI or by copy-pasting the scripts directly into the **SQL Editor** on your Supabase dashboard.

Below are the SQL statements from the migrations in chronological order. Copy and run them in your Supabase SQL Editor:

### Migration 0: Initial Schema creation
```sql
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create articles table
CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  domain text NOT NULL,
  summary text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create interests table
CREATE TABLE IF NOT EXISTS interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interest text NOT NULL,
  embedding vector(768) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT unique_user_interest UNIQUE (user_id, interest)
);

-- Create seen_topics table
CREATE TABLE IF NOT EXISTS seen_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  embedding vector(768) NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create library_collections table
CREATE TABLE IF NOT EXISTS library_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create library_articles table
CREATE TABLE IF NOT EXISTS library_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES library_collections(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT unique_collection_article UNIQUE (collection_id, article_id)
);

-- Create saved_sketches table
CREATE TABLE IF NOT EXISTS saved_sketches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT unique_user_article_sketch UNIQUE (user_id, article_id)
);

-- Create daily_wonders table
CREATE TABLE IF NOT EXISTS daily_wonders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  summary text NOT NULL,
  domain text NOT NULL,
  publish_date date UNIQUE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  article_id uuid REFERENCES articles(id) ON DELETE SET NULL
);
```

### Migration 1: pgvector Similarity Search
```sql
-- Create pgvector similarity search function for seen_topics
create or replace function match_seen_topics (
  p_user_id uuid,
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  topic text,
  similarity float
)
language sql stable
as $$
  select
    topic,
    1 - (seen_topics.embedding <=> query_embedding) as similarity
  from seen_topics
  where seen_topics.user_id = p_user_id
    and 1 - (seen_topics.embedding <=> query_embedding) > match_threshold
  order by seen_topics.embedding <=> query_embedding
  limit match_count;
$$;
```

### Migration 2: Wonder Pool Table & System User
```sql
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
```

### Migration 3: User Settings Table
```sql
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
```

### Migration 4: Article Reads (Streaks) Table
```sql
-- Create article_reads table for tracking user article reads and reading streaks
CREATE TABLE IF NOT EXISTS article_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  read_at timestamp with time zone DEFAULT now()
);

-- Create index for querying read logs by user_id and read_at date
CREATE INDEX IF NOT EXISTS idx_article_reads_user_id_read_at ON article_reads(user_id, read_at DESC);
```

---

## 2. Production Environment Variables Configuration

Set these keys in your deployment platform dashboards.

### Backend (Railway)
*   `PORT` (defaults to `3001` or what Railway assigns dynamically)
*   `JWT_SECRET` (generate a secure random string)
*   `GEMINI_API_KEY` (production key from Google AI Studio)
*   `TAVILY_API_KEY` (production key from Tavily dashboard)
*   `SUPABASE_URL` (production database URL)
*   `SUPABASE_SERVICE_ROLE_KEY` (production service role key for admin DB access)

### Frontend (Vercel)
*   `VITE_API_URL` (URL of your backend service on Railway, e.g., `https://your-backend-url.railway.app`)

---

## 3. Deployments

### Backend → Railway
1. Go to your [Railway Dashboard](https://railway.app/).
2. Create a new service from your GitHub repo.
3. Configure the Root Directory to point to `/backend` (or set the build command to `npm run build` and start command to `npm run server` within the `backend` subdirectory).
4. Add the **Backend Environment Variables** listed in Section 2.
5. Deploy.

### Frontend → Vercel
1. Go to your [Vercel Dashboard](https://vercel.com/).
2. Click **Add New** → **Project**, and select your GitHub repository.
3. In **Build & Development Settings**:
   - Set **Root Directory** to `frontend`.
   - Build Command should be: `npm run build` (or Vite's default build).
4. Add the `VITE_API_URL` environment variable pointing to your Railway backend URL.
5. Deploy.

---

## 4. Smoke Test Checklist
Once both are deployed:
1. Register a new user on your production Vercel frontend.
2. Add a few seed interests (e.g., "quantum mechanics", "space exploration").
3. Generate an article (this triggers the LangGraph backend and streams progress checks).
4. Scroll to the bottom of the article (verify that rabbit holes reveal upon reaching 80% scroll height).
5. Open the Tutor sidebar and ask a follow-up question.
6. Verify today's **Daily Wonder** loads (verifying Supabase connectivity and pool operations).
