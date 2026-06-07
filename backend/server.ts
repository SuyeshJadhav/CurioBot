import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiLogger } from './src/middleware/logger';
import { errorHandler } from './src/middleware/errorHandler';
import { generalRateLimiter } from './src/middleware/rateLimiter';

// Import modular routers
import authRouter from './src/routes/auth';
import aiRouter from './src/routes/ai';
import articlesRouter from './src/routes/articles';
import wonderRouter from './src/routes/wonder';
import libraryRouter from './src/routes/library';
import settingsRouter from './src/routes/settings';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Apply Global Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(generalRateLimiter);
app.use(apiLogger); // Register custom colored request/response logging

// Health check endpoint (Public)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'CurioBot API' });
});

// Register modular routers
app.use('/api/auth', authRouter);
app.use('/api', aiRouter);
app.use('/api', articlesRouter);
app.use('/api', wonderRouter);
app.use('/api', libraryRouter);
app.use('/api', settingsRouter);

// Centralized Error Handling Middleware (must be registered last)
app.use(errorHandler);

import { initWonderWorker } from './src/lib/wonderWorker';

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`✅ CurioBot API running at http://localhost:${PORT}`);
    initWonderWorker();
  });
}

export default app;
