/**
 * Custom operational error class for the Express application.
 * Allows throwing errors with custom HTTP status codes and extra details.
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    // Restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
