import { AgentState, AgentStateType, Topic } from "../types";
import { topicPickerAgent } from "./topicPicker";
import { curiosityScorerAgent } from "./curiosityScorer";
import { researcherAgent } from "./researcher";
import { writerAgent } from "./writer";
import { StateGraph, START, END } from "@langchain/langgraph";
import { addSeenTopic } from "../lib/memory";
import { dedupTopicNode } from "./dedupTopic";
import { outlineAgent } from "./outline";
import { editorAgent } from "./editor";
import { researchBriefAgent } from "./researchBrief";
import { observabilityAgent } from "./observability";
import { insightExtractorAgent } from "./insightExtractor";
import fs from "fs";
import path from "path";

const FALLBACK_TOPIC = {
  id: "strange-history-of-time-zones",
  title: "The Strange History of Time Zones",
  domain: "history",
  angle:
    "How a railroad squabble in 1883 divided the planet into arbitrary hourly stripes.",
  summary:
    "A look at the chaotic transition from local solar clocks to the standardized time zones we live by today.",
  connections: ["railroads", "navigation", "standard time"],
  read: false,
};

function logNodeIO(nodeName: string, input: any, output: any) {
  const logDir = path.join(__dirname, "../../logs");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logFile = path.join(logDir, "langgraph_io.jsonl");

  const sanitize = (val: any): any => {
    if (val === null || val === undefined) return val;
    if (Array.isArray(val)) {
      if (val.length > 5) {
        return `[Array of ${val.length} items]`;
      }
      return val.map(sanitize);
    }
    if (typeof val === "object") {
      const cleaned: any = {};
      for (const k of Object.keys(val)) {
        if (k === "topicEmbedding" || k === "signal" || k === "userSettings")
          continue;
        if (typeof val[k] === "string" && val[k].length > 1000) {
          cleaned[k] =
            val[k].slice(0, 1000) +
            `... [truncated, total length: ${val[k].length}]`;
        } else {
          cleaned[k] = sanitize(val[k]);
        }
      }
      return cleaned;
    }
    return val;
  };

  const logEntry = {
    timestamp: new Date().toISOString(),
    nodeName,
    input: sanitize(input),
    output: sanitize(output),
  };

  try {
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n", "utf8");
  } catch (err) {
    console.warn("⚠️ Failed to write LangGraph IO log:", err);
  }
}

function wrapNode(name: string, nodeFn: any) {
  return async (state: any) => {
    const inputSnapshot = { ...state };
    try {
      const output = await nodeFn(state);
      logNodeIO(name, inputSnapshot, output);
      return output;
    } catch (error) {
      logNodeIO(name, inputSnapshot, { error: String(error) });
      throw error;
    }
  };
}

async function startResearchNode(_state: AgentStateType): Promise<{}> {
  return {};
}

const graph = new StateGraph(AgentState)
  .addNode("topic picker", wrapNode("topic picker", topicPickerAgent))
  .addNode(
    "curiosity scorer",
    wrapNode("curiosity scorer", curiosityScorerAgent),
  )
  .addNode("dedup topic", wrapNode("dedup topic", dedupTopicNode))
  .addNode("start research", wrapNode("start research", startResearchNode))
  .addNode(
    "use fallback",
    wrapNode("use fallback", (_state: AgentStateType) => ({
      currentTopic: FALLBACK_TOPIC,
      dedupPassed: true,
    })),
  )
  .addNode("researcher", wrapNode("researcher", researcherAgent))
  .addNode(
    "research brief agent",
    wrapNode("research brief agent", researchBriefAgent),
  )
  .addNode(
    "insight extractor",
    wrapNode("insight extractor", insightExtractorAgent),
  )
  .addNode("outline agent", wrapNode("outline agent", outlineAgent))
  .addNode("writer", wrapNode("writer", writerAgent))
  .addNode("editor agent", wrapNode("editor agent", editorAgent))
  .addNode(
    "observability agent",
    wrapNode("observability agent", observabilityAgent),
  )

  .addEdge(START, "topic picker")
  .addEdge("topic picker", "curiosity scorer")
  .addEdge("curiosity scorer", "dedup topic")

  // Conditional: passed  -> fan out to research; failed -> retry or fallback
  .addConditionalEdges(
    "dedup topic",
    (state) => {
      if (state.dedupPassed) return "research";
      if (state.dedupAttempts < 3) return "retry";
      return "fallback";
    },
    {
      research: "start research",
      retry: "topic picker",
      fallback: "use fallback",
    },
  )

  .addEdge("start research", "researcher")
  .addEdge("use fallback", "researcher")
  .addEdge("researcher", "research brief agent")
  .addEdge("research brief agent", "insight extractor")
  .addEdge("insight extractor", "outline agent")
  .addEdge("outline agent", "writer")
  .addEdge("writer", "editor agent")
  .addEdge("editor agent", "observability agent")
  .addEdge("observability agent", END);

const app = graph.compile();

import { saveArticle, getUserSettings } from "../lib/db";

/**
 * Standard invoke supervisor agent (backward-compatible)
 */
