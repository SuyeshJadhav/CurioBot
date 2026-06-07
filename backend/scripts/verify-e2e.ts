import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// Ensure environment variables are loaded
const requiredEnvVars = [
  "GEMINI_API_KEY",
  "TAVILY_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY"
];

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const logDir = path.join(__dirname, "..", "logs");
const logFilePath = path.join(logDir, `verification-${timestamp}.jsonl`);

// Ensure logs directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function writeLog(stepName: string, status: "pass" | "fail" | "warn", durationMs: number, data: any, error: string | null) {
  const logLine = JSON.stringify({
    step: stepName,
    status,
    timestamp: new Date().toISOString(),
    durationMs,
    data,
    error
  });
  fs.appendFileSync(logFilePath, logLine + "\n", "utf8");
}

async function runStep(stepName: string, stepFn: () => Promise<any>): Promise<any> {
  const startTime = Date.now();
  try {
    const result = await stepFn();
    const duration = Date.now() - startTime;
    writeLog(stepName, "pass", duration, result, null);
    console.log(`✅ [${stepName}] Passed in ${duration}ms`);
    return result;
  } catch (err: any) {
    const duration = Date.now() - startTime;
    const errMsg = err.message || String(err);
    writeLog(stepName, "fail", duration, null, errMsg);
    console.error(`❌ [${stepName}] Failed in ${duration}ms: ${errMsg}`);
    throw err;
  }
}

