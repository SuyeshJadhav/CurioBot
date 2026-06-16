-- PostgreSQL views to power the internal content quality analytics dashboard

-- 1. Category (Domain) Performance Analysis
CREATE OR REPLACE VIEW view_category_performance AS
SELECT 
  domain AS category,
  COUNT(*) as total_articles,
  ROUND(AVG(fact_consistency)::numeric, 2) as avg_fact_consistency,
  ROUND(AVG(hook_strength)::numeric, 2) as avg_hook_strength,
  ROUND(AVG(narrative_flow)::numeric, 2) as avg_narrative_flow,
  ROUND(AVG(curiosity_factor)::numeric, 2) as avg_curiosity_factor,
  ROUND(AVG(section_balance)::numeric, 2) as avg_section_balance,
  ROUND(AVG(conclusion_quality)::numeric, 2) as avg_conclusion_quality,
  SUM(unsupported_claims) as total_unsupported_claims,
  ROUND(AVG(information_density)::numeric, 2) as avg_information_density,
  ROUND(AVG(curiosity_gap)::numeric, 2) as avg_curiosity_gap,
  ROUND(AVG(insight_density)::numeric, 2) as avg_insight_density,
  ROUND(AVG(insight_originality)::numeric, 2) as avg_insight_originality,
  ROUND(AVG(fact_to_insight_ratio)::numeric, 2) as avg_fact_to_insight_ratio,
  ROUND(AVG(insights_generated)::numeric, 2) as avg_insights_generated,
  ROUND(AVG(insights_used)::numeric, 2) as avg_insights_used,
  ROUND(AVG(actual_article_words)::numeric, 0) as avg_word_count,
  ROUND(AVG(total_cost_estimate)::numeric, 4) as avg_cost_estimate,
  ROUND(AVG(total_duration_ms)::numeric, 0) as avg_duration_ms
FROM pipeline_runs
WHERE status = 'success'
GROUP BY domain;

-- 2. Curiosity Inputs vs. Article Quality Correlation
CREATE OR REPLACE VIEW view_curiosity_correlations AS
SELECT 
  curiosity_factor,
  curiosity_gap,
  COUNT(*) as article_count,
  ROUND(AVG(narrative_flow)::numeric, 2) as avg_narrative_flow,
  ROUND(AVG(information_density)::numeric, 2) as avg_information_density,
  ROUND(AVG(insight_density)::numeric, 2) as avg_insight_density,
  ROUND(AVG(fact_consistency)::numeric, 2) as avg_fact_consistency,
  ROUND(AVG(actual_article_words)::numeric, 0) as avg_word_count
FROM pipeline_runs
WHERE status = 'success'
GROUP BY curiosity_factor, curiosity_gap;

-- 3. High-Risk or Underperforming Topics
CREATE OR REPLACE VIEW view_underperforming_topics AS
SELECT 
  topic,
  domain AS category,
  fact_consistency,
  narrative_flow,
  unsupported_claims,
  insight_density,
  total_cost_estimate,
  winning_candidate_reason
FROM pipeline_runs
WHERE status = 'success'
  AND (fact_consistency < 6 OR narrative_flow < 6 OR unsupported_claims > 1)
ORDER BY unsupported_claims DESC, fact_consistency ASC;

-- 4. Insight Synthesis Quality & Effectiveness
CREATE OR REPLACE VIEW view_insight_effectiveness AS
SELECT 
  insights_generated,
  insights_used,
  COUNT(*) as article_count,
  ROUND(AVG(insight_density)::numeric, 2) as avg_insight_density,
  ROUND(AVG(fact_to_insight_ratio)::numeric, 2) as avg_fact_to_insight_ratio,
  ROUND(AVG(information_density)::numeric, 2) as avg_information_density,
  ROUND(AVG(fact_consistency)::numeric, 2) as avg_fact_consistency
FROM pipeline_runs
WHERE status = 'success'
  AND insights_generated IS NOT NULL
GROUP BY insights_generated, insights_used;
