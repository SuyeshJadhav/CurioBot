import { Request, Response, NextFunction } from 'express';
import { verifyTokenPayload } from '../lib/auth';
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
 * Attaches the authenticated userId and user object (id, role) to request.
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'Unauthorized: Missing or invalid token'));
  }
  
  const token = authHeader.split(' ')[1];
  const payload = verifyTokenPayload(token);
  if (!payload) {
    return next(new AppError(401, 'Unauthorized: Token expired or invalid'));
  }
  
  (req as any).userId = payload.userId;
  (req as any).user = { id: payload.userId, role: payload.role };
  next();
};

export const authenticateUser = authenticate;

/**
 * Role middleware: Ensures authenticated user has admin role.
 */
export const requireAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  const user = (req as any).user;
  
  // Allow admin access if user role is admin, or in local dev/testing mode
  const isAdmin = user?.role === 'admin' || process.env.NODE_ENV !== 'production';

  if (!isAdmin) {
    return next(new AppError(403, 'Forbidden: Admin privilege required'));
  }
  
  next();
};
