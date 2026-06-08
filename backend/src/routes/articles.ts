import { Router } from "express";
import { asyncHandler, authenticate } from "../middleware/auth";
import {
  getArticleHistory,
  getArticleById,
  getSavedSketches,
  saveSketch,
  updateSketchNotes,
  unsaveSketch,
  deleteArticle,
  recordArticleRead,
} from "../lib/db";
import { AppError } from "../lib/errors";

const router = Router();

/**
 * @route   GET /api/history
 * @desc    Get user's generated article history list
 * @access  Private
 */
router.get(
  "/history",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = (req as any).userId;
    const history = await getArticleHistory(userId);
    res.json(history);
  }),
);

/**
 * @route   GET /api/articles/:id
 * @desc    Get complete article details by id
 * @access  Private
 */
router.get(
  "/articles/:id",
  authenticate,
  asyncHandler(async (req, res, next) => {
    const article = await getArticleById(req.params.id as string);
    if (!article) {
      return next(new AppError(404, "Article not found"));
    }
    const userId = (req as any).userId;
    await recordArticleRead(userId, article.id);
    res.json(article);
  }),
);

/**
 * @route   DELETE /api/articles/:id
 * @desc    Delete an article (removes from collections, sketches, daily wonders, and database)
 * @access  Private
 */
router.delete(
  "/articles/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = (req as any).userId;
    const articleId = req.params.id as string;
    await deleteArticle(userId, articleId);
    res.json({ success: true });
  }),
);

/**
 * @route   GET /api/saved
 * @desc    Get all user saved sketches
 * @access  Private
 */
router.get(
  "/saved",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = (req as any).userId;
    const saved = await getSavedSketches(userId);
    res.json(saved);
  }),
);

/**
 * @route   POST /api/saved
 * @desc    Save an article sketch/note
 * @access  Private
 */
router.post(
  "/saved",
  authenticate,
  asyncHandler(async (req, res, next) => {
    const userId = (req as any).userId;
    const { articleId, notes } = req.body;
    if (!articleId) {
      return next(new AppError(400, "articleId is required"));
    }
    await saveSketch(userId, articleId, notes);
    res.json({ success: true });
  }),
);

/**
 * @route   PUT /api/saved/:articleId/notes
 * @desc    Update notes on a saved sketch
 * @access  Private
 */
router.put(
  "/saved/:articleId/notes",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = (req as any).userId;
    const { notes } = req.body;
    await updateSketchNotes(userId, req.params.articleId as string, notes);
    res.json({ success: true });
  }),
);

/**
 * @route   DELETE /api/saved/:articleId
 * @desc    Unsave a sketch
 * @access  Private
 */
router.delete(
  "/saved/:articleId",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = (req as any).userId;
    await unsaveSketch(userId, req.params.articleId as string);
    res.json({ success: true });
  }),
);



export default router;
