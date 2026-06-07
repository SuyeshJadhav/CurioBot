import { Request, Response, NextFunction } from 'express';

/**
 * Express middleware for logging incoming requests and outgoing responses.
 * Highlights HTTP status code, request method, route, duration, and user ID context.
 */
export const apiLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime();
  const { method, originalUrl } = req;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    const status = res.statusCode;

    // ANSI escape codes for coloring terminal output
    let statusColor = '\x1b[32m'; // Green for 2xx
    if (status >= 300 && status < 400) {
      statusColor = '\x1b[36m'; // Cyan for 3xx (redirection)
    } else if (status >= 400 && status < 500) {
      statusColor = '\x1b[33m'; // Yellow for 4xx (client errors)
    } else if (status >= 500) {
      statusColor = '\x1b[31m'; // Red for 5xx (server errors)
    }

    const resetColor = '\x1b[0m';
    const methodColor = '\x1b[35m'; // Magenta for HTTP methods
    const timeColor = '\x1b[33m'; // Yellow/orange for response duration
    
    const userId = (req as any).userId ? ` [User: ${(req as any).userId}]` : '';
    const timestamp = new Date().toISOString();

    console.log(
      `[${timestamp}] ${methodColor}${method}${resetColor} ${originalUrl} - Status: ${statusColor}${status}${resetColor} - Time: ${timeColor}${timeInMs}ms${resetColor}${userId} - IP: ${ip}`
    );
  });

  next();
};
