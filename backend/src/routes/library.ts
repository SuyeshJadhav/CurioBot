import { Router } from "express";
import { asyncHandler, authenticate } from "../middleware/auth";
import {
  getLibraryCollections,
  createLibraryCollection,
  getCollectionArticles,
  addArticleToCollection,
} from "../lib/db";
import { AppError } from "../lib/errors";

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
    if (!name) {
      return next(new AppError(400, "Collection name is required"));
    }
    const collection = await createLibraryCollection(userId, name, description);
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
  asyncHandler(async (req, res) => {
    const articles = await getCollectionArticles(
      req.params.collectionId as string,
    );
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
    const { articleId } = req.body;
    if (!articleId) {
      return next(new AppError(400, "articleId is required"));
    }
    await addArticleToCollection(req.params.collectionId as string, articleId);
    res.json({ success: true });
  }),
);

export default router;
