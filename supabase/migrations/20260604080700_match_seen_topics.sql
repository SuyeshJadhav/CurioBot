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
