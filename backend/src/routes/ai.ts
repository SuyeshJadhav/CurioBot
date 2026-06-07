import { Router, NextFunction } from "express";
import { asyncHandler, authenticate } from "../middleware/auth";
import { getUserInterests } from "../lib/memory";
import { getUserSettings, recordArticleRead } from "../lib/db";
import { AppError } from "../lib/errors";
import {
  generateRateLimiter,
  checkDailyCeiling,
  acquireLock,
  releaseLock,
} from "../middleware/rateLimiter";
import { pipelineLogger } from "../lib/observability";

const router = Router();

/**
 * @route   POST /api/generate
 * @desc    Triggers the LangGraph agent pipeline to pick a topic, research it, and write an article with real-time SSE streaming.
 * @access  Private
 */
router.post(
  "/generate",
  authenticate,
  generateRateLimiter,
  checkDailyCeiling,
  asyncHandler(async (req, res, next: NextFunction) => {
    const userId = (req as any).userId;
    const { interests, hint } = req.body as { interests?: string[]; hint?: string };

    // 1. Concurrency Lock check
    if (!acquireLock(userId)) {
      return next(
        new AppError(429, "An article is already generating for this user."),
      );
    }

    // Set SSE Headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders(); // Flush the headers to establish the stream

    const dbInterests = await getUserInterests(userId);
    const resolvedInterests =
      dbInterests.length > 0
        ? dbInterests
        : interests?.length
          ? interests
          : ["science", "technology", "history", "culture"];

    const { runSupervisorStream } = await import("../agents/supervisor");

    console.log(
      `\n🚀 [API] /api/generate triggered for user ${userId}, interests:`,
      resolvedInterests,
    );

    const controller = new AbortController();
    const signal = controller.signal;

    const PIPELINE_TIMEOUT_MS = 90000; // 90 seconds timeout
    const timeoutId = setTimeout(() => {
      console.error(
        `🔴 [API] Generation timed out after 90 seconds for user ${userId}. Aborting.`,
      );
      controller.abort();
    }, PIPELINE_TIMEOUT_MS);

    let generationFinished = false;

    req.on("close", () => {
      if (!generationFinished) {
        console.log(
          `📡 [API] Client closed connection for user ${userId}. Aborting pipeline.`,
        );
        controller.abort();
      }
    });

    const startTime = new Date().toISOString();
    let resultState: any = null;
    let errorMsg: string | undefined;
    const stateTracker = { lastState: {} as any };

    try {
      resultState = await runSupervisorStream(
        resolvedInterests,
        userId,
        signal,
        (event) => {
          // Send state progress events to the client
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        },
        stateTracker,
        hint
      );

      if (!resultState.currentTopic || !resultState.article) {
        throw new AppError(
          500,
          "Pipeline completed but failed to produce any content.",
        );
      }

      if (resultState.articleId) {
        await recordArticleRead(userId, resultState.articleId);
      }

      // Send final completed result
      const finalPayload = {
        status: "completed",
        result: {
          topic: {
            title: resultState.currentTopic.title,
            domain: resultState.currentTopic.domain,
            summary: resultState.currentTopic.summary,
          },
          article: resultState.article,
          articleId: resultState.articleId,
          sessionId: resultState.articleId || `session-${Date.now()}`,
          rabbitHoles: resultState.rabbitHoles,
          tldr: resultState.tldr,
        },
      };

      res.write(`data: ${JSON.stringify(finalPayload)}\n\n`);
      generationFinished = true;
    } catch (err: any) {
      generationFinished = true;
      errorMsg = err.message || String(err);
      console.error(`🔴 [API] Generation error for user ${userId}:`, errorMsg);

      const errorEvent = {
        status: "failed",
        error:
          errorMsg === "Aborted" || err.name === "AbortError"
            ? "Generation timed out or was cancelled."
            : errorMsg,
      };

      res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
    } finally {
      clearTimeout(timeoutId);
      releaseLock(userId);
      res.end();

      // Log metrics to observability JSONL and console
      const finalStateObj = resultState || stateTracker.lastState;
      const nodes = finalStateObj?.nodeMetrics || [
        {
          nodeName: "pipeline",
          durationMs: Date.now() - new Date(startTime).getTime(),
          success: !errorMsg,
          error: errorMsg,
        },
      ];

      pipelineLogger.logRun({
        userId,
        topic: finalStateObj?.currentTopic?.title,
        domain: finalStateObj?.currentTopic?.domain,
        startTime,
        nodes,
        tavilySearchCount: nodes.reduce(
          (acc: number, n: any) => acc + (n.tavilyCount || 0),
          0,
        ),
        totalCostEstimate: 0,
        status: errorMsg ? "failed" : "success",
        error: errorMsg,
      });
    }
  }),
);

/**
 * @route   POST /api/tutor/chat
 * @desc    Interacts with the context-aware tutor agent for follow-up questions
 * @access  Private
 */
router.post(
  "/tutor/chat",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = (req as any).userId;
    const { message, context, history } = req.body as {
      message: string;
      context?: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!message) {
      throw new AppError(400, "message is required.");
    }

    // Dynamically load tutor agent
    const { tutorAgent } = await import("../agents/tutor");
    const settings = await getUserSettings(userId);
    const dbInterests = await getUserInterests(userId);

    const tutorState = {
      userId,
      interests: dbInterests,
      seenTopics: [] as string[],
      userSettings: settings,
      currentTopic: context
        ? {
            id: "current",
            title: "Current Article",
            domain: "general",
            summary: "",
            connections: [],
            read: true,
          }
        : undefined,
      topicEmbedding: undefined,
      signal: undefined,
      hint: undefined,
      research: [],
      wikiResearch: [],
      article: context ?? "",
      tldr: undefined,
      rabbitHoles: undefined,
      researchSummary: undefined as string | undefined,
      dedupPassed: undefined,
      dedupAttempts: 0,
      conversationHistory: (history ?? []).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      nodeMetrics: [],
    };

    const reply = await tutorAgent(tutorState, message);
    res.json({ reply });
  }),
);

export default router;
