-- Create article_reads table for tracking user article reads and reading streaks
CREATE TABLE IF NOT EXISTS article_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  read_at timestamp with time zone DEFAULT now()
);

-- Create index for querying read logs by user_id and read_at date
CREATE INDEX IF NOT EXISTS idx_article_reads_user_id_read_at ON article_reads(user_id, read_at DESC);
