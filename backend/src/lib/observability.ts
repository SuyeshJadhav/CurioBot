import fs from 'fs';
import path from 'path';

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
  logRun: (metrics: PipelineMetrics) => {
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
