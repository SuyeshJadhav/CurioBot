import fs from 'fs';
import path from 'path';
import supabase from "./supabase";

export interface NodeMetrics {
  nodeName: string;
  durationMs: number;
  success: boolean;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
}

export interface PipelineMetrics {
  userId: string;
  topic?: string;
  domain?: string;
  startTime: string;
  endTime?: string;
  totalDurationMs?: number;
  nodes: NodeMetrics[];
  tavilySearchCount: number;
  totalCostEstimate: number;
  status: 'success' | 'failed';
  error?: string;
  researchFactCount?: number;
  briefFactCount?: number;
  outlineSectionCount?: number;
  articleWordCount?: number;
  researchFactsUsed?: number;
  mustIncludeFacts?: number;
  mustIncludeFactsUsed?: number;
  outlineTargetWords?: number;
  actualArticleWords?: number;
  factConsistency?: number;
  hookStrength?: number;
  narrativeFlow?: number;
  curiosityFactor?: number;
  sectionBalance?: number;
  conclusionQuality?: number;
  unsupportedClaims?: number;
  factCorrections?: number;
  sectionsExpanded?: number;
  sectionsCompressed?: number;
  transitionsImproved?: number;
  hookStrengthened?: boolean;
  informationDensity?: number;
  curiosityGap?: number;
  primaryQuestion?: string;
  winningCandidateReason?: string;
}

