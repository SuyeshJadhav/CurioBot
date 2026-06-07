import { Router, NextFunction } from "express";
import { asyncHandler, authenticate } from "../middleware/auth";
import { getUserSettings, saveUserSettings } from "../lib/db";
import { getUserInterests, addInterest, deleteInterest } from "../lib/memory";
import { AppError } from "../lib/errors";

const router = Router();

/**
 * @route   GET /api/settings
 * @desc    Get user preference configurations (model choice, writing style, preferred tone)
 * @access  Private
 */
router.get(
  "/settings",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = (req as any).userId;
    const settings = await getUserSettings(userId);
    res.json(settings);
  }),
);

const ALLOWED_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
];

const ALLOWED_KNOWLEDGE_LEVELS = ["beginner", "intermediate", "expert"];
const ALLOWED_READING_TIMES = ["2min", "5min", "10min"];
const ALLOWED_TOPIC_NOVELTY = ["familiar", "mixed", "wildcard"];


function sanitizeInputString(input: any, maxLength: number): string {
  if (typeof input !== "string") return "";
  let sanitized = input.trim().slice(0, maxLength);
  const overridePatterns = [
    /ignore\s+previous/gi,
    /override\s+instruction/gi,
    /system\s+prompt/gi,
    /ignore\s+above/gi,
    /you\s+must\s+ignore/gi,
    /disregard/gi,
  ];
  for (const pattern of overridePatterns) {
    sanitized = sanitized.replace(pattern, "[removed]");
  }
  return sanitized;
}

/**
 * @route   PUT /api/settings
 * @desc    Save/update user preference configurations
 * @access  Private
 */
router.put(
  "/settings",
  authenticate,
  asyncHandler(async (req, res, next: NextFunction) => {
    const userId = (req as any).userId;
    const { knowledge_level, reading_time, topic_novelty, model, onboarding_complete } = req.body;

    // Validate knowledge_level if provided
    if (knowledge_level && !ALLOWED_KNOWLEDGE_LEVELS.includes(knowledge_level)) {
      return next(new AppError(400, `Invalid knowledge_level. Options: ${ALLOWED_KNOWLEDGE_LEVELS.join(", ")}`));
    }

    // Validate reading_time if provided
    if (reading_time && !ALLOWED_READING_TIMES.includes(reading_time)) {
      return next(new AppError(400, `Invalid reading_time. Options: ${ALLOWED_READING_TIMES.join(", ")}`));
    }

    // Validate topic_novelty if provided
    if (topic_novelty && !ALLOWED_TOPIC_NOVELTY.includes(topic_novelty)) {
      return next(new AppError(400, `Invalid topic_novelty. Options: ${ALLOWED_TOPIC_NOVELTY.join(", ")}`));
    }

    // Validate model if provided
    if (model && !ALLOWED_MODELS.includes(model)) {
      return next(new AppError(400, `Invalid model. Options: ${ALLOWED_MODELS.join(", ")}`));
    }

    const existing = await getUserSettings(userId);

    const updated = {
      ...existing,
      ...(model ? { model } : {}),
      ...(knowledge_level ? { knowledge_level } : {}),
      ...(reading_time ? { reading_time } : {}),
      ...(topic_novelty ? { topic_novelty } : {}),
      ...(onboarding_complete !== undefined ? { onboarding_complete: !!onboarding_complete } : {}),
    };

    await saveUserSettings(userId, updated);

    res.json({ success: true });
  }),
);

/**
 * @route   GET /api/interests
 * @desc    Get all current user seed interests from memory
 * @access  Private
 */
router.get(
  "/interests",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = (req as any).userId;
    const interests = await getUserInterests(userId);
    res.json(interests);
  }),
);

/**
 * @route   POST /api/interests
 * @desc    Add a new seed interest to the user's vector profile
 * @access  Private
 */
router.post(
  "/interests",
  authenticate,
  asyncHandler(async (req, res, next: NextFunction) => {
    const userId = (req as any).userId;
    const { interest } = req.body;

    const sanitizedInterest = sanitizeInputString(interest, 50);
    if (!sanitizedInterest) {
      return next(
        new AppError(
          400,
          "interest is required and must be under 50 characters.",
        ),
      );
    }

    await addInterest(sanitizedInterest, userId);
    res.json({ success: true });
  }),
);

/**
 * @route   DELETE /api/interests/:interest
 * @desc    Delete a seed interest from the user's vector profile
 * @access  Private
 */
router.delete(
  "/interests/:interest",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = (req as any).userId;
    const interest = req.params.interest as string;
    await deleteInterest(interest, userId);
    res.json({ success: true });
  }),
);

export default router;
