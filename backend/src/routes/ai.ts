/**
 * ai.ts — Route multiplexer for AI-related endpoints.
 *
 * Individual route handlers live in focused files:
 *   generate.ts  →  POST /api/generate  (SSE article pipeline)
 *   tutor.ts     →  POST /api/tutor/chat
 */
import { Router } from "express";
import generateRouter from "./generate";
import tutorRouter from "./tutor";

const router = Router();

router.use("/generate", generateRouter);
router.use("/tutor", tutorRouter);

export default router;
