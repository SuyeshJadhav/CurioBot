-- Add columns to pipeline_runs table to support Sprint 5 Insight Extraction Engine observability
ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS insight_density integer;
ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS insight_originality integer;
ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS fact_to_insight_ratio integer;
ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS insights_generated integer;
ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS insights_used integer;
