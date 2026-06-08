import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import supabase from '../lib/supabase';
import { getUserTokenBalance } from '../lib/db';

// In-memory concurrency locks: Map<userId, { timer: NodeJS.Timeout; timestamp: number }>
export const activeGenerations = new Map<string, { timer: NodeJS.Timeout; timestamp: number }>();
const LOCK_TTL_MS = 180 * 1000; // 180 seconds absolute failsafe TTL

/**
 * Concurrency check lock
 */
export function acquireLock(userId: string): boolean {
  if (activeGenerations.has(userId)) {
    return false;
  }

  // Set absolute failsafe TTL timer to release the lock in case of uncaught node loop issues
  const timer = setTimeout(() => {
    console.warn(`⚠️ [Failsafe TTL] Concurrency lock for user ${userId} expired after ${LOCK_TTL_MS}ms. Forcing release.`);
    activeGenerations.delete(userId);
  }, LOCK_TTL_MS);

  activeGenerations.set(userId, { timer, timestamp: Date.now() });
  return true;
}

export function releaseLock(userId: string): void {
  const lock = activeGenerations.get(userId);
  if (lock) {
    clearTimeout(lock.timer);
    activeGenerations.delete(userId);
  }
}

// In-memory sliding window store
interface RequestWindow {
  timestamps: number[];
}
const ipRateLimitStore = new Map<string, RequestWindow>();
const userRateLimitStore = new Map<string, RequestWindow>();

/**
 * Generic sliding-window rate limiter
 */
function isRateLimited(
  key: string,
  store: Map<string, RequestWindow>,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  let window = store.get(key);
  if (!window) {
    window = { timestamps: [] };
    store.set(key, window);
  }

  // Filter out timestamps outside the window
  window.timestamps = window.timestamps.filter((t) => now - t < windowMs);

  if (window.timestamps.length >= limit) {
    return true;
  }

  window.timestamps.push(now);
  return false;
}

/**
 * Middleware: Enforces IP/User general route rate limiting
 * Limit: 30 requests per 60 seconds
 */
export const generalRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId;
  const key = userId || req.ip || req.socket.remoteAddress || 'unknown';
  
  // Skip auth settings endpoints checking, but rate-limit general API routes
  if (isRateLimited(key, ipRateLimitStore, 30, 60 * 1000)) {
    return next(new AppError(429, 'Too many requests. Please slow down and try again in a minute.'));
  }
  next();
};

/**
 * Middleware: Enforces in-memory sliding window rate limits on the generation endpoint
 * Limit: 2 generations per 60 seconds
 */
export const generateRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId;
  if (!userId) {
    return next(new AppError(401, 'Unauthorized: User context missing'));
  }

  if (isRateLimited(userId, userRateLimitStore, 2, 60 * 1000)) {
    return next(new AppError(429, 'Generation rate limit exceeded. You can only spark 2 curiosity quests per minute.'));
  }
  next();
};

/**
 * Middleware: Checks daily article generation ceiling in Supabase
 * Ceiling: 20 articles per user per day (UTC calendar day)
 */
export const checkDailyCeiling = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId;
  if (!userId) {
    return next(new AppError(401, 'Unauthorized: User context missing'));
  }

  try {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', todayStart.toISOString());

    if (error) {
      console.error('⚠️ Database error checking daily cap:', error);
      return next(new AppError(500, 'Failed to verify generation ceiling. Please try again.'));
    }

    const currentCount = count || 0;
    if (currentCount >= 20) {
      return next(
        new AppError(
          403,
          'You have reached your limit of 20 generated articles for today. Explore your library collections or try again tomorrow!'
        )
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware: Checks user's token balance in Supabase
 * Rejects requests if balance <= 0 (except for system wonder user)
 */
export const checkTokenBalance = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId;
  if (!userId) {
    return next(new AppError(401, 'Unauthorized: User context missing'));
  }

  // Exempt system wonder user
  if (userId === '00000000-0000-0000-0000-000000000000') {
    return next();
  }

  try {
    const balance = await getUserTokenBalance(userId);
    if (balance <= 0) {
      return next(
        new AppError(
          403,
          'You have exhausted your token balance. Please contact the administrator to refill your tokens.'
        )
      );
    }
    next();
  } catch (err) {
    next(err);
  }
};