export async function supervisorAgent(
  interests: string[],
  userId: string,
  signal?: AbortSignal,
  hint?: string,
  topic?: Partial<Topic>,
): Promise<AgentStateType & { articleId?: string }> {
  console.log("\n🎯 [Supervisor] Starting pipeline...");

  const settings = await getUserSettings(userId);
  const result = await app.invoke({
    interests,
    userId,
    userSettings: settings,
    signal,
    hint,
    requestedTopic: topic,
  });

  let articleId: string | undefined;
  let dbStartTime = Date.now();
  let dbSuccess = true;
  let dbError: string | undefined;

  if (result.currentTopic) {
    console.log(
      `\n💾 [Memory] Saving "${result.currentTopic.title}" to vector database...`,
    );
    try {
      // reuse preComputedEmbedding
      await addSeenTopic(
        result.currentTopic.title,
        result.currentTopic.summary,
        userId,
        result.topicEmbedding,
      );
    } catch (e: any) {
      console.error("⚠️ Error saving seen topic to vector db:", e);
      dbSuccess = false;
      dbError = e.message || String(e);
    }

    if (result.article) {
      console.log(`\n💾 [Database] Saving article to Supabase...`);
      try {
        articleId = await saveArticle(
          userId,
          result.currentTopic.title,
          result.article,
          result.currentTopic.domain,
          result.currentTopic.summary,
          result.rabbitHoles,
          result.tldr,
        );
      } catch (dbErr: any) {
        console.error("⚠️ Error saving article to Supabase:", dbErr);
        dbSuccess = false;
        dbError = dbError
          ? `${dbError}; ${dbErr.message || String(dbErr)}`
          : dbErr.message || String(dbErr);
      }
    }
  }

  const dbDurationMs = Date.now() - dbStartTime;
  if (result.currentTopic) {
    result.nodeMetrics = (result.nodeMetrics || []).concat([
      {
        nodeName: "database_sync",
        durationMs: dbDurationMs,
        success: dbSuccess,
        error: dbError,
      },
    ]);
  }

  return { ...result, articleId };
}

/**
 * Streaming supervisor agent for real-time progress events
 */
export async function runSupervisorStream(
  interests: string[],
  userId: string,
  signal: AbortSignal,
  onUpdate: (event: { status: string; data?: any }) => void,
  stateTracker?: { lastState: any },
  hint?: string,
  topic?: Partial<Topic>,
): Promise<AgentStateType & { articleId?: string }> {
  console.log("\n🎯 [Supervisor] Starting streaming pipeline...");

  const settings = await getUserSettings(userId);
  onUpdate({ status: "picking_topic" });

  const stream = await app.stream(
    {
      interests,
      userId,
      userSettings: settings,
      signal,
      hint,
      requestedTopic: topic,
      onWriterWord: async (word: string) => {
        onUpdate({ status: "writing_word", data: { word } });
      },
    },
    { streamMode: "updates" },
  );

  let lastState: any = {};
  let researcherDone = false;
  let wikiResearcherDone = false;

  for await (const chunk of stream) {
    if (signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const nodeName = Object.keys(chunk)[0];
    console.log(`📡 [Supervisor Stream] Node completed: "${nodeName}"`);

    const update = (chunk as any)[nodeName];
    for (const key of Object.keys(update)) {
      if (
        [
          "seenTopics",
          "research",
          "wikiResearch",
          "conversationHistory",
          "nodeMetrics",
        ].includes(key)
      ) {
        lastState[key] = (lastState[key] || []).concat(update[key]);
      } else {
        lastState[key] = update[key];
      }
    }

    if (stateTracker) {
      stateTracker.lastState = lastState;
    }

    if (nodeName === "curiosity scorer") {
      onUpdate({
        status: "researching",
        data: (chunk as any)[nodeName].currentTopic,
      });
    } else if (nodeName === "researcher") {
      onUpdate({ status: "writing_article" });
    }
  }

  const finalState = {
    userId,
    interests,
    userSettings: settings,
    ...lastState,
  };

  let articleId: string | undefined;
  let dbStartTime = Date.now();
  let dbSuccess = true;
  let dbError: string | undefined;

  // Insert article in DB ONLY after successful pipeline completion (Daily Ceiling Rule)
  if (finalState.currentTopic) {
    console.log(
      `\n💾 [Memory] Saving "${finalState.currentTopic.title}" to vector database...`,
    );
    try {
      // reuse preComputedEmbedding to avoid duplicate embedContent API calls!
      await addSeenTopic(
        finalState.currentTopic.title,
        finalState.currentTopic.summary,
        userId,
        finalState.topicEmbedding,
      );
    } catch (e: any) {
      console.error("⚠️ Error saving seen topic to vector db:", e);
      dbSuccess = false;
      dbError = e.message || String(e);
    }

    if (finalState.article) {
      console.log(`\n💾 [Database] Saving article to Supabase...`);
      try {
        articleId = await saveArticle(
          userId,
          finalState.currentTopic.title,
          finalState.article,
          finalState.currentTopic.domain,
          finalState.currentTopic.summary,
          finalState.rabbitHoles,
          finalState.tldr,
        );
      } catch (dbErr: any) {
        console.error("⚠️ Error saving article to Supabase:", dbErr);
        dbSuccess = false;
        dbError = dbError
          ? `${dbError}; ${dbErr.message || String(dbErr)}`
          : dbErr.message || String(dbErr);
      }
    }
  }

  const dbDurationMs = Date.now() - dbStartTime;
  if (finalState.currentTopic) {
    finalState.nodeMetrics = (finalState.nodeMetrics || []).concat([
      {
        nodeName: "database_sync",
        durationMs: dbDurationMs,
        success: dbSuccess,
        error: dbError,
      },
    ]);
  }

  if (stateTracker) {
    stateTracker.lastState = finalState;
  }

  return { ...finalState, articleId };
}
