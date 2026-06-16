# CurioBot Production Deployment Guide

Follow this guide to set up the production environment variables, apply the database migrations, and deploy the backend to Railway and frontend to Vercel.

---

## 1. Supabase Database Migrations

You can apply the database migrations either by running the Supabase CLI or by copy-pasting the scripts directly into the **SQL Editor** on your Supabase dashboard.

Below are the SQL statements from the migrations in chronological order. Copy and run them in your Supabase SQL Editor:

### Migration 0: Initial Schema Creation
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

-- Ensure a default system wonder user exists in the users table
INSERT INTO users (id, email, username, password_hash)
VALUES ('00000000-0000-0000-0000-000000000000', 'system-wonder@curiobot.ai', 'system-wonder', 'system-generated-hash-disabled-login')
ON CONFLICT (id) DO NOTHING;
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

### Migration 5: Token Balance
```sql
-- Add token_balance column to the users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_balance INTEGER NOT NULL DEFAULT 100000;
```

### Migration 6: Remove Daily Wonders & Wonder Pool
```sql
-- Drop daily_wonders and wonder_pool tables (no longer used)
DROP TABLE IF EXISTS daily_wonders CASCADE;
DROP TABLE IF EXISTS wonder_pool CASCADE;
```

### Migration 7: Token Refresh Timestamp
```sql
-- Add last_token_refresh column to track 24-hour auto-refresh window
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_token_refresh TIMESTAMPTZ NOT NULL DEFAULT NOW();
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
*   `REDIS_URL` (Redis connection string — e.g. from Railway Redis plugin or Upstash)
*   `FRONTEND_URL` (production Vercel URL, e.g. `https://curio-bot.vercel.app` — used for CORS)

### Frontend (Vercel)
*   `VITE_API_URL` (URL of your backend service on Railway, e.g., `https://your-backend-url.railway.app`)

---

## 3. Redis Setup

CurioBot requires **Redis** for:
- **BullMQ job queue** (`curios-generation`) — offloads LangGraph pipeline execution from the HTTP request.
- **Redis Pub/Sub** — broadcasts cancellation signals (`job-cancel:<jobId>`) from the API server to the BullMQ worker.

### Railway (Recommended)
1. In your Railway project, add a new **Redis** service (from the service catalog).
2. Once provisioned, Railway automatically injects `REDIS_URL` as an environment variable into services within the same project.

### Alternative: Upstash Redis
1. Create a free Redis database at [upstash.com](https://upstash.com/).
2. Copy the Redis connection string and set it as `REDIS_URL` in your backend environment.

> **Note:** The backend server embeds the BullMQ worker directly via `import './src/worker'` in `server.ts`, so no separate worker deployment is required unless you need horizontal scaling.

---

## 4. Deployments

### Backend → Railway
1. Go to your [Railway Dashboard](https://railway.app/).
2. Create a new service from your GitHub repo.
3. Configure the Root Directory to point to `/backend` (or set the build command to `npm run build` and start command to `npm run server` within the `backend` subdirectory).
4. Add a **Redis** service to the same project (see Section 3).
5. Add the **Backend Environment Variables** listed in Section 2.
6. Deploy.

### Frontend → Vercel
1. Go to your [Vercel Dashboard](https://vercel.com/).
2. Click **Add New** → **Project**, and select your GitHub repository.
3. In **Build & Development Settings**:
   - Set **Root Directory** to `frontend`.
   - Build Command should be: `npm run build` (or Vite's default build).
4. Add the `VITE_API_URL` environment variable pointing to your Railway backend URL.
5. Deploy.

---

## 5. Smoke Test Checklist
Once both are deployed:
1. Register a new user on your production Vercel frontend.
2. Complete the **onboarding flow** (select knowledge level, novelty, and seed interests).
3. Generate an article (this triggers the BullMQ queue and streams LangGraph progress via SSE).
4. Verify the pipeline progress steps appear: **Selecting Topic → Researching → Writing Article**.
5. Scroll to the bottom of the article (verify that rabbit holes reveal upon reaching 80% scroll height).
6. Open the Tutor sidebar and ask a follow-up question.
7. Generate a second article to verify token deduction is working (check server logs for `[Token Deduction]`).
8. Simulate a disconnect (close the tab mid-generation, then reopen within 8 seconds) to verify SSE reconnection replays buffered events.