async function main() {
  console.log(`🚀 Starting E2E backend verification... Log file: ${logFilePath}`);

  // Step 1: Environment check
  let envData: Record<string, string | boolean> = {};
  await runStep("Environment check", async () => {
    for (const key of requiredEnvVars) {
      if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
      envData[key] = true;
    }
    return envData;
  });

  // Import dependencies for further tests dynamically to ensure clean env check first
  const { ai } = await import("../src/lib/gemini");
  const { searchWeb } = await import("../src/lib/tavily");
  const { initWikiMcp, executeWikiTool } = await import("../src/lib/mcp");
  const supabase = (await import("../src/lib/supabase")).default;
  const { supervisorAgent } = await import("../src/agents/supervisor");

  // Step 2: Gemini API Integration
  await runStep("Gemini API Integration", async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: "Respond with the single word 'ok' if you receive this message.",
    });
    const text = response.text?.trim().toLowerCase();
    if (!text || !text.includes("ok")) {
      throw new Error(`Unexpected Gemini response: ${response.text}`);
    }
    return {
      text: response.text,
      usageMetadata: response.usageMetadata
    };
  });

  // Step 3: Tavily API Integration
  await runStep("Tavily API Integration", async () => {
    const results = await searchWeb("Google DeepMind Agentic AI");
    if (!Array.isArray(results) || results.length === 0) {
      throw new Error("No search results returned from Tavily API");
    }
    const firstResult = results[0];
    if (!firstResult.title || !firstResult.url || !firstResult.content) {
      throw new Error("Tavily search results missing expected properties (title, url, or content)");
    }
    return {
      resultsCount: results.length,
      firstResult: {
        title: firstResult.title,
        url: firstResult.url,
        snippetLength: firstResult.content.length
      }
    };
  });

  // Step 4: Wikipedia MCP Server Connection
  let wikiSearchToolName = "";
  await runStep("Wikipedia MCP Server Connection", async () => {
    const { geminiTools } = await initWikiMcp();
    if (!Array.isArray(geminiTools) || geminiTools.length === 0) {
      throw new Error("Wikipedia MCP initialization returned no tools");
    }
    const searchTool = geminiTools.find((t: any) =>
      t.name.toLowerCase().includes("search") || t.name.toLowerCase().includes("find")
    );
    if (!searchTool) {
      throw new Error("No tool containing 'search' or 'find' found in Wikipedia MCP tools");
    }
    wikiSearchToolName = searchTool.name;
    return {
      toolsCount: geminiTools.length,
      tools: geminiTools.map((t: any) => ({ name: t.name, description: t.description })),
      searchToolName: wikiSearchToolName
    };
  });

  // Step 5: Wikipedia MCP Tool Execution
  await runStep("Wikipedia MCP Tool Execution", async () => {
    if (!wikiSearchToolName) {
      throw new Error("Wikipedia search tool name was not resolved in previous step");
    }
    const result = await executeWikiTool(wikiSearchToolName, { query: "Quantum computing" });
    if (!result || typeof result.text !== "string") {
      throw new Error("Wikipedia tool execution returned invalid result or missing text");
    }
    return {
      hasText: result.text.length > 0,
      textLength: result.text.length,
      preview: result.text.slice(0, 100)
    };
  });

  // Step 6: Supabase Connectivity & Auth
  let userId = "";
  let userEmail = `verify-${Date.now()}@example.com`;
  await runStep("Supabase Connectivity & Auth", async () => {
    // Insert a temp user to satisfy foreign key constraints
    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert({
        email: userEmail,
        username: `verify_${Date.now()}`,
        password_hash: "verification-dummy-hash"
      })
      .select("id")
      .single();

    if (userError) {
      throw new Error(`Failed to insert temp user into Supabase: ${userError.message}`);
    }

    userId = userData.id;

    return {
      selectCheck: "success",
      tempUserId: userId
    };
  });

  // Step 7: Supabase Seed Generation & Insertion
  await runStep("Supabase Seed Generation & Insertion", async () => {
    if (!userId) {
      throw new Error("No user ID resolved from previous step");
    }
    // Insert a settings configuration for this test user
    const { error: insertError } = await supabase
      .from("user_settings")
      .insert({
        user_id: userId,
        settings: {
          model: "gemini-3.1-flash-lite"
        }
      });

    if (insertError) {
      throw new Error(`Failed to insert settings into Supabase: ${insertError.message}`);
    }

    // Insert initial seed interests
    const testInterests = ["quantum mechanics", "space exploration"];
    for (const interest of testInterests) {
      const { error: interestError } = await supabase
        .from("interests")
        .insert({
          user_id: userId,
          interest,
          embedding: Array(768).fill(0.1) // dummy embedding for verification
        });
      if (interestError) {
        throw new Error(`Failed to insert interest ${interest}: ${interestError.message}`);
      }
    }

    return {
      userId,
      insertedInterests: testInterests
    };
  });

  // Step 8: Complete pipeline execution
  let articleId = "";
  let generatedTopic = "";
  let topicEmbedding: number[] = [];
  let executionMetrics: any = {};
  await runStep("Complete pipeline execution", async () => {
    const pipelineResult = await supervisorAgent(["quantum mechanics"], userId);

    if (!pipelineResult.currentTopic) {
      throw new Error("Pipeline execution did not produce a topic");
    }
    if (!pipelineResult.article) {
      throw new Error("Pipeline execution did not produce an article");
    }
    if (!pipelineResult.articleId) {
      throw new Error("Pipeline execution did not return an article ID");
    }

    articleId = pipelineResult.articleId;
    generatedTopic = pipelineResult.currentTopic.title;
    topicEmbedding = pipelineResult.topicEmbedding || [];

    // Calculate metrics
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let tavilyCount = 0;

    if (Array.isArray(pipelineResult.nodeMetrics)) {
      for (const node of pipelineResult.nodeMetrics) {
        if (node.inputTokens) totalInputTokens += node.inputTokens;
        if (node.outputTokens) totalOutputTokens += node.outputTokens;
        if (node.tavilyCount) tavilyCount += node.tavilyCount;
      }
    }

    const GEMINI_INPUT_COST_PER_M = 0.075;
    const GEMINI_OUTPUT_COST_PER_M = 0.30;
    const TAVILY_COST_PER_SEARCH = 0.015;

    const geminiCost = ((totalInputTokens / 1_000_000) * GEMINI_INPUT_COST_PER_M) +
                       ((totalOutputTokens / 1_000_000) * GEMINI_OUTPUT_COST_PER_M);
    const tavilyCost = tavilyCount * TAVILY_COST_PER_SEARCH;
    const totalCostEstimate = geminiCost + tavilyCost;

    const researchContextNonEmpty =
      (pipelineResult.research && pipelineResult.research.length > 0) ||
      (pipelineResult.wikiResearch && pipelineResult.wikiResearch.length > 0);

    executionMetrics = {
      topic: generatedTopic,
      articleLength: pipelineResult.article.length,
      articleId: pipelineResult.articleId,
      totalInputTokens,
      totalOutputTokens,
      tavilyCount,
      totalCostEstimate,
      researchContextNonEmpty,
      nodeMetrics: pipelineResult.nodeMetrics
    };

    return executionMetrics;
  });

  // Step 9: Database persistence & verification
  await runStep("Database persistence & verification", async () => {
    if (!articleId) {
      throw new Error("No article ID to verify");
    }

    // Fetch the article back
    const { data: articleData, error: articleError } = await supabase
      .from("articles")
      .select("*")
      .eq("id", articleId)
      .single();

    if (articleError) {
      throw new Error(`Failed to fetch article from database: ${articleError.message}`);
    }

    if (articleData.title !== generatedTopic) {
      throw new Error(`Article title mismatch: Expected ${generatedTopic}, got ${articleData.title}`);
    }

    // Direct DB query verification of match_seen_topics RPC
    if (!topicEmbedding || topicEmbedding.length === 0) {
      throw new Error("No topic embedding was returned from the pipeline execution");
    }

    const { data: similarityResults, error: similarityError } = await supabase.rpc('match_seen_topics', {
      p_user_id: userId,
      query_embedding: topicEmbedding,
      match_threshold: 0.1, // low threshold to guarantee match
      match_count: 5,
    });

    if (similarityError) {
      throw new Error(`match_seen_topics RPC query failed: ${similarityError.message}`);
    }

    if (!Array.isArray(similarityResults) || similarityResults.length === 0) {
      throw new Error("match_seen_topics RPC returned no results");
    }

    const matchedTopic = similarityResults.find((r: any) => r.topic === generatedTopic);
    if (!matchedTopic) {
      throw new Error(`Generated topic "${generatedTopic}" was not matched by match_seen_topics RPC`);
    }

    console.log("🔍 [Database Verification] similarity search results:", JSON.stringify(similarityResults, null, 2));

    return {
      verifiedArticleId: articleId,
      title: articleData.title,
      created_at: articleData.created_at,
      similarityResults
    };
  });

  // Step 10: Cleanup & Teardown
  await runStep("Cleanup & Teardown", async () => {
    // Delete articles
    if (articleId) {
      const { error: delArticleError } = await supabase
        .from("articles")
        .delete()
        .eq("id", articleId);
      if (delArticleError) {
        console.warn(`⚠️ Warning: Failed to clean up article ${articleId}: ${delArticleError.message}`);
      }
    }

    // Delete interests
    const { error: delInterestsError } = await supabase
      .from("interests")
      .delete()
      .eq("user_id", userId);
    if (delInterestsError) {
      console.warn(`⚠️ Warning: Failed to clean up interests for user ${userId}: ${delInterestsError.message}`);
    }

    // Delete user settings
    const { error: delSettingsError } = await supabase
      .from("user_settings")
      .delete()
      .eq("user_id", userId);
    if (delSettingsError) {
      console.warn(`⚠️ Warning: Failed to clean up user settings for user ${userId}: ${delSettingsError.message}`);
    }

    // Delete library collections (settings)
    const { error: delCollectionsError } = await supabase
      .from("library_collections")
      .delete()
      .eq("user_id", userId);
    if (delCollectionsError) {
      console.warn(`⚠️ Warning: Failed to clean up library collections for user ${userId}: ${delCollectionsError.message}`);
    }

    // Delete seen topics if any
    const { error: delSeenError } = await supabase
      .from("seen_topics")
      .delete()
      .eq("user_id", userId);
    if (delSeenError) {
      console.warn(`⚠️ Warning: Failed to clean up seen topics for user ${userId}: ${delSeenError.message}`);
    }

    // Delete user
    const { error: delUserError } = await supabase
      .from("users")
      .delete()
      .eq("id", userId);
    if (delUserError) {
      console.warn(`⚠️ Warning: Failed to clean up user ${userId}: ${delUserError.message}`);
    }

    return {
      cleanedUserId: userId,
      status: "success"
    };
  });

  console.log("🎉 All verification steps completed successfully!");
  fs.appendFileSync(logFilePath, JSON.stringify({ ready_for_deployment: true }) + "\n", "utf8");
}

main().catch((err) => {
  console.error("❌ E2E backend verification crashed:", err);
  process.exit(1);
});
