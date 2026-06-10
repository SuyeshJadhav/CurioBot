import { AgentState, AgentStateType, Topic } from "../types";
import { topicPickerAgent } from "./topicPicker";
import { researcherAgent } from "./researcher";
import { writerAgent } from "./writer";
import { StateGraph, START, END } from '@langchain/langgraph'
import { addSeenTopic } from "../lib/memory";
import { wikiResearcherAgent } from "./wikiResearcher";
import { dedupTopicNode } from "./dedupTopic";

const FALLBACK_TOPIC = {
  id: "strange-history-of-time-zones",
  title: "The Strange History of Time Zones",
  domain: "history",
  angle: "How a railroad squabble in 1883 divided the planet into arbitrary hourly stripes.",
  summary: "A look at the chaotic transition from local solar clocks to the standardized time zones we live by today.",
  connections: ["railroads", "navigation", "standard time"],
  read: false,
};

async function startResearchNode(_state: AgentStateType): Promise<{}> {
  return {}
}

const graph = new StateGraph(AgentState)
  .addNode("topic picker", topicPickerAgent)
  .addNode("dedup topic", dedupTopicNode)
  .addNode("start research", startResearchNode)
  .addNode("use fallback", (_state) => ({ currentTopic: FALLBACK_TOPIC, dedupPassed: true }))
  .addNode("researcher", researcherAgent)
  .addNode("wiki researcher", wikiResearcherAgent)
  .addNode("writer", writerAgent)

  .addEdge(START, "topic picker")
  .addEdge("topic picker", "dedup topic")

  // Conditional: passed  -> fan out to research; failed -> retry or fallback
  .addConditionalEdges("dedup topic", (state) => {
    if (state.dedupPassed) return "research";
    if (state.dedupAttempts < 3) return "retry";
    return "fallback";
  }, {
    research: "start research",
    retry: "topic picker",
    fallback: "use fallback"
  })

  .addEdge("start research", "researcher")
  .addEdge("start research", "wiki researcher")
  .addEdge("use fallback", "researcher")
  .addEdge("use fallback", "wiki researcher")
  .addEdge("researcher", "writer")
  .addEdge("wiki researcher", "writer")
  .addEdge("writer", END)

const app = graph.compile()

import { saveArticle, getUserSettings } from "../lib/db";

/**
 * Standard invoke supervisor agent (backward-compatible)
 */
export async function supervisorAgent(
  interests: string[],
  userId: string,
  signal?: AbortSignal,
  hint?: string,
  topic?: Partial<Topic>
): Promise<AgentStateType & { articleId?: string }> {
  console.log("\n🎯 [Supervisor] Starting pipeline...");

  const settings = await getUserSettings(userId);
  const result = await app.invoke({ interests, userId, userSettings: settings, signal, hint, requestedTopic: topic });

  let articleId: string | undefined;
  let dbStartTime = Date.now();
  let dbSuccess = true;
  let dbError: string | undefined;

  if (result.currentTopic) {
    console.log(`\n💾 [Memory] Saving "${result.currentTopic.title}" to vector database...`);
    try {
      // reuse preComputedEmbedding
      await addSeenTopic(
        result.currentTopic.title,
        result.currentTopic.summary,
        userId,
        result.topicEmbedding
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
          result.tldr
        );
      } catch (dbErr: any) {
        console.error("⚠️ Error saving article to Supabase:", dbErr);
        dbSuccess = false;
        dbError = dbError ? `${dbError}; ${dbErr.message || String(dbErr)}` : (dbErr.message || String(dbErr));
      }
    }
  }

  const dbDurationMs = Date.now() - dbStartTime;
  if (result.currentTopic) {
    result.nodeMetrics = (result.nodeMetrics || []).concat([{
      nodeName: "database_sync",
      durationMs: dbDurationMs,
      success: dbSuccess,
      error: dbError
    }]);
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
  topic?: Partial<Topic>
): Promise<AgentStateType & { articleId?: string }> {
  console.log("\n🎯 [Supervisor] Starting streaming pipeline...");

  const settings = await getUserSettings(userId);
  onUpdate({ status: 'picking_topic' });

  const stream = await app.stream(
    { interests, userId, userSettings: settings, signal, hint, requestedTopic: topic },
    { streamMode: "updates" }
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
      if (['seenTopics', 'research', 'wikiResearch', 'conversationHistory', 'nodeMetrics'].includes(key)) {
        lastState[key] = (lastState[key] || []).concat(update[key]);
      } else {
        lastState[key] = update[key];
      }
    }

    if (stateTracker) {
      stateTracker.lastState = lastState;
    }

    if (nodeName === 'topic picker') {
      onUpdate({ status: 'researching', data: (chunk as any)[nodeName].currentTopic });
    } else if (nodeName === 'researcher') {
      researcherDone = true;
      if (wikiResearcherDone) {
        onUpdate({ status: 'writing_article' });
      }
    } else if (nodeName === 'wiki researcher') {
      wikiResearcherDone = true;
      if (researcherDone) {
        onUpdate({ status: 'writing_article' });
      }
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
    console.log(`\n💾 [Memory] Saving "${finalState.currentTopic.title}" to vector database...`);
    try {
      // reuse preComputedEmbedding to avoid duplicate embedContent API calls!
      await addSeenTopic(
        finalState.currentTopic.title,
        finalState.currentTopic.summary,
        userId,
        finalState.topicEmbedding
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
          finalState.tldr
        );
      } catch (dbErr: any) {
        console.error("⚠️ Error saving article to Supabase:", dbErr);
        dbSuccess = false;
        dbError = dbError ? `${dbError}; ${dbErr.message || String(dbErr)}` : (dbErr.message || String(dbErr));
      }
    }
  }

  const dbDurationMs = Date.now() - dbStartTime;
  if (finalState.currentTopic) {
    finalState.nodeMetrics = (finalState.nodeMetrics || []).concat([{
      nodeName: "database_sync",
      durationMs: dbDurationMs,
      success: dbSuccess,
      error: dbError
    }]);
  }

  if (stateTracker) {
    stateTracker.lastState = finalState;
  }

  return { ...finalState, articleId };
}
