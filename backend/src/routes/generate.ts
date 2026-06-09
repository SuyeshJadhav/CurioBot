import { Router, NextFunction, Request, Response } from "express";
import { asyncHandler, authenticate } from "../middleware/auth";
import { getUserInterests } from "../lib/memory";
import { recordArticleRead, deductUserTokens } from "../lib/db";
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
import { ai, safetySettings } from "../lib/gemini";

const router = Router();

// ── GET /generate/recommendations ───────────────────────────────────────────
router.get(
  "/recommendations",
  authenticate,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId;
    const dbInterests = await getUserInterests(userId);
    const resolvedInterests = dbInterests.length > 0
      ? dbInterests
      : ["astronomy", "nature", "lost history", "deep oceans", "ancient civilizations", "quantum mechanics", "space exploration", "biotechnology", "neuroscience", "game theory"];

    const prompt = `You are the recommendation director of Curios.
Your task is to review the user's interest categories and output exactly 3 creative, highly engaging article topic suggestions.

User's interests:
${resolvedInterests.map(i => `- ${i}`).join("\n")}

For each suggestion, pick one of the user's interest categories as the "tag", and create a specific, catchy, short article topic (think click-worthy magazine headline).

Response format: respond ONLY with valid JSON array containing exactly 3 objects (no markdown blocks, no other text):
[
  { "tag": "astronomy", "topic": "What hides inside supermassive black holes?" },
  { "tag": "neuroscience", "topic": "How sleep physically flushes toxins from the brain" },
  { "tag": "lost history", "topic": "Unsolved mysteries of the Bronze Age collapse" }
]`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          safetySettings: safetySettings as any,
        },
      });

      const text = response.text?.replace(/```json|```/g, "").trim();
      if (!text) {
        throw new Error("Empty response from model");
      }

      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed) || parsed.length !== 3) {
        throw new Error("Invalid response array length");
      }

      res.json(parsed);
    } catch (err: any) {
      console.warn("⚠️ [Recommendations] Failed to generate dynamic recommendations, using fallback:", err.message);
      // Fallback: select 3 categories and construct standard recommendations
      const shuffled = [...resolvedInterests].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 3);
      const fallbackList = selected.map((tag) => {
        return {
          tag: tag,
          topic: `Unsolved mysteries and future directions in ${tag}`
        };
      });
      res.json(fallbackList);
    }
  })
);

// ── Active generation tracking for SSE reconnection ──────────────────────────
interface ActiveGeneration {
  controller: AbortController;
  buffer: string[];           // All SSE payloads sent so far in this run
  writers: Response[];        // All currently connected response streams
  disconnectTimer?: ReturnType<typeof setTimeout>;
  finished: boolean;
}
const activeGenerations = new Map<string, ActiveGeneration>();

const GRACE_PERIOD_MS = 8_000; // Wait 8s before aborting on client disconnect
const PIPELINE_TIMEOUT_MS = 90_000;

// ── Helper: send an SSE event and buffer it ──────────────────────────────────
function broadcast(gen: ActiveGeneration, payload: object) {
  const line = `data: ${JSON.stringify(payload)}\n\n`;
  gen.buffer.push(line);
  for (const writer of gen.writers) {
    try { writer.write(line); } catch { /* connection may have already closed */ }
  }
}

