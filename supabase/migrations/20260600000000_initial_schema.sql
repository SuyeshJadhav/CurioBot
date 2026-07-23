-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'user',
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
