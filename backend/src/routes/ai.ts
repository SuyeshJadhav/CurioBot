import { Router, NextFunction } from "express";
import { asyncHandler, authenticate } from "../middleware/auth";
import { getUserInterests } from "../lib/memory";
import { getUserSettings, recordArticleRead, deductUserTokens, getUserTokenBalance } from "../lib/db";
import { AppError } from "../lib/errors";
import {
  generateRateLimiter,
  checkDailyCeiling,
  acquireLock,
  releaseLock,
  checkTokenBalance,
} from "../middleware/rateLimiter";
import { pipelineLogger } from "../lib/observability";
import { validateAndSanitizePrompt, validateInterestsArray } from "../lib/security";

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
  checkTokenBalance,
  asyncHandler(async (req, res, next: NextFunction) => {
    const userId = (req as any).userId;
    const { interests, hint } = req.body;

    let validatedInterests: string[] = [];
    let validatedHint: string = "";
    try {
      validatedInterests = validateInterestsArray(interests);
      validatedHint = validateAndSanitizePrompt(hint, "hint", 150);
    } catch (err) {
      return next(err);
    }

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
        : validatedInterests.length > 0
          ? validatedInterests
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
        validatedHint || undefined
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

      // Calculate total tokens consumed by nodes in this generation
      const totalTokens = nodes.reduce((acc: number, n: any) => acc + (n.inputTokens || 0) + (n.outputTokens || 0), 0);
      if (totalTokens > 0) {
        try {
          await deductUserTokens(userId, totalTokens);
          console.log(`🪙 [Token Deduction] Deducted ${totalTokens} tokens from user ${userId}`);
        } catch (dbErr) {
          console.error(`⚠️ [Token Deduction Error] Failed to deduct tokens for user ${userId}:`, dbErr);
        }
      }

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
  checkTokenBalance,
  asyncHandler(async (req, res, next: NextFunction) => {
    const userId = (req as any).userId;
    const { message, context, history } = req.body;

    let validatedMessage = "";
    let validatedContext = "";
    try {
      validatedMessage = validateAndSanitizePrompt(message, "message", 1000);
      if (!validatedMessage) {
        throw new AppError(400, "message is required.");
      }
      validatedContext = validateAndSanitizePrompt(context, "context", 10000);
    } catch (err) {
      return next(err);
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
      article: validatedContext,
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

    const { reply, inputTokens, outputTokens } = await tutorAgent(tutorState, validatedMessage);
    const totalTokens = inputTokens + outputTokens;

    let newBalance = 0;
    try {
      newBalance = await deductUserTokens(userId, totalTokens);
      console.log(`🪙 [Token Deduction] Deducted ${totalTokens} tutor tokens from user ${userId}. New balance: ${newBalance}`);
    } catch (dbErr) {
      console.error(`⚠️ [Token Deduction Error] Failed to deduct tutor tokens for user ${userId}:`, dbErr);
      newBalance = await getUserTokenBalance(userId).catch(() => 0);
    }

    res.json({ reply, token_balance: newBalance });
  }),
);

export default router;
