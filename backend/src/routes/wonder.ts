import { Router } from "express";
import { asyncHandler, authenticate } from "../middleware/auth";
import { getDailyWonder, getUserSettings, publishDailyWonder, saveArticle } from "../lib/db";
import supabase from "../lib/supabase";
import { AppError } from "../lib/errors";

const router = Router();

/**
 * @route   GET /api/wonder
 * @desc    Get the current published Daily Wonder
 * @access  Private
 */
router.get(
  "/wonder",
  authenticate,
  asyncHandler(async (req, res) => {
    const wonder = await getDailyWonder();
    res.json(wonder || { topic: null });
  }),
);

/**
 * @route   POST /api/wonder/generate
 * @desc    Generate and publish today's Daily Wonder if not already created
 * @access  Private
 */
router.post(
  "/wonder/generate",
  authenticate,
  asyncHandler(async (req, res, next) => {
    const userId = (req as any).userId;
    const existing = await getDailyWonder();
    if (existing) {
      res.json(existing);
      return;
    }

    // Check if user settings match the pre-generation pool configuration
    const userSettings = await getUserSettings(userId);
    const prefsMatch =
      userSettings.knowledge_level === "intermediate" &&
      ["mixed", "wildcard"].includes(userSettings.topic_novelty);

    let poolRow = null;
    if (prefsMatch) {
      console.log("🔍 [Daily Wonder] Checking pre-generation wonder pool...");
      const { data, error: poolError } = await supabase
        .from("wonder_pool")
        .select("*")
        .is("used_at", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (poolError) {
        console.warn("⚠️ Warning: Failed to query wonder pool, falling back to live generation:", poolError.message);
      }
      poolRow = data;
    } else {
      console.log("ℹ️ [Daily Wonder] Personalization mismatch for pool. Skipping wonder pool and falling back to on-demand generation.");
    }

    if (poolRow) {
      console.log(`✨ [Daily Wonder] Consuming pre-generated article for topic: "${poolRow.topic}"`);
      
      // Mark as used in wonder_pool
      await supabase
        .from("wonder_pool")
        .update({ used_at: new Date().toISOString() })
        .eq("id", poolRow.id);

      // Save as user article
      let articleId: string;
      try {
        articleId = await saveArticle(
          userId,
          poolRow.topic,
          poolRow.article,
          poolRow.domain,
          poolRow.summary || "A daily wonder",
          poolRow.rabbit_holes || [],
          poolRow.tldr || ""
        );
      } catch (dbErr: any) {
        console.error("⚠️ Failed to save pooled wonder to user articles:", dbErr.message);
        return next(new AppError(500, "Failed to persist pooled daily wonder article."));
      }

      // Publish as today's Daily Wonder
      await publishDailyWonder(
        poolRow.topic,
        poolRow.summary || "A daily wonder",
        poolRow.domain,
        articleId
      );

      const wonder = await getDailyWonder();
      res.json({
        ...wonder,
        article: poolRow.article,
        article_id: articleId,
      });
      return;
    }

    // 2. Fallback to live generation
    const { supervisorAgent } = await import("../agents/supervisor");
    console.log(`\n🚀 [API] Wonder pool empty. Generating Daily Wonder live for user ${userId}...`);

    // Trigger topic generation & article creation with standard daily wonder categories
    const result = await supervisorAgent(
      ["astronomy", "nature", "lost history", "deep oceans"],
      userId,
    );

    if (result.currentTopic && result.articleId) {
      await publishDailyWonder(
        result.currentTopic.title,
        result.currentTopic.summary,
        result.currentTopic.domain,
        result.articleId,
      );

      // Fetch the wonder we just created
      const wonder = await getDailyWonder();
      res.json({
        ...wonder,
        article: result.article,
        article_id: result.articleId,
      });
    } else {
      return next(
        new AppError(500, "Failed to generate daily wonder content."),
      );
    }
  }),
);

export default router;
