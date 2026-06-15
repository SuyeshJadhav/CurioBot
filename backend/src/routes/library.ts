import { Router } from "express";
import { asyncHandler, authenticate } from "../middleware/auth";
import {
  getLibraryCollections,
  createLibraryCollection,
  getCollectionArticles,
  addArticleToCollection,
} from "../lib/db";
import { AppError } from "../lib/errors";
import { validateLengthOnly } from "../lib/security";

const router = Router();

/**
 * @route   GET /api/library
 * @desc    Get user's custom library collections list
 * @access  Private
 */
router.get(
  "/library",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = (req as any).userId;
    const collections = await getLibraryCollections(userId);
    res.json(collections);
  }),
);

/**
 * @route   POST /api/library
 * @desc    Create a new library collection folder
 * @access  Private
 */
router.post(
  "/library",
  authenticate,
  asyncHandler(async (req, res, next) => {
    const userId = (req as any).userId;
    const { name, description } = req.body;
    if (typeof name !== "string" || !name.trim()) {
      return next(new AppError(400, "Collection name is required and must be a string"));
    }
    let sanitizedName = "";
    let sanitizedDesc = "";
    try {
      sanitizedName = validateLengthOnly(name, "name", 100);
      sanitizedDesc = validateLengthOnly(description, "description", 500);
    } catch (err) {
      return next(err);
    }
    const collection = await createLibraryCollection(userId, sanitizedName, sanitizedDesc);
    res.json(collection);
  }),
);

/**
 * @route   GET /api/library/:collectionId/articles
 * @desc    Get all articles belonging to a specific collection folder
 * @access  Private
 */
router.get(
  "/library/:collectionId/articles",
  authenticate,
  asyncHandler(async (req, res, next) => {
    const collectionId = req.params.collectionId;
    if (typeof collectionId !== "string" || !collectionId.trim()) {
      return next(new AppError(400, "Invalid collection ID"));
    }
    const articles = await getCollectionArticles(collectionId);
    res.json(articles);
  }),
);

/**
 * @route   POST /api/library/:collectionId/articles
 * @desc    Add an existing article to a library collection
 * @access  Private
 */
router.post(
  "/library/:collectionId/articles",
  authenticate,
  asyncHandler(async (req, res, next) => {
    const collectionId = req.params.collectionId;
    if (typeof collectionId !== "string" || !collectionId.trim()) {
      return next(new AppError(400, "Invalid collection ID"));
    }
    const { articleId } = req.body;
    if (typeof articleId !== "string" || !articleId.trim()) {
      return next(new AppError(400, "articleId must be a valid string"));
    }
    await addArticleToCollection(collectionId, articleId);
    res.json({ success: true });
  }),
);

export default router;
