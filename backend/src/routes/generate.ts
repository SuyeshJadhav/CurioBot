import { Router, NextFunction, Request, Response } from "express";
import Redis from "ioredis";
import { asyncHandler, authenticate } from "../middleware/auth";
import { getUserInterests } from "../lib/memory";
import { AppError } from "../lib/errors";
import {
  generateRateLimiter,
  checkDailyCeiling,
  acquireLock,
  releaseLock,
  checkTokenBalance,
} from "../middleware/rateLimiter";
import {
  validateAndSanitizePrompt,
  validateInterestsArray,
} from "../lib/security";
import { ai, safetySettings } from "../lib/gemini";
import { generationQueue, queueEvents } from "../lib/queue";

const router = Router();

// ── GET /generate/recommendations ───────────────────────────────────────────
router.get(
  "/recommendations",
  authenticate,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId;
    const dbInterests = await getUserInterests(userId);
    const resolvedInterests =
      dbInterests.length > 0
        ? dbInterests
        : [
            "astronomy",
            "nature",
            "lost history",
            "deep oceans",
            "ancient civilizations",
            "quantum mechanics",
            "space exploration",
            "biotechnology",
            "neuroscience",
            "game theory",
          ];

    const prompt = `You are the recommendation director of Curios.
Your task is to review the user's interest categories and output exactly 3 creative, highly engaging article topic suggestions.

User's interests:
${resolvedInterests.map((i) => `- ${i}`).join("\n")}

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
      console.warn(
        "⚠️ [Recommendations] Failed to generate dynamic recommendations, using fallback:",
        err.message,
      );
      // Fallback: select 3 categories and construct standard recommendations
      const shuffled = [...resolvedInterests].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 3);
      const fallbackList = selected.map((tag) => {
        return {
          tag: tag,
          topic: `Unsolved mysteries and future directions in ${tag}`,
        };
      });
      res.json(fallbackList);
    }
  }),
);

// ── Active generation tracking for SSE reconnection ──────────────────────────
interface ActiveGeneration {
  jobId: string;
  buffer: string[]; // All SSE payloads sent so far in this run
  writers: Response[]; // All currently connected response streams
  disconnectTimer?: ReturnType<typeof setTimeout>;
  finished: boolean;
}
const activeGenerations = new Map<string, ActiveGeneration>();
const jobToUser = new Map<string, string>();

const GRACE_PERIOD_MS = 8_000; // Wait 8s before aborting on client disconnect

// Redis connection to publish cancellation signals to the worker
const redisPub = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

// ── Helper: send an SSE event and buffer it ──────────────────────────────────
function broadcast(gen: ActiveGeneration, payload: any) {
  const line = `data: ${JSON.stringify(payload)}\n\n`;
  gen.buffer.push(line);
  for (const writer of gen.writers) {
    try {
      writer.write(line);
    } catch {
      /* connection may have already closed */
    }
  }
}

// ── Global QueueEvents Listeners (Prevents Memory Leaks) ────────────────────────
queueEvents.on("progress", ({ jobId, data }) => {
  const userId = jobToUser.get(jobId);
  if (!userId) return;
  const gen = activeGenerations.get(userId);
  if (gen) {
    broadcast(gen, data);
  }
});

queueEvents.on("completed", ({ jobId, returnvalue }) => {
  const userId = jobToUser.get(jobId);
  if (!userId) return;
  const gen = activeGenerations.get(userId);
  if (gen) {
    let resultObj = returnvalue;
    try {
      if (typeof returnvalue === "string") {
        resultObj = JSON.parse(returnvalue);
      }
    } catch {
      /* ignore parsing error */
    }
    broadcast(gen, resultObj);
    gen.finished = true;
    cleanupActiveRun(userId);
  }
});

queueEvents.on("failed", ({ jobId, failedReason }) => {
  const userId = jobToUser.get(jobId);
  if (!userId) return;
  const gen = activeGenerations.get(userId);
  if (gen) {
    broadcast(gen, {
      status: "failed",
      error: failedReason || "Generation failed on worker.",
    });
    gen.finished = true;
    cleanupActiveRun(userId);
  }
});

function cleanupActiveRun(userId: string) {
  const gen = activeGenerations.get(userId);
  if (!gen) return;

  if (gen.disconnectTimer) {
    clearTimeout(gen.disconnectTimer);
  }

  for (const writer of gen.writers) {
    try {
      writer.end();
    } catch {
      /* ignore */
    }
  }

  jobToUser.delete(gen.jobId);
  activeGenerations.delete(userId);
  releaseLock(userId);
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
    const { interests, hint, topic } = req.body;

    let validatedInterests: string[] = [];
    let validatedHint = "";
    let validatedTopic: any = undefined;
    try {
      validatedInterests = validateInterestsArray(interests);
      validatedHint = validateAndSanitizePrompt(hint, "hint", 150);
      if (topic) {
        if (typeof topic !== "object" || Array.isArray(topic)) {
          throw new AppError(400, "topic must be an object.");
        }
        if (!topic.title) {
          throw new AppError(400, "topic.title is required.");
        }
        validatedTopic = {
          title: validateAndSanitizePrompt(topic.title, "topic.title", 150),
          domain: topic.domain
            ? validateAndSanitizePrompt(topic.domain, "topic.domain", 50)
            : undefined,
          summary: topic.summary
            ? validateAndSanitizePrompt(topic.summary, "topic.summary", 250)
            : undefined,
        };
      }
    } catch (err) {
      return next(err);
    }

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
        try {
          res.write(line);
        } catch {
          /* ignore */
        }
      }
      res.on("close", () => handleDisconnect(userId, res));
      return;
    }

    // ── Acquire concurrency lock ─────────────────────────────────────────────
    if (!acquireLock(userId)) {
      return next(
        new AppError(429, "An article is already generating for this user."),
      );
    }

    // ── Set SSE headers ──────────────────────────────────────────────────────
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      const dbInterests = await getUserInterests(userId);
      const resolvedInterests =
        validatedInterests.length > 0
          ? validatedInterests
          : dbInterests.length > 0
            ? dbInterests
            : ["science", "technology", "history", "culture"];

      const job = await generationQueue.add("generate-article", {
        userId,
        interests: resolvedInterests,
        hint: validatedHint,
        topic: validatedTopic,
      });

      const jobId = job.id;
      if (!jobId) {
        throw new Error("Job ID was not generated by BullMQ");
      }

      console.log(
        `🎟️ [Express] Job ${jobId} added to queue for user ${userId}`,
      );

      const gen: ActiveGeneration = {
        jobId: jobId,
        buffer: [],
        writers: [res],
        finished: false,
      };
      activeGenerations.set(userId, gen);
      jobToUser.set(jobId, userId);

      res.on("close", () => handleDisconnect(userId, res));
    } catch (err: any) {
      releaseLock(userId);
      console.error(`🔴 [API] Failed to start generation job:`, err);
      res.write(`data: ${JSON.stringify({ status: "failed", error: "Failed to queue generation task." })}\n\n`);
      res.end();
    }
  }),
);

// ── Disconnect handler: start grace-period timer ─────────────────────────────
function handleDisconnect(userId: string, res: Response) {
  const gen = activeGenerations.get(userId);
  if (!gen || gen.finished) return;
  gen.writers = gen.writers.filter((w) => w !== res);
  if (gen.writers.length > 0) return; // Another tab is still connected

  gen.disconnectTimer = setTimeout(async () => {
    if (!gen.finished) {
      console.log(
        `📡 [API] Grace period expired for user ${userId}. Aborting job ${gen.jobId}.`,
      );
      try {
        // Publish cancellation message to Redis Pub/Sub channel
        await redisPub.publish(`job-cancel:${gen.jobId}`, "cancel");

        const job = await generationQueue.getJob(gen.jobId);
        if (job) {
          await job.discard();
          await job.remove();
        }
      } catch (err) {
        console.error(`⚠️ Error aborting job ${gen.jobId}:`, err);
      }
      cleanupActiveRun(userId);
    }
  }, GRACE_PERIOD_MS);
  console.log(
    `📡 [API] Client disconnected for user ${userId}. Grace period started (${GRACE_PERIOD_MS}ms).`,
  );
}

export default router;
