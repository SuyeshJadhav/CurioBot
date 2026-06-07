import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/errors";

/**
 * Centralized Express Error Handling Middleware.
 * Catches operational errors, system errors, database constraint violations,
 * maps them to appropriate HTTP responses, and formats colored console diagnostics.
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let details = undefined;

  // 1. Handle our custom AppError
  // Prefer explicit status fields if present (covers cross-module AppError instances)
  if (
    err &&
    (typeof (err as any).statusCode === "number" ||
      typeof (err as any).status === "number")
  ) {
    statusCode = (err as any).statusCode ?? (err as any).status;
    message = err.message || message;
    details = (err as any).details ?? details;
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  }
  // 2. Handle Supabase / Postgres Database errors
  else if (err && typeof err === "object" && "code" in err) {
    const pgCode = (err as any).code;

    // Map common Postgres error codes to standard HTTP statuses
    if (pgCode === "23505") {
      // Unique constraint violation (e.g. duplicate username/email)
      statusCode = 409;
      message = "Conflict: Resource already exists";
      details = err.message || (err as any).details;
    } else if (pgCode === "23503") {
      // Foreign key constraint violation
      statusCode = 400;
      message = "Bad Request: Reference error";
      details = err.message || (err as any).details;
    } else if (pgCode === "22P02" || pgCode === "P0001") {
      // Invalid text representation / custom raise exception
      statusCode = 400;
      message = "Bad Request: Invalid input format";
      details = err.message || (err as any).details;
    } else {
      // General database errors
      statusCode = 400;
      message = err.message || "Database error occurred";
    }
  }
  // 3. Handle standard JavaScript Errors
  else if (err instanceof Error) {
    message = err.message;
  }

  // Respect existing statusCode if set on the response before entering error middleware
  if (res.statusCode && res.statusCode !== 200 && statusCode === 500) {
    statusCode = res.statusCode;
  }

  // Output highlighted, colored diagnostics to the console
  const timestamp = new Date().toISOString();
  const resetColor = "\x1b[0m";
  const redColor = "\x1b[31m";
  const yellowColor = "\x1b[33m";
  const blueColor = "\x1b[34m";

  console.error(
    `[${timestamp}] ${redColor}[Error]${resetColor} ${req.method} ${req.originalUrl} - Status: ${redColor}${statusCode}${resetColor} - Message: ${err.message || message}`,
  );

  if (details) {
    console.error(
      `  ${yellowColor}Details:${resetColor}`,
      JSON.stringify(details, null, 2),
    );
  }

  if (err.stack && process.env.NODE_ENV !== "production") {
    console.error(`  ${blueColor}Stack Trace:${resetColor}\n`, err.stack);
  }

  res.status(statusCode).json({
    error: message,
    stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
    details: details || undefined,
  });
};
