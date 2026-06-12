import { Router, NextFunction, Request, Response } from "express";
import { asyncHandler, authenticate } from "../middleware/auth";
import { getUserInterests } from "../lib/memory";
import { getUserSettings, deductUserTokens, getUserTokenBalance } from "../lib/db";
import { AppError } from "../lib/errors";
import { checkTokenBalance } from "../middleware/rateLimiter";
import { validateAndSanitizePrompt } from "../lib/security";

const router = Router();

/**
 * @route   POST /api/tutor/chat
 * @desc    Context-aware tutor agent for follow-up questions on the current article.
 * @access  Private
 */
router.post(
  "/chat",
  authenticate,
  checkTokenBalance,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId;
    const { message, context, history } = req.body;

    let validatedMessage = "";
    let validatedContext = "";
    try {
      validatedMessage = validateAndSanitizePrompt(message, "message", 1000);
      if (!validatedMessage) throw new AppError(400, "message is required.");
      validatedContext = validateAndSanitizePrompt(context, "context", 10000);
    } catch (err) {
      return next(err);
    }

    const { tutorAgent } = await import("../agents/tutor");
    const settings = await getUserSettings(userId);
    const dbInterests = await getUserInterests(userId);

    const tutorState = {
      userId,
      interests: dbInterests,
      seenTopics: [] as string[],
      userSettings: settings,
      requestedTopic: undefined,
      currentTopic: context
        ? { id: "current", title: "Current Article", domain: "general", summary: "", connections: [], read: true }
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
      conversationHistory: (history ?? []).map((m: any) => ({
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
      console.log(`🪙 [Token Deduction] Deducted ${totalTokens} tutor tokens from user ${userId}.`);
    } catch (dbErr) {
      console.error(`⚠️ [Token Deduction Error]:`, dbErr);
      newBalance = await getUserTokenBalance(userId).catch(() => 0);
    }

    res.json({ reply, token_balance: newBalance });
  }),
);

export default router;