// Gemini 1.5/3.1 flash input/output pricing per 1M tokens
const GEMINI_INPUT_COST_PER_M = 0.075;
const GEMINI_OUTPUT_COST_PER_M = 0.30;
const TAVILY_COST_PER_SEARCH = 0.015;

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export const pipelineLogger = {
  logRun: async (metrics: PipelineMetrics) => {
    // Calculate cost
    let geminiCost = 0;
    for (const node of metrics.nodes) {
      if (node.inputTokens) {
        geminiCost += (node.inputTokens / 1_000_000) * GEMINI_INPUT_COST_PER_M;
      }
      if (node.outputTokens) {
        geminiCost += (node.outputTokens / 1_000_000) * GEMINI_OUTPUT_COST_PER_M;
      }
    }
    const tavilyCost = metrics.tavilySearchCount * TAVILY_COST_PER_SEARCH;
    metrics.totalCostEstimate = geminiCost + tavilyCost;
    metrics.endTime = new Date().toISOString();
    metrics.totalDurationMs = Date.now() - new Date(metrics.startTime).getTime();

    // Log to file
    const logFile = path.join(logsDir, 'pipeline_runs.jsonl');
    const logLine = JSON.stringify(metrics) + '\n';
    try {
      fs.appendFileSync(logFile, logLine, 'utf8');
    } catch (e) {
      console.warn("⚠️ Failed to write to pipeline log file:", e);
    }

    // Log to Supabase
    try {
      const { error } = await supabase
        .from('pipeline_runs')
        .insert({
          user_id: metrics.userId,
          topic: metrics.topic,
          domain: metrics.domain,
          start_time: metrics.startTime,
          end_time: metrics.endTime,
          total_duration_ms: metrics.totalDurationMs,
          nodes: metrics.nodes,
          tavily_search_count: metrics.tavilySearchCount,
          total_cost_estimate: metrics.totalCostEstimate,
          status: metrics.status,
          error: metrics.error,
          research_fact_count: metrics.researchFactCount,
          brief_fact_count: metrics.briefFactCount,
          outline_section_count: metrics.outlineSectionCount,
          article_word_count: metrics.articleWordCount,
          research_facts_used: metrics.researchFactsUsed,
          must_include_facts: metrics.mustIncludeFacts,
          must_include_facts_used: metrics.mustIncludeFactsUsed,
          outline_target_words: metrics.outlineTargetWords,
          actual_article_words: metrics.actualArticleWords,
          fact_consistency: metrics.factConsistency,
          hook_strength: metrics.hookStrength,
          narrative_flow: metrics.narrativeFlow,
          curiosity_factor: metrics.curiosityFactor,
          section_balance: metrics.sectionBalance,
          conclusion_quality: metrics.conclusionQuality,
          unsupported_claims: metrics.unsupportedClaims,
          fact_corrections: metrics.factCorrections,
          sections_expanded: metrics.sectionsExpanded,
          sections_compressed: metrics.sectionsCompressed,
          transitions_improved: metrics.transitionsImproved,
          hook_strengthened: metrics.hookStrengthened,
          information_density: metrics.informationDensity,
          curiosity_gap: metrics.curiosityGap,
          primary_question: metrics.primaryQuestion,
          winning_candidate_reason: metrics.winningCandidateReason,
        });

      if (error) {
        console.warn("⚠️ Failed to write to Supabase pipeline_runs table:", error.message);
      }
    } catch (e) {
      console.warn("⚠️ Error executing Supabase logRun insert:", e);
    }

    // Colored console logging
    const reset = '\x1b[0m';
    const green = '\x1b[32m';
    const red = '\x1b[31m';
    const blue = '\x1b[34m';
    const yellow = '\x1b[33m';

    console.log(
      `\n📊 ${blue}[Observability Run Summary]${reset}\n` +
      `  • User: ${metrics.userId}\n` +
      `  • Topic: "${metrics.topic || 'N/A'}" (${metrics.domain || 'N/A'})\n` +
      `  • Status: ${metrics.status === 'success' ? `${green}SUCCESS${reset}` : `${red}FAILED${reset}`}\n` +
      `  • Duration: ${yellow}${metrics.totalDurationMs}ms${reset}\n` +
      `  • Tavily Queries: ${metrics.tavilySearchCount}\n` +
      `  • Gemini Tokens: ${metrics.nodes.reduce((acc, n) => acc + (n.inputTokens || 0) + (n.outputTokens || 0), 0)}\n` +
      `  • Est. Cost: ${green}$${metrics.totalCostEstimate.toFixed(5)}${reset}\n` +
      `  • Research Facts Count: ${metrics.researchFactCount !== undefined ? metrics.researchFactCount : 'N/A'}\n` +
      `  • Brief Facts Count: ${metrics.briefFactCount !== undefined ? metrics.briefFactCount : 'N/A'}\n` +
      `  • Outline Sections Count: ${metrics.outlineSectionCount !== undefined ? metrics.outlineSectionCount : 'N/A'}\n` +
      `  • Article Word Count: ${metrics.articleWordCount !== undefined ? metrics.articleWordCount : 'N/A'}\n` +
      `  • Research Facts Used: ${metrics.researchFactsUsed !== undefined ? metrics.researchFactsUsed : 'N/A'}\n` +
      `  • Must-Include Facts Count: ${metrics.mustIncludeFacts !== undefined ? metrics.mustIncludeFacts : 'N/A'}\n` +
      `  • Must-Include Facts Used: ${metrics.mustIncludeFactsUsed !== undefined ? metrics.mustIncludeFactsUsed : 'N/A'}\n` +
      `  • Outline Target Words: ${metrics.outlineTargetWords !== undefined ? metrics.outlineTargetWords : 'N/A'}\n` +
      `  • Actual Article Words: ${metrics.actualArticleWords !== undefined ? metrics.actualArticleWords : 'N/A'}\n` +
      `  • Narrative Quality Metrics:\n` +
      `    - Fact Consistency: ${metrics.factConsistency !== undefined ? metrics.factConsistency : 'N/A'}/10\n` +
      `    - Hook Strength: ${metrics.hookStrength !== undefined ? metrics.hookStrength : 'N/A'}/10\n` +
      `    - Narrative Flow: ${metrics.narrativeFlow !== undefined ? metrics.narrativeFlow : 'N/A'}/10\n` +
      `    - Curiosity Factor: ${metrics.curiosityFactor !== undefined ? metrics.curiosityFactor : 'N/A'}/10\n` +
      `    - Section Balance: ${metrics.sectionBalance !== undefined ? metrics.sectionBalance : 'N/A'}/10\n` +
      `    - Conclusion Quality: ${metrics.conclusionQuality !== undefined ? metrics.conclusionQuality : 'N/A'}/10\n` +
      `    - Information Density: ${metrics.informationDensity !== undefined ? metrics.informationDensity : 'N/A'}/10\n` +
      `    - Curiosity Gap: ${metrics.curiosityGap !== undefined ? metrics.curiosityGap : 'N/A'}/10\n` +
      `    - Unsupported Claims: ${metrics.unsupportedClaims !== undefined ? metrics.unsupportedClaims : 'N/A'}\n` +
      `    - Primary Question: "${metrics.primaryQuestion || 'N/A'}"\n` +
      `    - Winning Reason: "${metrics.winningCandidateReason || 'N/A'}"\n` +
      `  • Editor Notes:\n` +
      `    - Fact Corrections: ${metrics.factCorrections !== undefined ? metrics.factCorrections : 'N/A'}\n` +
      `    - Sections Expanded: ${metrics.sectionsExpanded !== undefined ? metrics.sectionsExpanded : 'N/A'}\n` +
      `    - Sections Compressed: ${metrics.sectionsCompressed !== undefined ? metrics.sectionsCompressed : 'N/A'}\n` +
      `    - Transitions Improved: ${metrics.transitionsImproved !== undefined ? metrics.transitionsImproved : 'N/A'}\n` +
      `    - Hook Strengthened: ${metrics.hookStrengthened !== undefined ? metrics.hookStrengthened : 'N/A'}\n` +
      `  • Nodes executed:\n` +
      metrics.nodes
        .map(
          (n) =>
            `    - ${n.nodeName}: ${n.success ? `${green}OK${reset}` : `${red}ERR${reset}`} (${n.durationMs}ms) [Tokens: in=${n.inputTokens || 0}, out=${n.outputTokens || 0}]`
        )
        .join('\n')
    );

    if (metrics.error) {
      console.error(`  • Root Error: ${red}${metrics.error}${reset}`);
    }
  }
};
