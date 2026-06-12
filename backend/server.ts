import "dotenv/config";

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiLogger } from './src/middleware/logger';
import { errorHandler } from './src/middleware/errorHandler';
import { generalRateLimiter } from './src/middleware/rateLimiter';

// Import modular routers
import authRouter from './src/routes/auth';
import aiRouter from './src/routes/ai';
import articlesRouter from './src/routes/articles';
import libraryRouter from './src/routes/library';
import settingsRouter from './src/routes/settings';

const app = express();
const PORT = process.env.PORT || 3001;

// Apply Global Security Middlewares
app.use(helmet());

// Tighten CORS to allow frontend endpoints only
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL || 'https://curio-bot.vercel.app']
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true
}));

// Enforce size limit to prevent Denial of Service (DoS) payload attacks
app.use(express.json({ limit: '10kb' }));
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
app.use('/api', libraryRouter);
app.use('/api', settingsRouter);

// Centralized Error Handling Middleware (must be registered last)
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`✅ CurioBot API running at http://localhost:${PORT}`);
  });
}

export default app;
