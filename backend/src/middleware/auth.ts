import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/auth';
import { AppError } from '../lib/errors';

/**
 * Async handler wrapper to automatically forward rejected promises and exceptions
 * to the global express error handler.
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void | any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Authentication middleware that verifies JWT bearer tokens.
 * Attaches the authenticated userId to the request object.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'Unauthorized: Missing or invalid token'));
  }
  
  const token = authHeader.split(' ')[1];
  const userId = verifyToken(token);
  if (!userId) {
    return next(new AppError(401, 'Unauthorized: Token expired or invalid'));
  }
  
  (req as any).userId = userId;
  next();
};