// ── POST /generate ───────────────────────────────────────────────────────────
router.post(
  "/",
  authenticate,
  generateRateLimiter,
  checkDailyCeiling,
  checkTokenBalance,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId;
    const { interests, hint } = req.body;

    let validatedInterests: string[] = [];
    let validatedHint = "";
    try {
      validatedInterests = validateInterestsArray(interests);
      validatedHint = validateAndSanitizePrompt(hint, "hint", 150);
    } catch (err) { return next(err); }

    // ── Reconnection: replay buffer if an active run exists ─────────────────
    const existing = activeGenerations.get(userId);
    if (existing && !existing.finished) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      if (existing.disconnectTimer) {
        clearTimeout(existing.disconnectTimer);
        existing.disconnectTimer = undefined;
      }
      existing.writers.push(res);
      for (const line of existing.buffer) {
        try { res.write(line); } catch { /* ignore */ }
      }
      res.on("close", () => handleDisconnect(userId, res));
      return;
    }

    // ── Acquire concurrency lock ─────────────────────────────────────────────
    if (!acquireLock(userId)) {
      return next(new AppError(429, "An article is already generating for this user."));
    }

    // ── Set SSE headers ──────────────────────────────────────────────────────
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const controller = new AbortController();
    const gen: ActiveGeneration = { controller, buffer: [], writers: [res], finished: false };
    activeGenerations.set(userId, gen);

    const timeoutId = setTimeout(() => {
      console.error(`🔴 [API] Generation timed out for user ${userId}.`);
      controller.abort();
    }, PIPELINE_TIMEOUT_MS);

    res.on("close", () => handleDisconnect(userId, res));

    const dbInterests = await getUserInterests(userId);
    const resolvedInterests = validatedInterests.length > 0
      ? validatedInterests
      : dbInterests.length > 0 ? dbInterests : ["science", "technology", "history", "culture"];

    const { runSupervisorStream } = await import("../agents/supervisor");
    console.log(`\n🚀 [API] /api/generate for user ${userId}, interests:`, resolvedInterests);

    const startTime = new Date().toISOString();
    let resultState: any = null;
    let errorMsg: string | undefined;
    const stateTracker = { lastState: {} as any };

    try {
      resultState = await runSupervisorStream(
        resolvedInterests, userId, controller.signal,
        (event) => broadcast(gen, event),
        stateTracker, validatedHint || undefined,
      );

      if (!resultState.currentTopic || !resultState.article) {
        throw new AppError(500, "Pipeline completed but failed to produce any content.");
      }
      if (resultState.articleId) await recordArticleRead(userId, resultState.articleId);

      broadcast(gen, {
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
      });
      gen.finished = true;
    } catch (err: any) {
      gen.finished = true;
      errorMsg = err.message || String(err);
      console.error(`🔴 [API] Generation error for user ${userId}:`, errorMsg);
      broadcast(gen, {
        status: "failed",
        error: errorMsg === "Aborted" || err.name === "AbortError"
          ? "Generation timed out or was cancelled." : errorMsg,
      });
    } finally {
      clearTimeout(timeoutId);
      if (gen.disconnectTimer) {
        clearTimeout(gen.disconnectTimer);
      }
      releaseLock(userId);
      activeGenerations.delete(userId);
      for (const writer of gen.writers) { try { writer.end(); } catch { /* ignore */ } }

      // Observability
      const finalStateObj = resultState || stateTracker.lastState;
      const nodes = finalStateObj?.nodeMetrics || [{
        nodeName: "pipeline",
        durationMs: Date.now() - new Date(startTime).getTime(),
        success: !errorMsg, error: errorMsg,
      }];
      const totalTokens = nodes.reduce((acc: number, n: any) =>
        acc + (n.inputTokens || 0) + (n.outputTokens || 0), 0);
      if (totalTokens > 0) {
        await deductUserTokens(userId, totalTokens).catch((e: any) =>
          console.error(`⚠️ [Token Deduction Error]:`, e));
      }
      pipelineLogger.logRun({
        userId, topic: finalStateObj?.currentTopic?.title,
        domain: finalStateObj?.currentTopic?.domain, startTime, nodes,
        tavilySearchCount: nodes.reduce((acc: number, n: any) => acc + (n.tavilyCount || 0), 0),
        totalCostEstimate: 0, status: errorMsg ? "failed" : "success", error: errorMsg,
      });
    }
  }),
);

// ── Disconnect handler: start grace-period timer ─────────────────────────────
function handleDisconnect(userId: string, res: Response) {
  const gen = activeGenerations.get(userId);
  if (!gen || gen.finished) return;
  gen.writers = gen.writers.filter((w) => w !== res);
  if (gen.writers.length > 0) return; // Another tab is still connected

  gen.disconnectTimer = setTimeout(() => {
    if (!gen.finished) {
      console.log(`📡 [API] Grace period expired for user ${userId}. Aborting pipeline.`);
      gen.controller.abort();
    }
  }, GRACE_PERIOD_MS);
  console.log(`📡 [API] Client disconnected for user ${userId}. Grace period started (${GRACE_PERIOD_MS}ms).`);
}

export default router;
